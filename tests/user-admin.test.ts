import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { createSession } from '@/lib/auth/session';
import { applyUserAction, availableActions } from '@/lib/users/service';
import { createUser, resetDb } from './helpers';

beforeEach(resetDb);

async function reload(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

describe('可執行的操作', () => {
  const superadmin = { id: 's', role: 'superadmin' as const };
  const admin = { id: 'a', role: 'admin' as const };
  const staff = { id: 't', role: 'staff' as const };

  it('依對象狀態列出操作', () => {
    expect(availableActions(admin, { id: 'x', role: 'staff', status: 'pending' })).toEqual(['approve', 'reject']);
    expect(availableActions(admin, { id: 'x', role: 'staff', status: 'active' })).toEqual(['disable']);
    expect(availableActions(admin, { id: 'x', role: 'staff', status: 'disabled' })).toEqual(['enable']);
    expect(availableActions(admin, { id: 'x', role: 'staff', status: 'rejected' })).toEqual(['approve']);
  });

  it('只有最高管理者能升降管理者、管理其他管理者', () => {
    expect(availableActions(superadmin, { id: 'x', role: 'staff', status: 'active' })).toEqual(['disable', 'promote']);
    expect(availableActions(superadmin, { id: 'x', role: 'admin', status: 'active' })).toEqual(['disable', 'demote']);
    expect(availableActions(admin, { id: 'x', role: 'admin', status: 'active' })).toEqual([]);
  });

  it('一般人員、自己、最高管理者都不能被操作', () => {
    expect(availableActions(staff, { id: 'x', role: 'staff', status: 'pending' })).toEqual([]);
    expect(availableActions(admin, { id: 'a', role: 'admin', status: 'active' })).toEqual([]);
    expect(availableActions(admin, { id: 's', role: 'superadmin', status: 'active' })).toEqual([]);
  });
});

describe('執行審核操作', () => {
  it('管理者核准申請，記錄審核者', async () => {
    const admin = await createUser({ role: 'admin' });
    const applicant = await createUser({ status: 'pending' });

    expect(await applyUserAction(admin.id, applicant.id, 'approve')).toEqual({ ok: true });
    expect(await reload(applicant.id)).toMatchObject({ status: 'active', reviewedBy: admin.id });
  });

  it('拒絕、停用時刪除對方全部 session；恢復後可再登入', async () => {
    const admin = await createUser({ role: 'admin' });
    const member = await createUser();
    await createSession(member.id, 'full');

    expect(await applyUserAction(admin.id, member.id, 'disable')).toEqual({ ok: true });
    expect(await db.select().from(sessions).where(eq(sessions.userId, member.id))).toHaveLength(0);

    expect(await applyUserAction(admin.id, member.id, 'enable')).toEqual({ ok: true });
    expect((await reload(member.id)).status).toBe('active');
  });

  it('最高管理者把人員升為管理者，再降回', async () => {
    const boss = await createUser({ role: 'superadmin' });
    const member = await createUser();

    expect(await applyUserAction(boss.id, member.id, 'promote')).toEqual({ ok: true });
    expect((await reload(member.id)).role).toBe('admin');
    expect(await applyUserAction(boss.id, member.id, 'demote')).toEqual({ ok: true });
    expect((await reload(member.id)).role).toBe('staff');
  });

  it('沒有權限或狀態不符時不做任何變更', async () => {
    const admin = await createUser({ role: 'admin' });
    const otherAdmin = await createUser({ role: 'admin' });
    const member = await createUser();

    expect(await applyUserAction(admin.id, member.id, 'promote')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await applyUserAction(admin.id, otherAdmin.id, 'disable')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await applyUserAction(admin.id, member.id, 'approve')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await applyUserAction(admin.id, crypto.randomUUID(), 'approve')).toEqual({ ok: false, reason: 'not_found' });
    expect((await reload(member.id)).role).toBe('staff');
  });

  it('被停用的管理者不能再審核', async () => {
    const admin = await createUser({ role: 'admin', status: 'disabled' });
    const applicant = await createUser({ status: 'pending' });
    expect(await applyUserAction(admin.id, applicant.id, 'approve')).toEqual({ ok: false, reason: 'forbidden' });
  });
});
