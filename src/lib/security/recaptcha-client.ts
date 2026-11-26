'use client';
import { type PublicCaptchaAction, type PublicCaptchaConfig, PublicRequestError, VERIFICATION_MESSAGES } from './public-protection';
import { captchaReference, type ClientCaptchaCode, type CaptchaProof } from './captcha-diagnostics';
import { newSubmissionRequestId } from '@/lib/submissions/request-id';

class CaptchaClientError extends PublicRequestError {
  readonly referenceId = newSubmissionRequestId();
  constructor(readonly code: ClientCaptchaCode) {
    super(code === 'token_empty' ? '尚未完成安全驗證，填寫內容已保留。請稍後重試。' : VERIFICATION_MESSAGES.verification_unavailable);
    this.message += ` 參考代碼：${captchaReference(code, this.referenceId)}`;
  }
}
type Enterprise = { ready: (callback: () => void) => void; execute: (siteKey: string, options: { action: string }) => Promise<string> };
declare global { interface Window { grecaptcha?: { enterprise?: Enterprise } } }
const SCRIPT_ID = 'hc-recaptcha-enterprise';
let scriptJob: { siteKey: string; promise: Promise<Enterprise> } | null = null;

function loadEnterprise(siteKey: string): Promise<Enterprise> {
  if (scriptJob?.siteKey === siteKey) return scriptJob.promise;
  const promise = new Promise<Enterprise>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    const timeout = window.setTimeout(() => fail('script_load_timeout'), 12000);
    function fail(code: ClientCaptchaCode) {
      clearTimeout(timeout);
      script?.remove();
      reject(new CaptchaClientError(code));
    }
    function ready() {
      const api = window.grecaptcha?.enterprise;
      if (!api) { fail('api_not_ready'); return; }
      try { api.ready(() => { clearTimeout(timeout); resolve(api); }); } catch { fail('api_not_ready'); }
    }
    if (window.grecaptcha?.enterprise) { ready(); return; }
    document.getElementById(SCRIPT_ID)?.remove();
    script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}&hl=zh-TW`;
    script.onload = ready;
    script.onerror = () => fail('script_load_error');
    document.head.append(script);
  });
  scriptJob = { siteKey, promise };
  void promise.catch(() => { if (scriptJob?.promise === promise) scriptJob = null; });
  return promise;
}

/** 開頁時準備腳本；若載入失敗，送出時可再次載入。 */
export function preloadCaptchaScript({ mode, siteKey }: PublicCaptchaConfig): void {
  if (mode === 'required' && siteKey) {
    void loadEnterprise(siteKey);
  }
}

/** 僅在要求異動時執行；本機暫存、恢復或背景同步不產生 token。 */
export async function requestCaptchaToken(config: PublicCaptchaConfig, action: PublicCaptchaAction): Promise<string> {
  if (config.mode === 'development-bypass') return '';
  if (config.mode !== 'required' || !config.siteKey) throw new CaptchaClientError('client_configuration');
  let api: Enterprise;
  try { api = await loadEnterprise(config.siteKey); }
  catch (cause) { throw cause instanceof CaptchaClientError ? cause : new CaptchaClientError('script_load_error'); }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await Promise.race([
      api.execute(config.siteKey, { action }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new CaptchaClientError('execute_timeout')), 12000); }),
    ]);
    if (typeof token !== 'string' || !token.trim() || token.length > 16384) throw new CaptchaClientError('token_empty');
    return token;
  } catch (error) {
    throw error instanceof CaptchaClientError ? error : new CaptchaClientError('execute_error');
  } finally { clearTimeout(timeout); }
}

/** 透過原受保護操作回報固定診斷碼；伺服器一律拒絕此 proof，不新增公開遙測入口。 */
export async function withCaptchaRequest<T>(config: PublicCaptchaConfig, action: PublicCaptchaAction,
  work: (proof: CaptchaProof) => Promise<T>): Promise<T> {
  let proof: CaptchaProof;
  let clientFailure: CaptchaClientError | undefined;
  try { proof = await requestCaptchaToken(config, action); }
  catch (cause) {
    if (!(cause instanceof CaptchaClientError)) throw cause;
    clientFailure = cause;
    proof = { clientFailure: cause.code, referenceId: cause.referenceId };
  }
  try { return await work(proof); }
  catch (cause) {
    // 完全離線時無法保存至伺服器，仍顯示本次前台失敗分類與參考碼供回報。
    if (clientFailure) throw new PublicRequestError(`${clientFailure.message} 診斷回報尚未送達伺服器。`);
    throw cause;
  }
}
