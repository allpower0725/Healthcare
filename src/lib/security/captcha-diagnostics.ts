/** 固定分類；不得放入 token、網址、個資或外部錯誤文字。 */
export const CLIENT_CAPTCHA_CODES = {
  client_configuration: 'C01', script_load_error: 'C02', script_load_timeout: 'C03',
  api_not_ready: 'C04', execute_error: 'C05', execute_timeout: 'C06', token_empty: 'C07',
} as const;
export const SERVER_CAPTCHA_CODES = {
  configuration_missing: 'S01', token_missing_or_invalid: 'S02', token_invalid: 'S03', action_mismatch: 'S04',
  hostname_mismatch: 'S05', token_time_invalid: 'S06', token_expired: 'S07', score_invalid: 'S08',
  score_below_threshold: 'S09', http_error: 'S10', request_timeout: 'S11', response_invalid: 'S12', assessment_error: 'S13',
  accepted: 'OK',
} as const;
export type ClientCaptchaCode = keyof typeof CLIENT_CAPTCHA_CODES;
export type CaptchaDiagnosticCode = ClientCaptchaCode | keyof typeof SERVER_CAPTCHA_CODES;
export const CAPTCHA_DIAGNOSTIC_CODES = [...Object.keys(CLIENT_CAPTCHA_CODES), ...Object.keys(SERVER_CAPTCHA_CODES)] as [CaptchaDiagnosticCode, ...CaptchaDiagnosticCode[]];
export const INVALID_REASONS = ['INVALID_REASON_UNSPECIFIED', 'UNKNOWN_INVALID_REASON', 'MALFORMED', 'EXPIRED', 'DUPE', 'MISSING', 'BROWSER_ERROR', 'UNRECOGNIZED'] as const;
export const RISK_REASONS = ['CLASSIFICATION_REASON_UNSPECIFIED', 'AUTOMATION', 'UNEXPECTED_ENVIRONMENT', 'TOO_MUCH_TRAFFIC',
  'UNEXPECTED_USAGE_PATTERNS', 'LOW_CONFIDENCE_SCORE', 'SUSPECTED_CARDING', 'SUSPECTED_CHARGEBACK'] as const;
export type CaptchaDiagnosticDetails = {
  score?: number; minScore?: number; tokenValid?: boolean; invalidReason?: string;
  tokenAgeMs?: number; actionMatches?: boolean; hostnameAllowed?: boolean; httpStatus?: number; riskReasons?: string[];
};
export type CaptchaClientReport = { clientFailure: ClientCaptchaCode; referenceId: string };
export type CaptchaProof = string | CaptchaClientReport;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isClientReport(value: unknown): value is CaptchaClientReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return typeof report.clientFailure === 'string' && Object.hasOwn(CLIENT_CAPTCHA_CODES, report.clientFailure)
    && typeof report.referenceId === 'string' && UUID.test(report.referenceId);
}
export function captchaReference(code: CaptchaDiagnosticCode, id: string) {
  const label = Object.hasOwn(CLIENT_CAPTCHA_CODES, code)
    ? CLIENT_CAPTCHA_CODES[code as ClientCaptchaCode] : SERVER_CAPTCHA_CODES[code as keyof typeof SERVER_CAPTCHA_CODES];
  return `RC-${label}-${id}`;
}
/** 二次白名單處理，避免日後呼叫端增加欄位時意外保存個資。 */
export function safeDiagnosticDetails(raw: CaptchaDiagnosticDetails): CaptchaDiagnosticDetails {
  const safe: CaptchaDiagnosticDetails = {};
  for (const key of ['score', 'minScore'] as const) {
    const n = raw[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) safe[key] = n;
  }
  for (const key of ['tokenValid', 'actionMatches', 'hostnameAllowed'] as const) {
    if (typeof raw[key] === 'boolean') safe[key] = raw[key];
  }
  if (typeof raw.tokenAgeMs === 'number' && Number.isFinite(raw.tokenAgeMs)) safe.tokenAgeMs = Math.max(-86400000, Math.min(86400000, Math.round(raw.tokenAgeMs)));
  if (typeof raw.httpStatus === 'number' && Number.isInteger(raw.httpStatus) && raw.httpStatus >= 100 && raw.httpStatus <= 599) safe.httpStatus = raw.httpStatus;
  if (raw.invalidReason && (INVALID_REASONS as readonly string[]).includes(raw.invalidReason)) safe.invalidReason = raw.invalidReason;
  if (Array.isArray(raw.riskReasons)) safe.riskReasons = [...new Set(raw.riskReasons.filter(r => (RISK_REASONS as readonly unknown[]).includes(r)))].slice(0, 8);
  return safe;
}
