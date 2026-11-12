import 'server-only';
import { PUBLIC_CAPTCHA_ACTIONS, type CaptchaFailure, type PublicCaptchaAction, type PublicCaptchaConfig } from './public-protection';

type Settings = { siteKey: string; projectId: string; apiKey: string; hostnames: string[]; minScore: number };
export type VerificationResult = { ok: true } | { ok: false; reason: CaptchaFailure };
type DiagnosticCode = 'configuration_missing' | 'token_missing_or_invalid' | 'token_invalid' | 'action_mismatch'
  | 'hostname_mismatch' | 'token_time_invalid' | 'token_expired' | 'score_invalid' | 'score_below_threshold'
  | 'http_error' | 'request_timeout' | 'response_invalid' | 'assessment_error';
type DiagnosticDetails = {
  score?: number; minScore?: number; tokenValid?: boolean; invalidReason?: string;
  tokenAgeMs?: number; actionMatches?: boolean; hostnameAllowed?: boolean; httpStatus?: number; riskReasons?: string[];
};
const INVALID_REASONS = new Set(['INVALID_REASON_UNSPECIFIED', 'UNKNOWN_INVALID_REASON', 'MALFORMED', 'EXPIRED', 'DUPE', 'MISSING', 'BROWSER_ERROR']);
const RISK_REASONS = new Set(['CLASSIFICATION_REASON_UNSPECIFIED', 'AUTOMATION', 'UNEXPECTED_ENVIRONMENT', 'TOO_MUCH_TRAFFIC',
  'UNEXPECTED_USAGE_PATTERNS', 'LOW_CONFIDENCE_SCORE', 'SUSPECTED_CARDING', 'SUSPECTED_CHARGEBACK']);

/** 只記錄固定代碼、布林值及有限數值；不記錄 token、金鑰、原始回應、網域字串或個資。 */
function rejected(action: PublicCaptchaAction, reason: CaptchaFailure, code: DiagnosticCode, details: DiagnosticDetails = {}): VerificationResult {
  console.warn('[reCAPTCHA]', {
    event: 'verification_rejected',
    action: Object.values(PUBLIC_CAPTCHA_ACTIONS).includes(action) ? action : 'unknown_action',
    code, ...details,
  });
  return { ok: false, reason };
}
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
  if (!config) return rejected(action, 'verification_unavailable', 'configuration_missing');
  if (typeof token !== 'string' || !token.trim() || token.length > 16384) return rejected(action, 'verification_failed', 'token_missing_or_invalid');
  try {
    const response = await fetch(`https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/assessments`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.apiKey },
      body: JSON.stringify({ event: { token, siteKey: config.siteKey, expectedAction: action } }),
    });
    if (!response.ok) return rejected(action, 'verification_unavailable', 'http_error', { httpStatus: response.status });
    const assessment = await response.json();
    const properties = assessment?.tokenProperties;
    const score = assessment?.riskAnalysis?.score;
    const createdAt = typeof properties?.createTime === 'string' ? Date.parse(properties.createTime) : NaN;
    const age = now.getTime() - createdAt;
    if (properties?.valid !== true || properties.action !== action || typeof properties.hostname !== 'string'
      || !config.hostnames.includes(properties.hostname.toLowerCase()) || !Number.isFinite(age) || age < -30000 || age > 120000
      || typeof score !== 'number' || !Number.isFinite(score) || score < config.minScore || score > 1) {
      const actionMatches = properties?.action === action;
      const hostnameAllowed = typeof properties?.hostname === 'string' && config.hostnames.includes(properties.hostname.toLowerCase());
      const validScore = typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1;
      const code: DiagnosticCode = properties?.valid !== true ? 'token_invalid'
        : !actionMatches ? 'action_mismatch' : !hostnameAllowed ? 'hostname_mismatch'
        : !Number.isFinite(age) || age < -30000 ? 'token_time_invalid' : age > 120000 ? 'token_expired'
        : !validScore ? 'score_invalid' : 'score_below_threshold';
      const rawReasons: unknown = assessment?.riskAnalysis?.reasons;
      return rejected(action, 'verification_failed', code, {
        tokenValid: properties?.valid === true, actionMatches, hostnameAllowed,
        minScore: config.minScore, ...(validScore ? { score } : {}),
        ...(Number.isFinite(age) ? { tokenAgeMs: Math.round(age) } : {}),
        ...(properties?.valid !== true ? { invalidReason: INVALID_REASONS.has(properties?.invalidReason) ? properties.invalidReason : 'UNRECOGNIZED' } : {}),
        riskReasons: Array.isArray(rawReasons) ? [...new Set(rawReasons.filter((r): r is string => typeof r === 'string' && RISK_REASONS.has(r)))].slice(0, 8) : [],
      });
    }
    return { ok: true };
  } catch (cause) {
    // 不輸出錯誤全文，避免外部錯誤洩漏 token、API key 或請求資料。
    const code = cause instanceof Error && cause.name === 'TimeoutError' ? 'request_timeout'
      : cause instanceof SyntaxError ? 'response_invalid' : 'assessment_error';
    return rejected(action, 'verification_unavailable', code);
  }
}
