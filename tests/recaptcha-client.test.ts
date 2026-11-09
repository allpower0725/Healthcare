import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_CAPTCHA_ACTIONS } from '@/lib/security/public-protection';
const config = { mode: 'required' as const, siteKey: 'public-key' };
beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('前台 token 僅在操作時取得', () => {
  it('未設定及本機略過不載入 Google 腳本；正式未設定回覆可理解錯誤', async () => {
    const { preloadCaptchaScript, requestCaptchaToken } = await import('@/lib/security/recaptcha-client');
    preloadCaptchaScript({ mode: 'unavailable', siteKey: '' });
    preloadCaptchaScript({ mode: 'development-bypass', siteKey: '' });
    await expect(requestCaptchaToken({ mode: 'unavailable', siteKey: '' }, PUBLIC_CAPTCHA_ACTIONS.submit)).rejects.toThrow('安全驗證');
    expect(await requestCaptchaToken({ mode: 'development-bypass', siteKey: '' }, PUBLIC_CAPTCHA_ACTIONS.submit)).toBe('');
  });
  it('開頁載入腳本，等到操作才執行驗證，每次操作各自取得 token', async () => {
    const script = { remove: vi.fn() } as unknown as HTMLScriptElement;
    const append = vi.fn(); const browser: { setTimeout: typeof setTimeout; grecaptcha?: Window['grecaptcha'] } = { setTimeout };
    vi.stubGlobal('window', browser); vi.stubGlobal('document', { getElementById: () => null, createElement: () => script, head: { append } });
    const { preloadCaptchaScript, requestCaptchaToken } = await import('@/lib/security/recaptcha-client');
    preloadCaptchaScript(config);
    preloadCaptchaScript(config);
    expect(append).toHaveBeenCalledOnce();
    expect(script.src).toBe('https://www.google.com/recaptcha/enterprise.js?render=public-key&hl=zh-TW');
    const execute = vi.fn().mockResolvedValueOnce('fresh-1').mockResolvedValueOnce('fresh-2');
    browser.grecaptcha = { enterprise: { ready: fn => fn(), execute } };
    script.onload!.call(script, new Event('load'));
    await Promise.resolve();
    expect(execute).not.toHaveBeenCalled();

    expect(await requestCaptchaToken(config, PUBLIC_CAPTCHA_ACTIONS.submit)).toBe('fresh-1');
    expect(await requestCaptchaToken(config, PUBLIC_CAPTCHA_ACTIONS.resubmit)).toBe('fresh-2');
    expect(execute.mock.calls.map(call => call[1].action)).toEqual(['public_submit', 'public_resubmit']);
    expect(append).toHaveBeenCalledOnce();
  });
  it('開頁載入失敗後可在送出時重試，驗證錯誤有友善提示', async () => {
    const scripts: HTMLScriptElement[] = [];
    const browser: { setTimeout: typeof setTimeout; grecaptcha?: Window['grecaptcha'] } = { setTimeout };
    vi.stubGlobal('window', browser); vi.stubGlobal('document', { getElementById: () => null, createElement: () => { const script = { remove: vi.fn() } as unknown as HTMLScriptElement; scripts.push(script); return script; }, head: { append: vi.fn() } });
    const { preloadCaptchaScript, requestCaptchaToken } = await import('@/lib/security/recaptcha-client');
    preloadCaptchaScript(config);
    (scripts[0].onerror as () => void)();
    await Promise.resolve();

    const second = requestCaptchaToken(config, PUBLIC_CAPTCHA_ACTIONS.submit);
    browser.grecaptcha = { enterprise: { ready: fn => fn(), execute: async () => { throw new Error('private remote details'); } } };
    scripts[1].onload!.call(scripts[1], new Event('load'));
    await expect(second).rejects.toThrow('暫時無法完成安全驗證');
  });
  it('execute 逾時會結束等待', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout, grecaptcha: { enterprise: { ready: (fn: () => void) => fn(), execute: () => new Promise(() => {}) } } });
    const { requestCaptchaToken } = await import('@/lib/security/recaptcha-client');
    const request = requestCaptchaToken(config, PUBLIC_CAPTCHA_ACTIONS.submit); const failed = expect(request).rejects.toThrow('安全驗證');
    await vi.advanceTimersByTimeAsync(12000); await failed;
  });
});
