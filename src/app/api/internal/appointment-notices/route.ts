import { createHash, timingSafeEqual } from 'node:crypto';
import { appointmentCronSecret, createAppointmentGmailSender } from '@/lib/appointments/gmail';
import { sendDueAppointmentNotices } from '@/lib/appointments/notifications';

function authorized(request: Request) {
  const secret = appointmentCronSecret();
  const header = request.headers.get('authorization');
  if (!secret || !header) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(header), hash(`Bearer ${secret}`));
}

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401, headers });

  const send = createAppointmentGmailSender();
  if (!send) return Response.json({ ok: false, reason: 'mail_not_configured' }, { status: 503, headers });

  try {
    const summary = await sendDueAppointmentNotices(send);
    if (summary.errors > 0) console.error('Appointment notice dispatch did not finish for all recipients.');
    return Response.json({ ok: summary.errors === 0, ...summary }, { status: summary.errors > 0 ? 500 : 200, headers });
  } catch {
    // 只記錄固定訊息，避免資料庫或供應商錯誤含識別資料或憑證。
    console.error('Appointment notice dispatch failed.');
    return Response.json({ ok: false }, { status: 500, headers });
  }
}
