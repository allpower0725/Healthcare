'use server';

import { refresh } from 'next/cache';
import type { FormValues } from '@/db/schema';
import { requireUser } from '@/lib/auth/dal';
import {
  completeSubmission,
  reopenSubmission,
  restoreSubmission,
  saveStaffData,
  type StaffActionResult,
  voidSubmission,
} from '@/lib/submissions/service';

// Server Action 等同公開 API：每次都重新驗證登入；權限與狀態由 service 依資料庫檢查

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: StaffActionResult = { ok: false, reason: 'not_found' };

/** 自動暫存院所區（不重新整理頁面，回傳新版本） */
export async function saveStaff(id: string, version: number, values: FormValues): Promise<StaffActionResult> {
  const user = await requireUser();
  if (!UUID.test(id)) return NOT_FOUND;
  return saveStaffData(user.id, id, version, values);
}

/** 確認送出：一併存入院所區並鎖定 */
export async function completeAction(id: string, version: number, values: FormValues): Promise<StaffActionResult> {
  const user = await requireUser();
  if (!UUID.test(id)) return NOT_FOUND;
  const result = await completeSubmission(user.id, id, version, values);
  if (result.ok) refresh();
  return result;
}

export async function reopenAction(id: string): Promise<StaffActionResult> {
  const user = await requireUser();
  if (!UUID.test(id)) return NOT_FOUND;
  const result = await reopenSubmission(user.id, id);
  if (result.ok) refresh();
  return result;
}

export async function voidAction(id: string): Promise<StaffActionResult> {
  const user = await requireUser();
  if (!UUID.test(id)) return NOT_FOUND;
  const result = await voidSubmission(user.id, id);
  if (result.ok) refresh();
  return result;
}

export async function restoreAction(id: string): Promise<StaffActionResult> {
  const user = await requireUser();
  if (!UUID.test(id)) return NOT_FOUND;
  const result = await restoreSubmission(user.id, id);
  if (result.ok) refresh();
  return result;
}
