import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicCaptchaConfig, verifyRecaptcha } from '@/lib/security/recaptcha';
import { PUBLIC_CAPTCHA_ACTIONS } from '@/lib/security/public-protection';

const NOW = new Date('2026-11-06T04:00:00Z');
const good = () => ({ tokenProperties: { valid: true, hostname: 'wjcch-healthcare.vercel.app', action: PUBLIC_CAPTCHA_ACTIONS.submit, createTime: NOW.toISOString() }, riskAnalysis: { score: .9 } });
const respond = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VERCEL', ''); vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('RECAPTCHA_DEV_BYPASS', 'false');
  vi.stubEnv('RECAPTCHA_SITE_KEY', 'public-site-key'); vi.stubEnv('RECAPTCHA_PROJECT_ID', 'test-project');
  vi.stubEnv('RECAPTCHA_API_KEY', 'test-server-key'); vi.stubEnv('RECAPTCHA_ALLOWED_HOSTNAMES', 'wjcch-healthcare.vercel.app');
  vi.stubEnv('RECAPTCHA_MIN_SCORE', '0.5'); respond(good());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('reCAPTCHA 伺服器防護', () => {
  it('以 v1 assessment 驗證；只傳必要欄位，密鑰不放 URL 或前台設定', async () => {
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'fresh-token', NOW)).toEqual({ ok: true });
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://recaptchaenterprise.googleapis.com/v1/projects/test-project/assessments');
    expect(request).toMatchObject({ method: 'POST', cache: 'no-store', headers: { 'X-Goog-Api-Key': 'test-server-key' } });
    expect(JSON.parse(request!.body as string)).toEqual({ event: { token: 'fresh-token', siteKey: 'public-site-key', expectedAction: 'public_submit' } });
    expect(getPublicCaptchaConfig()).toEqual({ mode: 'required', siteKey: 'public-site-key' });
  });
  it.each([undefined, null, '', ' ', 12, {}, 'a'.repeat(16385)])('空白或不合法 token 不發出 assessment（%s）', async token => {
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, token, NOW)).toEqual({ ok: false, reason: 'verification_failed' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { valid: false, invalidReason: 'DUPE' }, { valid: false, invalidReason: 'EXPIRED' },
    { hostname: 'evil.example' }, { action: 'public_return' }, { createTime: 'invalid' },
    { createTime: '2026-11-06T03:57:59Z' }, { createTime: '2026-11-06T04:00:31Z' },
  ])('拒絕無效、重複、過期、網域或動作不符：%j', async properties => {
    const body = good(); respond({ ...body, tokenProperties: { ...body.tokenProperties, ...properties } });
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toEqual({ ok: false, reason: 'verification_failed' });
  });
  it.each([.1, -1, 1.1, '0.9', null, undefined])('拒絕低分或錯誤分數：%s', async score => {
    respond({ ...good(), riskAnalysis: { score } });
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toMatchObject({ ok: false });
  });
  it('門檻可調整，回應新增未知欄位不影響驗證', async () => {
    vi.stubEnv('RECAPTCHA_MIN_SCORE', '.95');
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toMatchObject({ ok: false });
    vi.stubEnv('RECAPTCHA_MIN_SCORE', '.9'); respond({ ...good(), futureField: 'ignored' });
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toEqual({ ok: true });
  });
  it.each(['RECAPTCHA_SITE_KEY', 'RECAPTCHA_PROJECT_ID', 'RECAPTCHA_API_KEY', 'RECAPTCHA_ALLOWED_HOSTNAMES'])('缺少 %s 拒絕放行', async key => {
    vi.stubEnv(key, '');
    expect(getPublicCaptchaConfig()).toEqual({ mode: 'unavailable', siteKey: '' });
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toEqual({ ok: false, reason: 'verification_unavailable' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['https://example.com', '*.vercel.app', 'localhost:3000', 'example.com,'])('不接受過寬或格式錯誤的 hostname 設定：%s', hostname => {
    vi.stubEnv('RECAPTCHA_ALLOWED_HOSTNAMES', hostname); expect(getPublicCaptchaConfig().mode).toBe('unavailable');
  });
  it.each(['NaN', '-1', '1.1'])('門檻設定無效時不放行：%s', async score => {
    vi.stubEnv('RECAPTCHA_MIN_SCORE', score);
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toMatchObject({ ok: false, reason: 'verification_unavailable' });
  });
  it('服務錯誤、非 JSON 及網路逾時皆安全拒絕，不外洩錯誤內容', async () => {
    respond({ error: 'remote details' }, 503);
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toMatchObject({ ok: false, reason: 'verification_unavailable' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('invalid json')));
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toMatchObject({ ok: false, reason: 'verification_unavailable' });
    vi.stubGlobal('fetch', vi.fn(async (_url, request) => {
      expect(request.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException('request timeout', 'TimeoutError');
    }));
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, 'token', NOW)).toEqual({ ok: false, reason: 'verification_unavailable' });
  });
  it('略過模式只允許明確開啟的本機 development，production／Vercel 均不能略過', async () => {
    vi.stubEnv('RECAPTCHA_API_KEY', ''); vi.stubEnv('RECAPTCHA_DEV_BYPASS', 'true');
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, '', NOW)).toMatchObject({ ok: false });
    vi.stubEnv('NODE_ENV', 'development');
    expect(getPublicCaptchaConfig().mode).toBe('development-bypass');
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, '', NOW)).toEqual({ ok: true });
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(getPublicCaptchaConfig().mode).toBe('unavailable');
    expect(await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, '', NOW)).toMatchObject({ ok: false });
  });
});
