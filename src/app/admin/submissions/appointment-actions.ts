'use server';

import { confirmAppointment } from '@/lib/appointments/service';
import { requireUser } from '@/lib/auth/dal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConfirmAppointmentState = { error?: string; success?: boolean };

const CONFIRM_ERRORS = {
  not_found: '找不到這筆預約。',
  forbidden: '你的帳號沒有權限，或已被停用。',
  not_pending: '預約狀態已改變，請重新開啟案件確認。',
  date_passed: '預約日期已過，無法確認。',
  form_required: '民眾須先送出勞工健康檢查表，院所才能確認預約。',
};

export async function confirmAppointmentAction(
  id: string,
  _state: ConfirmAppointmentState,
  _data: FormData,
): Promise<ConfirmAppointmentState> {
  const user = await requireUser();
  if (typeof id !== 'string' || !UUID.test(id)) return { error: CONFIRM_ERRORS.not_found };

  try {
    const result = await confirmAppointment(id, user.id);
    if (!result.ok) return { error: CONFIRM_ERRORS[result.reason] };
  } catch {
    return { error: '確認預約失敗，請檢查連線後再試一次。' };
  }

  return { success: true };
}
