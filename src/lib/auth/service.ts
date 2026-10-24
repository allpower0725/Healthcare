import { createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, type UserStatus, users } from '@/db/schema';
import { adminCredentials } from '@/lib/env';
import { verifyPassword } from './password';

/** 從 Google ID token 取出的身分 */
export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
};

function sameText(a: string, b: string) {
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export type PasswordLoginResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'already_bound' | 'not_configured' };

/**
 * 最高管理者以 .env 帳密登入，只在尚未綁定 Google 時有效。
 * 第一次登入時建立最高管理者帳號。
 */
export async function loginSuperadminWithPassword(username: string, password: string): Promise<PasswordLoginResult> {
  const credentials = adminCredentials();
  if (!credentials) return { ok: false, reason: 'not_configured' };

  const passwordOk = await verifyPassword(password, credentials.passwordHash);
  if (!sameText(username.trim(), credentials.username) || !passwordOk) return { ok: false, reason: 'invalid' };

  const findSuperadmin = async () => {
    const [row] = await db
      .select({ id: users.id, googleSub: users.googleSub })
      .from(users)
      .where(eq(users.role, 'superadmin'));
    return row;
  };

  let superadmin = await findSuperadmin();
  if (!superadmin) {
    // 同時送出兩次時，唯一索引只會讓其中一筆寫入，另一筆改讀已存在的那筆
    await db.insert(users).values({ role: 'superadmin', status: 'active', name: '最高管理者' }).onConflictDoNothing();
    superadmin = await findSuperadmin();
  }

  if (superadmin.googleSub) return { ok: false, reason: 'already_bound' };
  return { ok: true, userId: superadmin.id };
}

export type GoogleSignInResult =
  | { kind: 'signed_in'; userId: string }
  | { kind: 'status'; status: Exclude<UserStatus, 'active'>; applied: boolean };

/**
 * Google 登入：已啟用的帳號登入成功；沒見過的 Google 帳號建立待審核申請；
 * 其他狀態只回報狀態，不登入。
 */
export async function signInWithGoogle(identity: GoogleIdentity): Promise<GoogleSignInResult> {
  const email = identity.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.googleSub, identity.sub));

  if (!existing) {
    await db.insert(users).values({
      googleSub: identity.sub,
      email,
      name: identity.name,
      avatarUrl: identity.picture ?? null,
    });
    return { kind: 'status', status: 'pending', applied: true };
  }

  if (existing.status !== 'active') return { kind: 'status', status: existing.status, applied: false };

  await db
    .update(users)
    .set({ email, name: identity.name, avatarUrl: identity.picture ?? null, lastLoginAt: new Date() })
    .where(eq(users.id, existing.id));
  return { kind: 'signed_in', userId: existing.id };
}

export type BindResult = { ok: true } | { ok: false; reason: 'in_use' | 'not_allowed' };

/**
 * 最高管理者綁定 Google 帳號。
 * 該 Google 帳號若只是待審核或被拒絕的申請，刪除該申請後綁定；若已是啟用或停用中的人員則拒絕。
 */
export async function bindSuperadminGoogle(superadminId: string, identity: GoogleIdentity): Promise<BindResult> {
  const email = identity.email.toLowerCase();

  return db.transaction(async (tx) => {
    const [superadmin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, superadminId), eq(users.role, 'superadmin'), isNull(users.googleSub)));
    if (!superadmin) return { ok: false, reason: 'not_allowed' } as const;

    const others = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(and(ne(users.id, superadminId), or(eq(users.googleSub, identity.sub), eq(users.email, email))));
    if (others.some((u) => u.status === 'active' || u.status === 'disabled')) {
      return { ok: false, reason: 'in_use' } as const;
    }
    if (others.length > 0) {
      await tx.delete(users).where(
        inArray(
          users.id,
          others.map((u) => u.id),
        ),
      );
    }

    await tx
      .update(users)
      .set({
        googleSub: identity.sub,
        email,
        name: identity.name,
        avatarUrl: identity.picture ?? null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, superadminId));
    return { ok: true } as const;
  });
}

/** 解除最高管理者的 Google 綁定並登出所有 session（npm run admin:unbind） */
export async function unbindSuperadmin() {
  return db.transaction(async (tx) => {
    const [superadmin] = await tx
      .update(users)
      .set({ googleSub: null, email: null })
      .where(eq(users.role, 'superadmin'))
      .returning({ id: users.id });
    if (!superadmin) return false;

    await tx.delete(sessions).where(eq(sessions.userId, superadmin.id));
    return true;
  });
}
