import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { appointmentNotices, appointments, appointmentSettings, submissions } from '@/db/schema';
import { POST } from '@/app/api/internal/appointment-notices/route';
import { createAppointmentGmailSender, type AppointmentNoticeSender } from '@/lib/appointments/gmail';
import { readAppointmentNoticeSummary, sendDueAppointmentNotices } from '@/lib/appointments/notifications';
import { resetDb } from './helpers';

const NOW = new Date('2026-11-10T16:00:00Z'); // 台灣已是 11/11。
const NEXT_HOUR = new Date('2026-11-10T17:00:00Z');
const FIRST = 'office@example.com';
const SECOND = 'nurse@example.com';
const VALID_SECRET = 'appointment_cron_test_secret_0123456789';
const smtp = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({ createTransport: smtp.createTransport }));

async function book(fields: Partial<typeof appointments.$inferInsert> = {}) {
  const [appointment] = await db.insert(appointments).values({
    idNo: 'A123456789',
    name: '預約測試',
    birthDate: '1992-06-01',
    appointmentDate: '2026-11-11',
    packageCode: 'new_worker',
    ...fields,
  }).returning();
  return appointment;
}

async function setRecipients(recipients: string[]) {
  await db.update(appointmentSettings).set({ recipients }).where(eq(appointmentSettings.id, 1));
}

function configureGmail() {
  vi.stubEnv('APP_URL', 'https://health.example.com');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('APPOINTMENT_CRON_SECRET', VALID_SECRET);
  vi.stubEnv('APPOINTMENT_GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');
  vi.stubEnv('APPOINTMENT_GMAIL_SENDER', 'sender@example.com');
}

