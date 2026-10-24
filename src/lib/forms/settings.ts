import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { type FormSetting, formSettings, users } from '@/db/schema';
import { formatDateTime } from '@/lib/time';
import { FORM_IDS, type FormId } from './catalog';

export type FormStatus = 'closed' | 'scheduled' | 'open' | 'ended';

type Period = Pick<FormSetting, 'isOpen' | 'opensAt' | 'closesAt'>;

/** 開放中＝開關打開，且已到開始時間（未設則不限），且未到結束時間（未設則不限） */
export function formStatus(setting: Period, now = new Date()): FormStatus {
  if (!setting.isOpen) return 'closed';
  if (setting.closesAt && now >= setting.closesAt) return 'ended';
  if (setting.opensAt && now < setting.opensAt) return 'scheduled';
  return 'open';
}

/** 開放期間的文字（台灣時間）；未設任何時間時回傳 null */
export function describePeriod(setting: Pick<FormSetting, 'opensAt' | 'closesAt'>) {
  const { opensAt, closesAt } = setting;
  if (opensAt && closesAt) return `${formatDateTime(opensAt)} – ${formatDateTime(closesAt)}`;
  if (opensAt) return `${formatDateTime(opensAt)} 起`;
  if (closesAt) return `至 ${formatDateTime(closesAt)}`;
  return null;
}

function closedSetting(formId: FormId): FormSetting {
  return { formId, isOpen: false, opensAt: null, closesAt: null, updatedBy: null, updatedAt: new Date(0) };
}

/** 6 張表單的開放設定，依表單順序；資料列遺失時視為關閉 */
export async function listFormSettings() {
  const rows = await db.select().from(formSettings);
  return FORM_IDS.map((id) => rows.find((row) => row.formId === id) ?? closedSetting(id));
}

export async function getFormSetting(formId: FormId) {
  const [row] = await db.select().from(formSettings).where(eq(formSettings.formId, formId));
  return row ?? closedSetting(formId);
}

export type FormSettingInput = Period;
export type UpdateFormSettingResult = { ok: true } | { ok: false; reason: 'forbidden' | 'invalid_period' };

/** 只有啟用中的管理者、最高管理者可以修改；權限依資料庫的最新狀態檢查 */
export async function updateFormSetting(
  actorId: string,
  formId: FormId,
  input: FormSettingInput,
): Promise<UpdateFormSettingResult> {
  const [actor] = await db.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, actorId));
  if (!actor || actor.status !== 'active' || actor.role === 'staff') return { ok: false, reason: 'forbidden' };
  if (input.opensAt && input.closesAt && input.opensAt >= input.closesAt) return { ok: false, reason: 'invalid_period' };

  const values = { isOpen: input.isOpen, opensAt: input.opensAt, closesAt: input.closesAt, updatedBy: actorId };
  await db
    .insert(formSettings)
    .values({ formId, ...values })
    .onConflictDoUpdate({ target: formSettings.formId, set: { ...values, updatedAt: new Date() } });
  return { ok: true };
}
