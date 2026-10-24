import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { createSession, deleteSession, deleteUserSessions, validateSession } from '@/lib/auth/session';
import { createUser, resetDb } from './helpers';

beforeEach(resetDb);

describe('session', () => {
  it('資料庫只存 token 的雜湊，驗證後取得使用者', async () => {
    const user = await createUser();
    const { token } = await createSession(user.id, 'full');

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(token);

    const result = await validateSession(token);
    expect(result?.user.id).toBe(user.id);
    expect(result?.session.purpose).toBe('full');
  });

  it('不存在或過期的 session 無效，過期的會被刪除', async () => {
    const user = await createUser();
    expect(await validateSession('no-such-token')).toBeNull();

    const { token } = await createSession(user.id, 'full');
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSession(token)).toBeNull();
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it('使用者不是啟用狀態時，正式 session 無效', async () => {
    const user = await createUser();
    const { token } = await createSession(user.id, 'full');
    await db.update(users).set({ status: 'disabled' }).where(eq(users.id, user.id));
    expect(await validateSession(token)).toBeNull();
  });

  it('綁定用 session 只對尚未綁定的最高管理者有效', async () => {
    const admin = await createUser({ role: 'superadmin' });
    await db.update(users).set({ googleSub: null, email: null }).where(eq(users.id, admin.id));
    const { token } = await createSession(admin.id, 'bind_google');
    expect((await validateSession(token))?.session.purpose).toBe('bind_google');

    await db.update(users).set({ googleSub: 'bound' }).where(eq(users.id, admin.id));
    expect(await validateSession(token)).toBeNull();
  });

  it('登出刪除單一 session；停用時刪除使用者全部 session', async () => {
    const user = await createUser();
    const a = await createSession(user.id, 'full');
    const b = await createSession(user.id, 'full');

    await deleteSession(a.token);
    expect(await validateSession(a.token)).toBeNull();
    expect(await validateSession(b.token)).not.toBeNull();

    await deleteUserSessions(user.id);
    expect(await validateSession(b.token)).toBeNull();
  });
});
