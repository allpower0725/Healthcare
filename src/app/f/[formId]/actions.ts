'use server';

import type { FormValues, SubmissionStatus } from '@/db/schema';
import { isFormId } from '@/lib/forms/catalog';
import { clearDeviceToken, ensureDeviceToken, readDeviceToken } from '@/lib/submissions/device';
import {
  createPublicSubmission,
  getDeviceSubmission,
  resubmitPublic,
  returnToPublic,
} from '@/lib/submissions/service';

// 這些 Server Action 對外公開（民眾不需登入），只靠裝置憑證辨識是誰送出的

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubmitFormResult =
  | { ok: true; id: string; submittedAt: string }
  | { ok: false; reason: string; errors?: Record<string, string> };

export async function submitForm(formId: string, values: FormValues): Promise<SubmitFormResult> {
  if (!isFormId(formId)) return { ok: false, reason: 'not_supported' };
  const token = await ensureDeviceToken();
  const result = await createPublicSubmission(formId, values, token);
  if (!result.ok) return result;
  return { ok: true, id: result.id, submittedAt: new Date().toISOString() };
}

export async function resubmitForm(submissionId: string, values: FormValues): Promise<SubmitFormResult> {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return { ok: false, reason: 'not_found' };
  const result = await resubmitPublic(submissionId, token, values);
  if (!result.ok) return result;
  await ensureDeviceToken();
  return { ok: true, id: submissionId, submittedAt: new Date().toISOString() };
}

export async function returnForm(submissionId: string) {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return { ok: false as const, reason: 'not_found' as const };
  return returnToPublic(submissionId, token);
}

export type DeviceSubmission = { status: SubmissionStatus; publicData: FormValues; submittedAt: string } | null;

/** 這個裝置送出的表單目前狀態（院所是否已確認送出） */
export async function loadDeviceSubmission(submissionId: string): Promise<DeviceSubmission> {
  const token = await readDeviceToken();
  if (!token || !UUID.test(submissionId)) return null;
  const row = await getDeviceSubmission(submissionId, token);
  if (!row) return null;
  return { status: row.status, publicData: row.publicData, submittedAt: row.publicSubmittedAt.toISOString() };
}

/** 換另一位填寫者：這個裝置不再能存取先前送出的表單 */
export async function forgetDevice() {
  await clearDeviceToken();
}
