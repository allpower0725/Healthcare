import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { readSessionToken, requestMeta, setSessionCookie, clearSessionCookie } from '@/lib/auth/cookies';
import { createGoogleClient, identityFromIdToken, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE } from '@/lib/auth/google';
import { bindSuperadminGoogle, type GoogleIdentity, signInWithGoogle } from '@/lib/auth/service';
import { createSession, deleteSession, validateSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_VERIFIER_COOKIE);

  // 帳密驗證通過的最高管理者帶著綁定用 session 回來時，走綁定流程
  const token = await readSessionToken();
  const current = token ? await validateSession(token) : null;
  const binding = current?.session.purpose === 'bind_google' ? current : null;
  const failed = binding ? '/bind-google?error=google_failed' : '/login?notice=google_failed';

  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  if (params.get('error') === 'access_denied') {
    return redirectTo(binding ? '/bind-google?error=cancelled' : '/login?notice=cancelled');
  }
  if (!code || !savedState || !codeVerifier || params.get('state') !== savedState) return redirectTo(failed);

  const google = createGoogleClient();
  if (!google) return redirectTo('/login?notice=google_not_configured');

  let identity: GoogleIdentity | null;
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    identity = identityFromIdToken(tokens.idToken());
  } catch (error) {
    console.error('Google 授權碼交換失敗', error);
    identity = null;
  }
  if (!identity) return redirectTo(failed);

  const meta = await requestMeta();

  try {
    if (binding && token) {
      const result = await bindSuperadminGoogle(binding.user.id, identity);
      if (!result.ok) return redirectTo(`/bind-google?error=${result.reason}`);

      await deleteSession(token);
      const session = await createSession(binding.user.id, 'full', meta);
      await setSessionCookie(session.token, session.expiresAt);
      return redirectTo('/admin');
    }

    // 換人登入時，先結束原本的 session
    if (token) await deleteSession(token);

    const result = await signInWithGoogle(identity);
    if (result.kind === 'status') {
      await clearSessionCookie();
      return redirectTo(`/login?notice=${result.applied ? 'applied' : result.status}`);
    }

    const session = await createSession(result.userId, 'full', meta);
    await setSessionCookie(session.token, session.expiresAt);
    return redirectTo('/admin');
  } catch (error) {
    console.error('Google 登入處理失敗', error);
    return redirectTo(failed);
  }
}

function redirectTo(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
