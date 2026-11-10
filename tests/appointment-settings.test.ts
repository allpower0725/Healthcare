import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { appointmentSettings } from '@/db/schema';
import { getAppointmentSetting, updateAppointmentSetting } from '@/lib/appointments/settings';
import { createUser, resetDb } from './helpers';

describe('預約健檢開放與收件人設定', () => {
  beforeEach(resetDb);

  it('預設關閉，沒有通知收件人', async () => {
    const rows = await db.select().from(appointmentSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, isOpen: false, recipients: [], updatedBy: null });
  });

  it('只有啟用的管理者可異動，拒絕寫入時保留現有設定', async () => {
    const staff = await createUser();
    const disabledAdmin = await createUser({ role: 'admin', status: 'disabled' });
    const input = { isOpen: true, recipients: 'admin@example.com' };
    for (const actor of [staff, disabledAdmin]) {
      expect(await updateAppointmentSetting(actor.id, input)).toEqual({ ok: false, reason: 'forbidden' });
    }
    expect(await getAppointmentSetting()).toMatchObject({ isOpen: false, recipients: [] });
  });

  it('可儲存多位收件人並去除重複，清空後暫停通知', async () => {
    const admin = await createUser({ role: 'admin' });
    expect(await updateAppointmentSetting(admin.id, {
      isOpen: true,
      recipients: ' Team@example.com，Desk+Booking@example.com\nteam@EXAMPLE.COM ',
    })).toEqual({ ok: true });
    expect(await getAppointmentSetting()).toMatchObject({
      isOpen: true,
      recipients: ['team@example.com', 'desk+booking@example.com'],
      updatedBy: admin.id,
    });
    expect(await updateAppointmentSetting(admin.id, { isOpen: true, recipients: '  ' })).toEqual({ ok: true });
    expect(await getAppointmentSetting()).toMatchObject({ isOpen: true, recipients: [] });
  });

  it('拒絕格式錯誤的地址及郵件標頭，原本的開放設定不變', async () => {
    const admin = await createUser({ role: 'admin' });
    const recipients = 'team@example.com';
    expect(await updateAppointmentSetting(admin.id, { isOpen: true, recipients })).toEqual({ ok: true });
    for (const invalid of ['a..b@example.com', 'team@example.com\r\nBcc: other@example.com']) {
      expect(await updateAppointmentSetting(admin.id, { isOpen: false, recipients: invalid }))
        .toEqual({ ok: false, reason: 'invalid_recipients' });
    }
    expect(await getAppointmentSetting()).toMatchObject({ isOpen: true, recipients: [recipients] });
  });
});
