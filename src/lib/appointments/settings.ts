import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appointmentSettings, type AppointmentSetting, users } from '@/db/schema';
import { isNotificationAddress } from './gmail';

const SETTINGS_ID = 1;
export const MAX_APPOINTMENT_RECIPIENTS = 20;

export async function getAppointmentSetting(): Promise<AppointmentSetting> {
  const [setting] = await db.select().from(appointmentSettings).where(eq(appointmentSettings.id, SETTINGS_ID));
  return setting ?? { id: SETTINGS_ID, isOpen: false, recipients: [], updatedBy: null, updatedAt: new Date(0) };
}

function readRecipients(raw: string): string[] | null {
  if (raw.length > 8000) return null;
  const recipients = [...new Set(raw.split(/[\s,;，；、]+/u).filter(Boolean).map((value) => value.toLowerCase()))];
  if (recipients.length > MAX_APPOINTMENT_RECIPIENTS || !recipients.every(isNotificationAddress)) return null;
  return recipients;
}

/** 寫入時鎖住院所人員的角色與狀態，避免權限在儲存途中被撤銷。 */
export async function updateAppointmentSetting(actorId: string, input: { isOpen: boolean; recipients: string }) {
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, actorId)).for('share');
    if (!actor || actor.status !== 'active' || actor.role === 'staff') return { ok: false, reason: 'forbidden' } as const;
    const recipients = readRecipients(input.recipients);
    if (!recipients) return { ok: false, reason: 'invalid_recipients' } as const;

    const values = { isOpen: input.isOpen, recipients, updatedBy: actorId, updatedAt: new Date() };
    await tx.insert(appointmentSettings).values({ id: SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: appointmentSettings.id, set: values });
    return { ok: true } as const;
  });
}
