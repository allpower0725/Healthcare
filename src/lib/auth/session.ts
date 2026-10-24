import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from '@/db';
import { type SessionPurpose, sessions, users } from '@/db/schema';

/** 正式 session 有效 8 小時（約一個班） */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
/** 最高管理者帳密登入後、綁定 Google 前的暫時 session */
export const BIND_SESSION_TTL_MS = 10 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  purpose: SessionPurpose,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (purpose === 'full' ? SESSION_TTL_MS : BIND_SESSION_TTL_MS));

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    purpose,
    expiresAt,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  });
  // 順手清掉所有已過期的 session
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  return { token, expiresAt };
}

/**
 * 驗證 cookie 中的 token。
 * 正式 session 要求使用者為啟用狀態；綁定用 session 只對尚未綁定 Google 的最高管理者有效。
 * 無效的 session 會直接刪除。
 */
export async function validateSession(token: string) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      session: { purpose: sessions.purpose, expiresAt: sessions.expiresAt },
      user: {
        id: users.id,
        role: users.role,
        status: users.status,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        googleSub: users.googleSub,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash));
  if (!row) return null;

  const { session, user } = row;
  const valid =
    session.expiresAt.getTime() > Date.now() &&
    user.status === 'active' &&
    (session.purpose === 'full' || (user.role === 'superadmin' && user.googleSub === null));

  if (!valid) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }
  return row;
}

export type ValidSession = NonNullable<Awaited<ReturnType<typeof validateSession>>>;

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
