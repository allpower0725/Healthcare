import 'server-only';
import type { CaptchaFailure, PublicCaptchaAction, PublicCaptchaConfig } from './public-protection';

type Settings = { siteKey: string; projectId: string; apiKey: string; hostnames: string[]; minScore: number };
export type VerificationResult = { ok: true } | { ok: false; reason: CaptchaFailure };
function developmentBypass() {
  return process.env.NODE_ENV === 'development' && !process.env.VERCEL && !process.env.VERCEL_ENV
    && process.env.RECAPTCHA_DEV_BYPASS === 'true';
}
function settings(): Settings | null {
  const siteKey = process.env.RECAPTCHA_SITE_KEY?.trim();
  const projectId = process.env.RECAPTCHA_PROJECT_ID?.trim();
  const apiKey = process.env.RECAPTCHA_API_KEY?.trim();
  const hostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES ?? '').split(',').map(h => h.trim().toLowerCase());
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE?.trim() || '0.5');
  if (!siteKey || !projectId || !apiKey || !/^[a-zA-Z0-9-]+$/.test(projectId)
    || !hostnames.length || hostnames.some(h => !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(h))
    || !Number.isFinite(minScore) || minScore < 0 || minScore > 1) return null;
  return { siteKey, projectId, apiKey, hostnames, minScore };
}
/** 僅這兩個公開屬性可傳至前台；不可傳出伺服器設定物件。 */
export function getPublicCaptchaConfig(): PublicCaptchaConfig {
  if (developmentBypass()) return { mode: 'development-bypass', siteKey: '' };
  const config = settings();
  return config ? { mode: 'required', siteKey: config.siteKey } : { mode: 'unavailable', siteKey: '' };
}
/** 每次異動皆建立新 assessment；Google 負責單次使用與重複 token 拒絕。 */
export async function verifyRecaptcha(action: PublicCaptchaAction, token: unknown, now = new Date()): Promise<VerificationResult> {
  if (developmentBypass()) return { ok: true };
  const config = settings();
  if (!config) return { ok: false, reason: 'verification_unavailable' };
  if (typeof token !== 'string' || !token.trim() || token.length > 16384) return { ok: false, reason: 'verification_failed' };
  try {
    const response = await fetch(`https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/assessments`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.apiKey },
      body: JSON.stringify({ event: { token, siteKey: config.siteKey, expectedAction: action } }),
    });
    if (!response.ok) return { ok: false, reason: 'verification_unavailable' };
    const assessment = await response.json();
    const properties = assessment?.tokenProperties;
    const score = assessment?.riskAnalysis?.score;
    const createdAt = typeof properties?.createTime === 'string' ? Date.parse(properties.createTime) : NaN;
    const age = now.getTime() - createdAt;
    if (properties?.valid !== true || properties.action !== action || typeof properties.hostname !== 'string'
      || !config.hostnames.includes(properties.hostname.toLowerCase()) || !Number.isFinite(age) || age < -30000 || age > 120000
      || typeof score !== 'number' || !Number.isFinite(score) || score < config.minScore || score > 1) {
      return { ok: false, reason: 'verification_failed' };
    }
    return { ok: true };
  } catch {
    // 不輸出錯誤全文，避免外部錯誤洩漏 token、API key 或請求資料。
    return { ok: false, reason: 'verification_unavailable' };
  }
}
