import { generateCodeVerifier, generateState } from 'arctic';
import { cookies } from 'next/headers';
import { secureCookies } from '@/lib/auth/cookies';
import {
  createGoogleClient,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from '@/lib/auth/google';

// 開始 Google 授權：登入與最高管理者綁定都走這裡，回來後由 callback 依 session 判斷
export async function GET() {
  const cookieStore = await cookies();
  const google = createGoogleClient();
  if (!google) return redirectTo('/login?notice=google_not_configured');

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);
  // 共用電腦上常有多個 Google 帳號，每次都讓使用者選擇
  url.searchParams.set('prompt', 'select_account');

  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: secureCookies,
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
  cookieStore.set(OAUTH_STATE_COOKIE, state, options);
  cookieStore.set(OAUTH_VERIFIER_COOKIE, codeVerifier, options);

  return redirectTo(url.toString());
}

function redirectTo(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
