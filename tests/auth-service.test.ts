import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import {
  bindSuperadminGoogle,
  loginSuperadminWithPassword,
  signInWithGoogle,
  unbindSuperadmin,
} from '@/lib/auth/service';
import { createSession } from '@/lib/auth/session';
import { createUser, googleIdentity, resetDb } from './helpers';

const PASSWORD = 'correct horse battery staple';

beforeAll(async () => {
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD_HASH = await hashPassword(PASSWORD);
});

beforeEach(resetDb);

async function superadmin() {
  const [row] = await db.select().from(users).where(eq(users.role, 'superadmin'));
  return row;
}

describe('最高管理者帳密登入', () => {
  it('帳號或密碼錯誤時拒絕', async () => {
    expect(await loginSuperadminWithPassword('admin', 'wrong')).toEqual({ ok: false, reason: 'invalid' });
    expect(await loginSuperadminWithPassword('root', PASSWORD)).toEqual({ ok: false, reason: 'invalid' });
    expect(await superadmin()).toBeUndefined();
  });

  it('未設定密碼雜湊時拒絕', async () => {
    const saved = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = '';
    try {
      expect(await loginSuperadminWithPassword('admin', PASSWORD)).toEqual({ ok: false, reason: 'not_configured' });
    } finally {
      process.env.ADMIN_PASSWORD_HASH = saved;
    }
  });

  it('首次登入建立最高管理者，未綁定前可重複登入', async () => {
    const first = await loginSuperadminWithPassword('admin', PASSWORD);
    expect(first.ok).toBe(true);
    const admin = await superadmin();
    expect(admin).toMatchObject({ status: 'active', googleSub: null });

    const second = await loginSuperadminWithPassword('admin', PASSWORD);
    expect(second).toEqual({ ok: true, userId: admin.id });
  });

  it('綁定 Google 後帳密登入停用', async () => {
    const login = await loginSuperadminWithPassword('admin', PASSWORD);
    if (!login.ok) throw new Error('login failed');
    await bindSuperadminGoogle(login.userId, googleIdentity('boss'));
    expect(await loginSuperadminWithPassword('admin', PASSWORD)).toEqual({ ok: false, reason: 'already_bound' });
  });
});

describe('Google 登入', () => {
  it('新的 Google 帳號建立待審核申請，Email 存小寫', async () => {
    const result = await signInWithGoogle(googleIdentity(1));
    expect(result).toEqual({ kind: 'status', status: 'pending', applied: true });

    const [row] = await db.select().from(users);
    expect(row).toMatchObject({ role: 'staff', status: 'pending', email: 'person1@example.com', googleSub: 'google-1' });

    expect(await signInWithGoogle(googleIdentity(1))).toEqual({ kind: 'status', status: 'pending', applied: false });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('已核准的帳號登入成功並更新資料', async () => {
    await signInWithGoogle(googleIdentity(2));
    await db.update(users).set({ status: 'active' });

    const result = await signInWithGoogle({ ...googleIdentity(2), name: '新名字' });
    const [row] = await db.select().from(users);
    expect(result).toEqual({ kind: 'signed_in', userId: row.id });
    expect(row.name).toBe('新名字');
    expect(row.lastLoginAt).not.toBeNull();
  });

  it('被拒絕或停用的帳號只回傳狀態', async () => {
    await signInWithGoogle(googleIdentity(3));
    await db.update(users).set({ status: 'rejected' });
    expect(await signInWithGoogle(googleIdentity(3))).toEqual({ kind: 'status', status: 'rejected', applied: false });

    await db.update(users).set({ status: 'disabled' });
    expect(await signInWithGoogle(googleIdentity(3))).toEqual({ kind: 'status', status: 'disabled', applied: false });
  });
});

describe('最高管理者綁定 Google', () => {
  async function loginAsSuperadmin() {
    const login = await loginSuperadminWithPassword('admin', PASSWORD);
    if (!login.ok) throw new Error('login failed');
    return login.userId;
  }

  it('綁定後可用該 Google 帳號登入', async () => {
    const id = await loginAsSuperadmin();
    expect(await bindSuperadminGoogle(id, googleIdentity('boss'))).toEqual({ ok: true });
    expect(await superadmin()).toMatchObject({ googleSub: 'google-boss', email: 'personboss@example.com' });
    expect(await signInWithGoogle(googleIdentity('boss'))).toEqual({ kind: 'signed_in', userId: id });
  });

  it('該 Google 帳號只是待審核申請時，刪除申請後綁定', async () => {
    await signInWithGoogle(googleIdentity('boss'));
    const id = await loginAsSuperadmin();
    expect(await bindSuperadminGoogle(id, googleIdentity('boss'))).toEqual({ ok: true });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('該 Google 帳號已是啟用中的人員時拒絕綁定', async () => {
    await signInWithGoogle(googleIdentity('staff'));
    await db.update(users).set({ status: 'active' });
    const id = await loginAsSuperadmin();
    expect(await bindSuperadminGoogle(id, googleIdentity('staff'))).toEqual({ ok: false, reason: 'in_use' });
    expect(await superadmin()).toMatchObject({ googleSub: null });
  });

  it('解除綁定後帳密登入恢復，且所有 session 失效', async () => {
    const id = await loginAsSuperadmin();
    await bindSuperadminGoogle(id, googleIdentity('boss'));
    await createSession(id, 'full');

    expect(await unbindSuperadmin()).toBe(true);
    expect(await superadmin()).toMatchObject({ googleSub: null, email: null });
    expect(await db.select().from(sessions)).toHaveLength(0);
    expect((await loginSuperadminWithPassword('admin', PASSWORD)).ok).toBe(true);
  });

  it('沒有最高管理者時解除綁定回傳 false', async () => {
    await createUser();
    expect(await unbindSuperadmin()).toBe(false);
  });
});
