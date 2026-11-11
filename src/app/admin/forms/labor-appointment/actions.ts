'use server';

import { refresh } from 'next/cache';
import { MAX_APPOINTMENT_RECIPIENTS, updateAppointmentSetting } from '@/lib/appointments/settings';
import { requireUser } from '@/lib/auth/dal';

export type SaveAppointmentSettingState = { error?: string; invalidRecipients?: boolean; saved?: boolean };

export async function saveAppointmentSetting(
  _previous: SaveAppointmentSettingState,
  formData: FormData,
): Promise<SaveAppointmentSettingState> {
  const user = await requireUser();
  const recipients = formData.get('recipients');
  if (typeof recipients !== 'string') return { error: '無法讀取通知收件人。', invalidRecipients: true };

  try {
    const result = await updateAppointmentSetting(user.id, {
      isOpen: formData.get('isOpen') === 'on',
      recipients,
      dates: {
        minDays: String(formData.get('minDays') ?? ''),
        maxDays: String(formData.get('maxDays') ?? ''),
        closedDates: String(formData.get('closedDates') ?? ''),
      },
    });
    if (!result.ok) {
      if (result.reason === 'forbidden') return { error: '只有管理者可以修改預約設定。' };
      if (result.reason === 'invalid_dates') return { error: '請確認預約天數為 1 至 365 天，最晚天數須大於或等於最早天數。停診日請用西元 YYYY-MM-DD 格式。' };
      return { error: `請檢查收件人信箱格式，最多可設定 ${MAX_APPOINTMENT_RECIPIENTS} 個信箱。`, invalidRecipients: true };
    }
  } catch {
    return { error: '儲存預約設定失敗，請稍後再試。' };
  }

  refresh();
  return { saved: true };
}
