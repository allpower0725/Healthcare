'use server';

import { refresh } from 'next/cache';
import { requireManager } from '@/lib/auth/dal';
import { applyUserAction, USER_ACTIONS, type UserAction } from '@/lib/users/service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUserAction(value: string): value is UserAction {
  return (USER_ACTIONS as readonly string[]).includes(value);
}

export async function updateUser(formData: FormData) {
  // Server Action 等同公開 API，每次都重新驗證身分與權限
  const actor = await requireManager();
  const userId = String(formData.get('userId') ?? '');
  const action = String(formData.get('action') ?? '');
  if (!UUID.test(userId) || !isUserAction(action)) return;

  await applyUserAction(actor.id, userId, action);
  refresh();
}
