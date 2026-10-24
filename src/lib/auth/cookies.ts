import 'server-only';
import { cookies, headers } from 'next/headers';

const SESSION_COOKIE = 'hc_session';

/** 正式環境（https）才加 Secure；本機 http://localhost 開發時不加 */
export const secureCookies = process.env.NODE_ENV === 'production';

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** 只能在 Server Action 或 Route Handler 中呼叫 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
    expires: expiresAt,
  });
}

/** 只能在 Server Action 或 Route Handler 中呼叫 */
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** 記在 session 上的來源資訊，方便日後查核 */
export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: h.get('user-agent'),
  };
}
