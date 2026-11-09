/** 固定動作名稱，不含表單種類、證件號或其他個人資料。 */
export const PUBLIC_CAPTCHA_ACTIONS = { submit: 'public_submit', resubmit: 'public_resubmit', return: 'public_return' } as const;
export type PublicCaptchaAction = (typeof PUBLIC_CAPTCHA_ACTIONS)[keyof typeof PUBLIC_CAPTCHA_ACTIONS];
export type PublicCaptchaConfig = { mode: 'required' | 'development-bypass' | 'unavailable'; siteKey: string };
export type CaptchaFailure = 'verification_failed' | 'verification_unavailable';
/** 只有應用程式自己定義的錯誤文字可直接顯示給填表者。 */
export class PublicRequestError extends Error {}
export const VERIFICATION_MESSAGES: Record<CaptchaFailure, string> = {
  verification_failed: '安全驗證未通過，填寫內容已保留。請稍後重試，或洽院所人員協助。',
  verification_unavailable: '暫時無法完成安全驗證，填寫內容已保留。請稍後重試，或洽院所人員協助。',
};
