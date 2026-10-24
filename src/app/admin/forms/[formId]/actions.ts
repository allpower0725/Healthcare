'use server';

import { refresh } from 'next/cache';
import { requireUser } from '@/lib/auth/dal';
import { isFormId } from '@/lib/forms/catalog';
import { updateFormSetting } from '@/lib/forms/settings';
import { fromTaipeiInput } from '@/lib/time';

export type SaveSettingState = { error?: string; savedAt?: number };

function readTime(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? '').trim();
  if (!raw) return { value: null, ok: true };
  const value = fromTaipeiInput(raw);
  return { value, ok: value !== null };
}

export async function saveFormSetting(
  formId: string,
  _prev: SaveSettingState,
  formData: FormData,
): Promise<SaveSettingState> {
  // Server Action 等同公開 API：身分在這裡驗證，權限由 updateFormSetting 依資料庫檢查
  const user = await requireUser();
  if (!isFormId(formId)) return { error: '找不到這張表單。' };

  const opensAt = readTime(formData, 'opensAt');
  const closesAt = readTime(formData, 'closesAt');
  if (!opensAt.ok || !closesAt.ok) return { error: '時間格式不正確，請重新選擇。' };

  const result = await updateFormSetting(user.id, formId, {
    isOpen: formData.get('isOpen') === 'on',
    opensAt: opensAt.value,
    closesAt: closesAt.value,
  });
  if (!result.ok) {
    return { error: result.reason === 'forbidden' ? '只有管理者可以修改開放設定。' : '結束時間必須晚於開始時間。' };
  }

  refresh();
  return { savedAt: Date.now() };
}
