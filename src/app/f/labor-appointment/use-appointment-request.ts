'use client';
import { useEffect, useRef, useState } from 'react';
import { usePublicRequest } from '@/components/loading/use-public-request';
import { preloadCaptchaScript, requestCaptchaToken } from '@/lib/security/recaptcha-client';
import { type PublicCaptchaAction, type PublicCaptchaConfig, PublicRequestError } from '@/lib/security/public-protection';

export function useAppointmentRequest(captcha: PublicCaptchaConfig) {
  const { message, run } = usePublicRequest();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const { mode, siteKey } = captcha;
  useEffect(() => preloadCaptchaScript({ mode, siteKey }), [mode, siteKey]);

  async function request<T extends { ok: true } | { ok: false; message: string }>(
    label: string, work: (token: string) => Promise<T>, action?: PublicCaptchaAction,
  ) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const result = await run(label, async () => work(action ? await requestCaptchaToken(captcha, action) : ''));
      if (!result.ok) setError(result.message);
      return result;
    } catch (cause) {
      const message = cause instanceof PublicRequestError ? cause.message : '目前無法連線，輸入內容已保留，請稍後再試。';
      setError(message);
      return { ok: false, message } as const;
    } finally {
      busy.current = false;
    }
  }
  return { message, request, error, setError };
}
