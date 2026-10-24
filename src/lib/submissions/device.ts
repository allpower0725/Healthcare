import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { secureCookies } from '@/lib/auth/cookies';
import { DEVICE_TTL_MS } from './service';

// 民眾裝置憑證：送出後 12 小時內，持有憑證的裝置才能查看、退回修改自己送出的表單
const DEVICE_COOKIE = 'pp_device';

export async function readDeviceToken() {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

/** 沿用既有憑證（同一裝置先前送出的表單仍可存取），沒有才新建；每次送出延長 12 小時。只能在 Server Action 中呼叫 */
export async function ensureDeviceToken() {
  const store = await cookies();
  const token = store.get(DEVICE_COOKIE)?.value ?? randomBytes(32).toString('base64url');
  store.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
    maxAge: DEVICE_TTL_MS / 1000,
  });
  return token;
}

/** 換人填寫時清除。只能在 Server Action 中呼叫 */
export async function clearDeviceToken() {
  (await cookies()).delete(DEVICE_COOKIE);
}
