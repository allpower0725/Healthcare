'use client';
import { type PublicCaptchaAction, type PublicCaptchaConfig, PublicRequestError, VERIFICATION_MESSAGES } from './public-protection';
type Enterprise = { ready: (callback: () => void) => void; execute: (siteKey: string, options: { action: string }) => Promise<string> };
declare global { interface Window { grecaptcha?: { enterprise?: Enterprise } } }
const SCRIPT_ID = 'hc-recaptcha-enterprise';
let scriptJob: { siteKey: string; promise: Promise<Enterprise> } | null = null;

function loadEnterprise(siteKey: string): Promise<Enterprise> {
  if (scriptJob?.siteKey === siteKey) return scriptJob.promise;
  const promise = new Promise<Enterprise>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    const timeout = window.setTimeout(fail, 12000);
    function fail() {
      clearTimeout(timeout);
      script?.remove();
      reject(new PublicRequestError(VERIFICATION_MESSAGES.verification_unavailable));
    }
    function ready() {
      const api = window.grecaptcha?.enterprise;
      if (!api) { fail(); return; }
      try { api.ready(() => { clearTimeout(timeout); resolve(api); }); } catch { fail(); }
    }
    if (window.grecaptcha?.enterprise) { ready(); return; }
    document.getElementById(SCRIPT_ID)?.remove();
    script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}&hl=zh-TW`;
    script.onload = ready;
    script.onerror = fail;
    document.head.append(script);
  });
  scriptJob = { siteKey, promise };
  void promise.catch(() => { if (scriptJob?.promise === promise) scriptJob = null; });
  return promise;
}
/** 僅在要求異動時執行；本機暫存、恢復或背景同步不產生 token。 */
export async function requestCaptchaToken(config: PublicCaptchaConfig, action: PublicCaptchaAction): Promise<string> {
  if (config.mode === 'development-bypass') return '';
  if (config.mode !== 'required' || !config.siteKey) throw new PublicRequestError(VERIFICATION_MESSAGES.verification_unavailable);
  const api = await loadEnterprise(config.siteKey);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await Promise.race([
      api.execute(config.siteKey, { action }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new PublicRequestError(VERIFICATION_MESSAGES.verification_unavailable)), 12000); }),
    ]);
    if (!token) throw new PublicRequestError(VERIFICATION_MESSAGES.verification_failed);
    return token;
  } catch (error) {
    throw error instanceof PublicRequestError ? error : new PublicRequestError(VERIFICATION_MESSAGES.verification_unavailable);
  } finally { clearTimeout(timeout); }
}