beforeEach(() => {
  smtp.createTransport.mockReset().mockReturnValue({ sendMail: smtp.sendMail });
  smtp.sendMail.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('預約健檢每小時 Gmail 待辦摘要', () => {
  beforeEach(resetDb);

  it('並行排程每個收件人只收到一次，摘要只列可確認的案件', async () => {
    await setRecipients([FIRST, SECOND, FIRST]);
    const [form] = await db.insert(submissions).values({
      formId: 'labor', status: 'submitted', idNo: 'A123456789', name: '預約測試',
      birthDate: '1992-06-01', publicData: {}, publicSubmittedAt: NOW,
    }).returning();
    await book();
    await book({ packageCode: 'in_service', submissionId: form.id });
    await book({ packageCode: 'in_service' });
    await book({ appointmentDate: '2026-11-10' });
    await book({ status: 'confirmed', confirmedAt: NOW });
    await book({ status: 'cancelled', cancelledAt: NOW });
    const send = vi.fn<AppointmentNoticeSender>().mockResolvedValue({ status: 'sent', messageId: 'gmail-accepted' });

    const runs = await Promise.all([sendDueAppointmentNotices(send, NOW), sendDueAppointmentNotices(send, NOW)]);
    expect(runs.reduce((total, run) => total + run.errors, 0)).toBe(0);
    expect(runs.reduce((total, run) => total + run.sent, 0)).toBe(2);
    expect(send.mock.calls.map(([recipient, count]) => [recipient, count])).toEqual(
      expect.arrayContaining([[FIRST, 2], [SECOND, 2]]),
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(await db.select().from(appointmentNotices)).toHaveLength(4);

    await book();
    expect(await sendDueAppointmentNotices(send, NOW)).toMatchObject({ sent: 0, skipped: 2 });
    expect(await sendDueAppointmentNotices(send, NEXT_HOUR)).toMatchObject({ sent: 2, errors: 0 });
    expect(send.mock.calls.slice(2).map(([, count]) => count)).toEqual([1, 1]);
  });

  it('明確被拒絕的郵件在下一小時重試', async () => {
    await setRecipients([FIRST]);
    await book();
    const send = vi.fn<AppointmentNoticeSender>()
      .mockResolvedValueOnce({ status: 'failed', errorCode: 'gmail_smtp_450' })
      .mockResolvedValueOnce({ status: 'sent', messageId: 'gmail-retry' });

    expect(await sendDueAppointmentNotices(send, NOW)).toMatchObject({ failed: 1 });
    expect(await readAppointmentNoticeSummary([FIRST], NOW)).toMatchObject({ failed: 1, latestSentAt: null });
    expect(await sendDueAppointmentNotices(send, NOW)).toMatchObject({ skipped: 1 });
    expect(await sendDueAppointmentNotices(send, NEXT_HOUR)).toMatchObject({ sent: 1 });
    expect(await readAppointmentNoticeSummary([FIRST], NEXT_HOUR)).toMatchObject({ failed: 0, latestSentAt: expect.any(Date) });
  });

  it('逾時與中斷後保留待核對狀態', async () => {
    await setRecipients([FIRST]);
    const interrupted = await book();
    await book();
    await db.insert(appointmentNotices).values({
      appointmentId: interrupted.id, recipient: FIRST, status: 'sending',
      batchId: '11111111-2222-4333-8444-555555555555', attemptedAt: new Date(NOW.getTime() - 15 * 60 * 1000),
    });
    const send = vi.fn<AppointmentNoticeSender>().mockRejectedValue(new Error('provider response lost'));

    expect(await sendDueAppointmentNotices(send, NOW)).toMatchObject({ uncertain: 1 });
    expect(send.mock.calls[0][1]).toBe(1);
    expect(await readAppointmentNoticeSummary([FIRST], NOW)).toMatchObject({ uncertain: 2, failed: 0 });
    expect(await sendDueAppointmentNotices(send, NEXT_HOUR)).toMatchObject({ skipped: 1 });
    expect(send).toHaveBeenCalledOnce();
  });

  it('排程端點驗證密鑰，並透過加密的 Gmail SMTP 寄出純待辦摘要', async () => {
    configureGmail();
    await setRecipients([FIRST]);
    await book({ appointmentDate: '2099-12-31' });
    smtp.sendMail.mockResolvedValue({ accepted: [FIRST] });

    const request = (secret: string) => new Request('https://health.example.com/api/internal/appointment-notices', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}` },
    });
    expect((await POST(request('invalid'))).status).toBe(401);
    expect(smtp.createTransport).not.toHaveBeenCalled();
    expect(await db.select().from(appointmentNotices)).toHaveLength(0);

    const response = await POST(request(VALID_SECRET));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sent: 1, errors: 0 });
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'sender@example.com', pass: 'abcdefghijklmnop' },
    }));
    const [notice] = await db.select().from(appointmentNotices);
    expect(notice.messageId).toBe(`<appointment-digest.${notice.batchId}@example.com>`);
    expect(smtp.sendMail).toHaveBeenCalledExactlyOnceWith({
      from: 'sender@example.com', to: FIRST, subject: '預約健檢待辦通知', messageId: notice.messageId,
      text: expect.stringContaining('https://health.example.com/admin/submissions?form=appointment&status=submitted'),
    });
    const [{ text }] = smtp.sendMail.mock.calls[0];
    expect(text).toContain('1 筆');
    expect(text).not.toMatch(/預約測試|A123456789|1992-06-01/);
  });
});

it('只在 Gmail 明確拒絕時標記失敗，等待回應時斷線則待核對', async () => {
  configureGmail();
  const send = createAppointmentGmailSender()!;
  const batchId = '11111111-2222-4333-8444-555555555555';
  smtp.sendMail.mockRejectedValueOnce({ responseCode: 550, response: 'Private SMTP response' });
  smtp.sendMail.mockRejectedValueOnce({ code: 'ETIMEDOUT' });

  expect(await send(FIRST, 1, batchId)).toEqual({ status: 'failed', errorCode: 'gmail_smtp_550' });
  expect(await send(FIRST, 1, batchId)).toEqual({ status: 'uncertain', errorCode: 'gmail_smtp_unknown' });
});

it.each(['preview', undefined])('Vercel 正式以外的環境停用實際 Gmail 寄送 (%s)', async (environment) => {
  configureGmail();
  vi.stubEnv('VERCEL_ENV', environment);
  const request = new Request('https://health.example.com/api/internal/appointment-notices', {
    method: 'POST', headers: { Authorization: `Bearer ${VALID_SECRET}` },
  });
  expect((await POST(request)).status).toBe(503);
});
