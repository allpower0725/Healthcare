import { count, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { sessions, type UserRole, type UserStatus, users } from '@/db/schema';

export const USER_ACTIONS = ['approve', 'reject', 'disable', 'enable', 'promote', 'demote'] as const;
export type UserAction = (typeof USER_ACTIONS)[number];

type Actor = { id: string; role: UserRole };
type Target = { id: string; role: UserRole; status: UserStatus };

/**
 * 操作者對某位使用者可以執行的操作。
 * - 最高管理者與管理者可核准、拒絕、停用、恢復一般人員。
 * - 只有最高管理者可升降管理者，以及停用、恢復管理者。
 * - 不能操作自己，也不能操作最高管理者。
 */
export function availableActions(actor: Actor, target: Target): UserAction[] {
  if (actor.id === target.id || target.role === 'superadmin' || actor.role === 'staff') return [];
  if (target.role === 'admin' && actor.role !== 'superadmin') return [];

  const actions: UserAction[] = [];
  if (target.status === 'pending' || target.status === 'rejected') actions.push('approve');
  if (target.status === 'pending') actions.push('reject');
  if (target.status === 'active') actions.push('disable');
  if (target.status === 'disabled') actions.push('enable');
  if (actor.role === 'superadmin' && target.status === 'active') {
    actions.push(target.role === 'staff' ? 'promote' : 'demote');
  }
  return actions;
}

const CHANGES: Record<UserAction, (actorId: string) => Partial<typeof users.$inferInsert>> = {
  approve: (actorId) => ({ status: 'active', reviewedBy: actorId, reviewedAt: new Date() }),
  reject: (actorId) => ({ status: 'rejected', reviewedBy: actorId, reviewedAt: new Date() }),
  disable: () => ({ status: 'disabled' }),
  enable: () => ({ status: 'active' }),
  promote: () => ({ role: 'admin' }),
  demote: () => ({ role: 'staff' }),
};

export type UserActionResult = { ok: true } | { ok: false; reason: 'forbidden' | 'not_found' };

/** 執行審核操作；權限在這裡依資料庫的最新狀態重新檢查 */
export async function applyUserAction(actorId: string, targetId: string, action: UserAction): Promise<UserActionResult> {
  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, actorId));
    if (!actor || actor.status !== 'active') return { ok: false, reason: 'forbidden' } as const;

    const [target] = await tx
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
      .for('update');
    if (!target) return { ok: false, reason: 'not_found' } as const;
    if (!availableActions(actor, target).includes(action)) return { ok: false, reason: 'forbidden' } as const;

    await tx.update(users).set(CHANGES[action](actor.id)).where(eq(users.id, target.id));
    if (action === 'reject' || action === 'disable') {
      await tx.delete(sessions).where(eq(sessions.userId, target.id));
    }
    return { ok: true } as const;
  });
}

const reviewer = alias(users, 'reviewer');

/** 使用者管理頁的列表（頁面再依狀態分組），新申請在前 */
export async function listUsers() {
  return db
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      reviewedAt: users.reviewedAt,
      lastLoginAt: users.lastLoginAt,
      reviewerName: reviewer.name,
    })
    .from(users)
    .leftJoin(reviewer, eq(users.reviewedBy, reviewer.id))
    .orderBy(desc(users.createdAt));
}

export async function getUserName(id: string) {
  const [row] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
  return row?.name ?? null;
}

export async function countPendingUsers() {
  const [row] = await db.select({ n: count() }).from(users).where(eq(users.status, 'pending'));
  return row.n;
}
