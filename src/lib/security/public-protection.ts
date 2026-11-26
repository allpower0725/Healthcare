/** 固定動作名稱，不含表單種類、證件號或其他個人資料。 */
export const PUBLIC_CAPTCHA_ACTIONS = {
  submit: 'public_submit', resubmit: 'public_resubmit', return: 'public_return',
  appointmentLookup: 'appointment_lookup',
  appointmentCreate: 'appointment_create', appointmentCancel: 'appointment_cancel',
} as const;
export type PublicCaptchaAction = (typeof PUBLIC_CAPTCHA_ACTIONS)[keyof typeof PUBLIC_CAPTCHA_ACTIONS];
export type PublicCaptchaConfig = { mode: 'required' | 'development-bypass' | 'unavailable'; siteKey: string };
export type CaptchaFailure = 'verification_failed' | 'verification_unavailable';
/** 只有應用程式自己定義的錯誤文字可直接顯示給填表者。 */
export class PublicRequestError extends Error {}
export const VERIFICATION_MESSAGES: Record<CaptchaFailure, string> = {
  verification_failed: '安全驗證未通過，填寫內容已保留。請稍後重試，或洽院所人員協助。',
  verification_unavailable: '暫時無法完成安全驗證，填寫內容已保留。請稍後重試，或洽院所人員協助。',
};

/** 前台僅收到分類與參考碼，分數與伺服器診斷留在受保護的紀錄。 */
export function verificationMessage(reason: CaptchaFailure, reference?: string, recorded?: boolean) {
  const message = reference?.startsWith('RC-C07-') ? '尚未完成安全驗證，填寫內容已保留。請稍後重試。' : VERIFICATION_MESSAGES[reason];
  return `${message}${reference ? `\n參考代碼：${reference}` : ''}${recorded === false ? '\n診斷紀錄暫時無法儲存，請保留參考代碼並洽院所人員協助。' : ''}`;
}

export function captchaReferenceInMessage(message: string) {
  return message.match(/RC-(?:C0[1-7]|S(?:0[1-9]|1[0-3]))-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
}
