import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, gte, inArray, lt, max, sql } from 'drizzle-orm';
import { db } from '@/db';
import { appointmentNotices, appointments, appointmentSettings } from '@/db/schema';
import { isNotificationAddress, type AppointmentNoticeSender } from './gmail';
import { appointmentReadyForConfirmation } from './service';

const HOUR_MS = 60 * 60 * 1_000;
const STALE_AFTER_MS = 10 * 60 * 1_000;

/** 交易內預留本時段的摘要，寄信時不持有資料庫鎖。 */
async function claimDigest(recipient: string, now: Date) {
  const batchId = randomUUID();
  const hourStart = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`appointment-notice:${recipient}`}, 0))`);

    const [alreadyAttempted] = await tx
      .select({ id: appointmentNotices.appointmentId })
      .from(appointmentNotices)
      .where(and(eq(appointmentNotices.recipient, recipient), gte(appointmentNotices.attemptedAt, hourStart)))
      .limit(1);
    if (alreadyAttempted) return null;

    const [claimed] = await tx.execute<{ total: number }>(sql`
      with claimed as (
        insert into ${appointmentNotices} (appointment_id, recipient, status, batch_id, attempted_at)
        select ${appointments.id}, ${recipient}, 'sending', ${batchId}, ${now.toISOString()}::timestamptz
        from ${appointments}
        where ${appointmentReadyForConfirmation(now)}
          and not exists (
            select 1 from ${appointmentNotices}
            where ${appointmentNotices.appointmentId} = ${appointments.id}
              and ${appointmentNotices.recipient} = ${recipient}
              and ${appointmentNotices.status} <> 'failed'
          )
        on conflict (appointment_id, recipient) do update
          set status = excluded.status, batch_id = excluded.batch_id, attempted_at = excluded.attempted_at,
              sent_at = null, message_id = null, last_error_code = null
          where ${appointmentNotices.status} = 'failed'
        returning 1
      )
      select count(*)::int as total from claimed
    `);

    return claimed.total > 0 ? { batchId, count: claimed.total } : null;
  });
}

async function deliverDigest(recipient: string, send: AppointmentNoticeSender, now: Date) {
  const digest = await claimDigest(recipient, now);
  if (!digest) return 'skipped';

  const outcome = await send(recipient, digest.count, digest.batchId).catch(() => ({
    status: 'uncertain' as const,
    errorCode: 'sender_unknown',
  }));
  await db.update(appointmentNotices).set(
    outcome.status === 'sent'
      ? { status: 'sent', sentAt: new Date(), messageId: outcome.messageId, lastErrorCode: null }
      : { status: outcome.status, lastErrorCode: outcome.errorCode },
  ).where(and(eq(appointmentNotices.batchId, digest.batchId), eq(appointmentNotices.status, 'sending')));
  return outcome.status;
}

/** 同一輪每位收件人最多一封摘要；已寄送或待核對的案件不自動再寄。 */
export async function sendDueAppointmentNotices(send: AppointmentNoticeSender, now = new Date()) {
  await db.update(appointmentNotices)
    .set({ status: 'uncertain', lastErrorCode: 'interrupted' })
    .where(and(
      eq(appointmentNotices.status, 'sending'),
      lt(appointmentNotices.attemptedAt, new Date(now.getTime() - STALE_AFTER_MS)),
    ));

  // 關閉預約入口只停止新預約；仍可處理已存在的待辦。
  const [settings] = await db.select({ recipients: appointmentSettings.recipients })
    .from(appointmentSettings).where(eq(appointmentSettings.id, 1));
  const recipients = [...new Set((settings?.recipients ?? []).filter(isNotificationAddress))];
  const deliveries = await Promise.allSettled(recipients.map((recipient) => deliverDigest(recipient, send, now)));
  const summary = { sent: 0, failed: 0, uncertain: 0, skipped: 0, errors: 0 };
  for (const delivery of deliveries) {
    if (delivery.status === 'rejected') summary.errors += 1;
    else summary[delivery.value] += 1;
  }
  return summary;
}

export async function readAppointmentNoticeSummary(recipients: readonly string[], now = new Date()) {
  if (!recipients.length) return { latestAttemptAt: null, latestSentAt: null, failed: 0, uncertain: 0 };
  const ready = appointmentReadyForConfirmation(now);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MS).toISOString();

  const [summary] = await db.select({
    latestAttemptAt: max(appointmentNotices.attemptedAt),
    latestSentAt: max(appointmentNotices.sentAt),
    failed: sql<number>`(count(*) filter (where ${ready} and ${appointmentNotices.status} = 'failed'))::int`,
    uncertain: sql<number>`(count(*) filter (where ${ready} and (
      ${appointmentNotices.status} = 'uncertain' or
      (${appointmentNotices.status} = 'sending' and ${appointmentNotices.attemptedAt} < ${staleBefore}::timestamptz)
    )))::int`,
  }).from(appointmentNotices)
    .innerJoin(appointments, eq(appointments.id, appointmentNotices.appointmentId))
    .where(inArray(appointmentNotices.recipient, recipients));
  return summary;
}
