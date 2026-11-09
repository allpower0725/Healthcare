'use server';

import type { FormValues, SubmissionStatus } from '@/db/schema';
import { isFormId } from '@/lib/forms/catalog';
import { PUBLIC_CAPTCHA_ACTIONS } from '@/lib/security/public-protection';
import { verifyRecaptcha } from '@/lib/security/recaptcha';
import { clearDeviceToken, ensureDeviceToken, readDeviceToken } from '@/lib/submissions/device';
import {
  createPublicSubmission,
  getDeviceSubmission,
  findRecoverableSubmission,
  resubmitPublic,
  returnToPublic,
} from '@/lib/submissions/service';

// 民眾不需登入；公開異動先通過人機驗證，既有案件仍以裝置憑證確認存取權。

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubmitFormResult =
  | { ok: true; id: string; status: SubmissionStatus; submittedAt: string }
  | { ok: false; reason: string; errors?: Record<string, string> };

async function submittedResult(id: string, token: string): Promise<SubmitFormResult> {
  const row = await getDeviceSubmission(id, token);
  if (!row) return { ok: false, reason: 'not_found' };
  return { ok: true, id, status: row.status, submittedAt: row.publicSubmittedAt.toISOString() };
}

export async function submitForm(formId: string, values: FormValues, requestId?: string, captchaToken?: string): Promise<SubmitFormResult> {
  if (!isFormId(formId)) return { ok: false, reason: 'not_supported' };
  if (requestId != null && !UUID.test(requestId)) return { ok: false, reason: 'not_found' };
  const verification = await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.submit, captchaToken);
  if (!verification.ok) return verification;
  const token = await ensureDeviceToken();
  const result = await createPublicSubmission(formId, values, token, new Date(), requestId);
  if (!result.ok) return result;
  return submittedResult(result.id, token);
}

export async function resubmitForm(submissionId: string, values: FormValues, previousSubmittedAt?: string, captchaToken?: string): Promise<SubmitFormResult> {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return { ok: false, reason: 'not_found' };
  const verification = await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.resubmit, captchaToken);
  if (!verification.ok) return verification;
  const result = await resubmitPublic(submissionId, token, values, new Date(), previousSubmittedAt);
  if (!result.ok) return result;
  await ensureDeviceToken();
  return submittedResult(submissionId, token);
}

export async function returnForm(submissionId: string, captchaToken?: string) {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return { ok: false as const, reason: 'not_found' as const };
  const verification = await verifyRecaptcha(PUBLIC_CAPTCHA_ACTIONS.return, captchaToken);
  if (!verification.ok) return verification;
  return returnToPublic(submissionId, token);
}

export type DeviceSubmission = { id: string; status: SubmissionStatus; publicData: FormValues; submittedAt: string } | null;

function deviceView(row: Awaited<ReturnType<typeof getDeviceSubmission>>): DeviceSubmission {
  return row ? { id: row.id, status: row.status, publicData: row.publicData, submittedAt: row.publicSubmittedAt.toISOString() } : null;
}

/** 這個裝置送出的表單目前狀態（院所是否已確認送出） */
export async function loadDeviceSubmission(submissionId: string, formId?: string): Promise<DeviceSubmission> {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return null;
  const row = await getDeviceSubmission(submissionId, token);
  if (!row || (formId != null && row.formId !== formId)) return null;
  return deviceView(row);
}

/** 暫存遺失也不憑身分證號接管案件；必須同時持有原裝置憑證，且只有一份未完成資料。 */
export async function recoverDeviceSubmission(formId: string, idNo: string): Promise<DeviceSubmission> {
  const token = await readDeviceToken();
  if (!token || !isFormId(formId) || typeof idNo !== 'string' || idNo.length > 20) return null;
  return deviceView(await findRecoverableSubmission(formId, idNo, token));
}

/** 換另一位填寫者：這個裝置不再能存取先前送出的表單 */
export async function forgetDevice() {
  await clearDeviceToken();
}
