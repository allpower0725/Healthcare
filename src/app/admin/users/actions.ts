'use server';

import { requireManager } from '@/lib/auth/dal';
import { applyUserAction, USER_ACTIONS, type UserAction } from '@/lib/users/service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUserAction(value: string): value is UserAction {
  return (USER_ACTIONS as readonly string[]).includes(value);
}

export type UpdateUserState = { error?: string; success?: boolean };

export async function updateUser(_previous: UpdateUserState, formData: FormData): Promise<UpdateUserState> {
  // Server Action 等同公開 API，每次都重新驗證身分與權限
  const actor = await requireManager();
  const userId = String(formData.get('userId') ?? '');
  const action = String(formData.get('action') ?? '');
  if (!UUID.test(userId) || !isUserAction(action)) return { error: '無法讀取使用者或操作項目。' };

  try {
    const result = await applyUserAction(actor.id, userId, action);
    if (!result.ok) return { error: result.reason === 'not_found' ? '找不到這位使用者。' : '目前沒有執行此操作的權限，或使用者狀態已改變。' };
  } catch {
    return { error: '操作失敗，請檢查連線後再試一次。' };
  }
  return { success: true };
}
