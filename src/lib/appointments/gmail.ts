import 'server-only';
import { createTransport } from 'nodemailer';
import { appUrl } from '@/lib/env';
import { APPOINTMENT_CATEGORY } from './catalog';
import { isNotificationAddress } from './recipient-validation';

export { isNotificationAddress } from './recipient-validation';

type MailResult =
  | { status: 'sent'; messageId: string }
  | { status: 'failed' | 'uncertain'; errorCode: string };

export type AppointmentNoticeSender = (recipient: string, count: number, batchId: string) => Promise<MailResult>;

type GmailConfig = {
  appPassword: string;
  sender: string;
  listUrl: string;
};

const TIMEOUT_MS = 8_000;

export function appointmentCronSecret() {
  const secret = process.env.APPOINTMENT_CRON_SECRET?.trim();
  return secret && /^[a-zA-Z0-9_-]{32,}$/.test(secret) ? secret : null;
}

function gmailConfig(): GmailConfig | null {
  // 正式排程只能在 Vercel Production 寄送。本機仍可使用模擬服務驗證。
  if (process.env.VERCEL_ENV !== 'production') return null;
  const appPassword = process.env.APPOINTMENT_GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  const sender = process.env.APPOINTMENT_GMAIL_SENDER?.trim();
  if (!appPassword || !/^[A-Za-z0-9]{16}$/.test(appPassword) || !sender || !isNotificationAddress(sender)) return null;

  try {
    const base = new URL(appUrl());
    if (base.protocol !== 'https:' || base.username || base.password) return null;
    const listUrl = new URL('/admin/submissions', base);
    listUrl.searchParams.set('form', APPOINTMENT_CATEGORY);
    listUrl.searchParams.set('status', 'submitted');
    return { appPassword, sender, listUrl: listUrl.href };
  } catch {
    return null;
  }
}

export function appointmentMailConfigured() {
  return Boolean(appointmentCronSecret() && gmailConfig());
}

export function createAppointmentGmailSender(): AppointmentNoticeSender | null {
  const config = gmailConfig();
  if (!config) return null;
  const transport = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.sender, pass: config.appPassword },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  const senderDomain = config.sender.split('@')[1];

  return async (recipient, count, batchId) => {
    if (!isNotificationAddress(recipient)) return { status: 'failed', errorCode: 'invalid_recipient' };
    const messageId = `<appointment-digest.${batchId}@${senderDomain}>`;

    try {
      const result = await transport.sendMail({
        from: config.sender,
        to: recipient,
        subject: '預約健檢待辦通知',
        text: `目前有 ${count} 筆新待確認的預約健檢案件。\n\n請登入「協同完成」查看。\n${config.listUrl}\n`,
        messageId,
      });
      if (result.accepted.length !== 1) return { status: 'uncertain', errorCode: 'gmail_smtp_response' };
      return { status: 'sent', messageId };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'responseCode' in error) {
        const code = error.responseCode;
        if (typeof code === 'number' && Number.isInteger(code) && code >= 400 && code < 600) {
          return { status: 'failed', errorCode: `gmail_smtp_${code}` };
        }
      }
      // 連線中斷時可能已交付 Gmail，保留待核對以免重寄。
      return { status: 'uncertain', errorCode: 'gmail_smtp_unknown' };
    }
  };
}
