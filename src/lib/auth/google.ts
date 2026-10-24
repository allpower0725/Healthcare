import 'server-only';
import { decodeIdToken, Google } from 'arctic';
import { appUrl, googleCredentials } from '@/lib/env';
import type { GoogleIdentity } from './service';

export const OAUTH_STATE_COOKIE = 'google_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'google_code_verifier';
export const OAUTH_COOKIE_MAX_AGE = 10 * 60;

/** 未設定 GOOGLE_CLIENT_ID／GOOGLE_CLIENT_SECRET 時回傳 null */
export function createGoogleClient() {
  const credentials = googleCredentials();
  if (!credentials) return null;
  return new Google(credentials.clientId, credentials.clientSecret, `${appUrl()}/api/auth/google/callback`);
}

type GoogleClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

/**
 * 從 ID token 取出身分。token 是伺服器直接向 Google 以授權碼換得（TLS），
 * 依 OpenID Connect 規範可不另驗簽章。Email 未經 Google 驗證時視為失敗。
 */
export function identityFromIdToken(idToken: string): GoogleIdentity | null {
  const claims = decodeIdToken(idToken) as GoogleClaims;
  if (!claims.sub || !claims.email || claims.email_verified !== true) return null;
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name?.trim() || claims.email.split('@')[0],
    picture: claims.picture ?? null,
  };
}
