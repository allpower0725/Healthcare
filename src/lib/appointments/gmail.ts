import 'server-only';
import { appUrl } from '@/lib/env';
import { APPOINTMENT_CATEGORY } from './catalog';

type MailResult =
  | { status: 'sent'; messageId: string }
  | { status: 'failed' | 'uncertain'; errorCode: string };

export type AppointmentNoticeSender = (recipient: string, count: number, batchId: string) => Promise<MailResult>;

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sender: string;
  listUrl: string;
};

const TIMEOUT_MS = 8_000;

export function isNotificationAddress(value: string) {
  if (value.length > 254 || /\s/.test(value)) return false;
  const [local, domain, extra] = value.split('@');
  if (!local || !domain || extra !== undefined) return false;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}$/i.test(local) || /(^\.|\.$|\.\.)/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length > 1 && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

export function appointmentCronSecret() {
  const secret = process.env.APPOINTMENT_CRON_SECRET?.trim();
  return secret && /^[a-zA-Z0-9_-]{32,}$/.test(secret) ? secret : null;
}

function gmailConfig(): GmailConfig | null {
  // 正式排程只能在 Vercel Production 寄送。本機仍可使用模擬服務驗證。
  if (process.env.VERCEL_ENV !== 'production') return null;
  const clientId = process.env.APPOINTMENT_GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.APPOINTMENT_GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.APPOINTMENT_GMAIL_REFRESH_TOKEN?.trim();
  const sender = process.env.APPOINTMENT_GMAIL_SENDER?.trim();
  if (!clientId || !clientSecret || !refreshToken || !sender || !isNotificationAddress(sender)) return null;

  try {
    const base = new URL(appUrl());
    if (base.protocol !== 'https:' || base.username || base.password) return null;
    const listUrl = new URL('/admin/submissions', base);
    listUrl.searchParams.set('form', APPOINTMENT_CATEGORY);
    listUrl.searchParams.set('status', 'submitted');
    return { clientId, clientSecret, refreshToken, sender, listUrl: listUrl.href };
  } catch {
    return null;
  }
}

export function appointmentMailConfigured() {
  return Boolean(appointmentCronSecret() && gmailConfig());
}

async function accessToken(config: GmailConfig): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return typeof result.access_token === 'string' && result.access_token ? result.access_token : null;
  } catch {
    return null;
  }
}

function encodeDigest(config: GmailConfig, recipient: string, count: number, batchId: string) {
  const subject = Buffer.from('預約健檢待辦通知').toString('base64');
  const content = `目前有 ${count} 筆新待確認的預約健檢案件。\r\n\r\n請登入「協同完成」查看。\r\n${config.listUrl}\r\n`;
  const body = Buffer.from(content).toString('base64').match(/.{1,76}/g)!.join('\r\n');
  const senderDomain = config.sender.split('@')[1];
  const message = [
    `From: ${config.sender}`,
    `To: ${recipient}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <appointment-digest.${batchId}@${senderDomain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    '',
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
}

/** 同一輪排程共用 access token；有待辦時才向 Google 取得。 */
export function createAppointmentGmailSender(): AppointmentNoticeSender | null {
  const config = gmailConfig();
  if (!config) return null;
  let tokenRequest: Promise<string | null> | undefined;

  return async (recipient, count, batchId) => {
    if (!isNotificationAddress(recipient)) return { status: 'failed', errorCode: 'invalid_recipient' };
    const token = await (tokenRequest ??= accessToken(config));
    if (!token) return { status: 'failed', errorCode: 'oauth_unavailable' };

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encodeDigest(config, recipient, count, batchId) }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        const status = response.status >= 400 && response.status < 500 && response.status !== 408 ? 'failed' : 'uncertain';
        return { status, errorCode: `gmail_${response.status}` };
      }
      const result = await response.json();
      if (typeof result.id !== 'string' || !/^[\w-]{1,128}$/.test(result.id)) {
        return { status: 'uncertain', errorCode: 'gmail_response' };
      }
      return { status: 'sent', messageId: result.id };
    } catch {
      // Gmail 可能已經收下請求，交由人工查核，以免寄出兩封摘要。
      return { status: 'uncertain', errorCode: 'gmail_unknown' };
    }
  };
}
