import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appointmentSettings, type AppointmentSetting, users } from '@/db/schema';
import { isNotificationAddress, MAX_APPOINTMENT_RECIPIENTS } from './recipient-validation';
import { DEFAULT_BOOKING_DATES, isDate } from './dates';

const SETTINGS_ID = 1;
export { MAX_APPOINTMENT_RECIPIENTS } from './recipient-validation';

export async function isAppointmentOpen() {
  const [setting] = await db.select({ isOpen: appointmentSettings.isOpen }).from(appointmentSettings)
    .where(eq(appointmentSettings.id, SETTINGS_ID));
  return setting?.isOpen ?? false;
}

export async function getAppointmentSetting(): Promise<AppointmentSetting> {
  const [setting] = await db.select().from(appointmentSettings).where(eq(appointmentSettings.id, SETTINGS_ID));
  return setting ?? { id: SETTINGS_ID, isOpen: false, recipients: [], ...DEFAULT_BOOKING_DATES, updatedBy: null, updatedAt: new Date(0) };
}

function readRecipients(raw: string): string[] | null {
  if (raw.length > 8000) return null;
  const recipients = [...new Set(raw.split(/[\s,;，；、]+/u).filter(Boolean).map((value) => value.toLowerCase()))];
  if (recipients.length > MAX_APPOINTMENT_RECIPIENTS || !recipients.every(isNotificationAddress)) return null;
  return recipients;
}

/** 寫入時鎖住院所人員的角色與狀態，避免權限在儲存途中被撤銷。 */
export async function updateAppointmentSetting(actorId: string, input: {
  isOpen: boolean;
  recipients: string;
  dates?: { minDays: string; maxDays: string; closedDates: string };
}) {
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, actorId)).for('share');
    if (!actor || actor.status !== 'active' || actor.role === 'staff') return { ok: false, reason: 'forbidden' } as const;
    const recipients = readRecipients(input.recipients);
    if (!recipients) return { ok: false, reason: 'invalid_recipients' } as const;

    let dates = {};
    if (input.dates) {
      const { minDays, maxDays, closedDates: raw } = input.dates;
      const bookingMinDays = Number(minDays);
      const bookingMaxDays = Number(maxDays);
      const closedDates = [...new Set(raw.split(/[\s,，、]+/).filter(Boolean))].sort();
      if (!/^\d{1,3}$/.test(minDays) || !/^\d{1,3}$/.test(maxDays) || bookingMinDays < 1
        || bookingMaxDays < bookingMinDays || bookingMaxDays > 365 || raw.length > 5000
        || closedDates.length > 365 || !closedDates.every(isDate)) {
        return { ok: false, reason: 'invalid_dates' } as const;
      }
      dates = { bookingMinDays, bookingMaxDays, closedDates };
    }
    const values = { isOpen: input.isOpen, recipients, ...dates, updatedBy: actorId, updatedAt: new Date() };
    await tx.insert(appointmentSettings).values({ id: SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: appointmentSettings.id, set: values });
    return { ok: true } as const;
  });
}
