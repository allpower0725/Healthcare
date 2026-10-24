import { createHash } from 'node:crypto';
import { type AnyColumn, and, asc, count, desc, eq, inArray, like, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  type FormValues,
  SUBMISSION_STATUSES,
  type SubmissionAction,
  type SubmissionStatus,
  submissionEvents,
  submissions,
  users,
} from '@/db/schema';
import { FORM_IDS, type FormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { rocToIso } from '@/lib/forms/format';
import { formStatus, getFormSetting } from '@/lib/forms/settings';
import { PAGE_SIZE, type SubmissionQuery } from './query';

/** 民眾裝置自送出起 12 小時內可查看、退回修改（同原電子表單的暫存期限） */
export const DEVICE_TTL_MS = 12 * 60 * 60 * 1000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function hashDeviceToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

const text = (values: FormValues, key: string) => {
  const v = values[key];
  return typeof v === 'string' ? v : '';
};

/** 列表查詢用的欄位，由民眾填寫內容帶入 */
function indexFields(values: FormValues) {
  return {
    idNo: text(values, 'profile.idNo'),
    name: text(values, 'profile.name'),
    birthDate: rocToIso(text(values, 'profile.birthY'), text(values, 'profile.birthM'), text(values, 'profile.birthD')),
  };
}

async function logEvent(tx: Tx, submissionId: string, action: SubmissionAction, actorId: string | null = null) {
  await tx.insert(submissionEvents).values({ submissionId, action, actorId });
}

/* ---------- 民眾端 ---------- */

export type PublicSubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_supported' | 'not_open' }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> };

/** 民眾送出：表單須在開放中，資料依欄位定義清理與驗證 */
export async function createPublicSubmission(
  formId: FormId,
  raw: unknown,
  deviceToken: string,
  now = new Date(),
): Promise<PublicSubmitResult> {
  const def = getFormDef(formId);
  if (!def) return { ok: false, reason: 'not_supported' };
  if (formStatus(await getFormSetting(formId), now) !== 'open') return { ok: false, reason: 'not_open' };

  const values = sanitize(def, 'public', raw);
  const errors = validateRules(def.publicRules, values, now);
  if (Object.keys(errors).length > 0) return { ok: false, reason: 'invalid', errors };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(submissions)
      .values({
        formId,
        status: 'submitted',
        ...indexFields(values),
        publicData: values,
        deviceTokenHash: hashDeviceToken(deviceToken),
        deviceExpiresAt: new Date(now.getTime() + DEVICE_TTL_MS),
        publicSubmittedAt: now,
      })
      .returning({ id: submissions.id });
    await logEvent(tx, row.id, 'submitted');
    return { ok: true, id: row.id } as const;
  });
}

/** 持有憑證的裝置、12 小時內才看得到；已作廢的視同沒有 */
export async function getDeviceSubmission(id: string, deviceToken: string, now = new Date()) {
  const [row] = await db
    .select({
      id: submissions.id,
      formId: submissions.formId,
      status: submissions.status,
      publicData: submissions.publicData,
      publicSubmittedAt: submissions.publicSubmittedAt,
      deviceExpiresAt: submissions.deviceExpiresAt,
    })
    .from(submissions)
    .where(and(eq(submissions.id, id), eq(submissions.deviceTokenHash, hashDeviceToken(deviceToken))));
  if (!row || row.status === 'voided' || !row.deviceExpiresAt || row.deviceExpiresAt <= now) return null;
  return row;
}

/** 這個裝置 12 小時內送出過的某張表單（表單關閉後仍可回來查看、退回修改） */
export async function findDeviceSubmissions(formId: FormId, deviceToken: string, now = new Date()) {
  const rows = await db
    .select({ id: submissions.id, status: submissions.status, deviceExpiresAt: submissions.deviceExpiresAt })
    .from(submissions)
    .where(
      and(
        eq(submissions.formId, formId),
        eq(submissions.deviceTokenHash, hashDeviceToken(deviceToken)),
        ne(submissions.status, 'voided'),
      ),
    );
  return rows.filter((row) => row.deviceExpiresAt && row.deviceExpiresAt > now);
}

export type DeviceActionResult = { ok: true } | { ok: false; reason: 'not_found' | 'locked' | 'not_returned' };

/** 民眾按「退回修改」：只有「民眾已送出」能退回；院所已確認送出時鎖定 */
export async function returnToPublic(id: string, deviceToken: string, now = new Date()): Promise<DeviceActionResult> {
  const current = await getDeviceSubmission(id, deviceToken, now);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status === 'completed') return { ok: false, reason: 'locked' };
  if (current.status !== 'submitted') return { ok: true };

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({ status: 'returned', version: sql`${submissions.version} + 1` })
      .where(and(eq(submissions.id, id), eq(submissions.status, 'submitted')))
      .returning({ id: submissions.id });
    if (updated.length === 0) return { ok: false, reason: 'locked' } as const;
    await logEvent(tx, id, 'returned');
    return { ok: true } as const;
  });
}

/** 退回修改後再次送出：不受開放時間限制；身分證號維持原本的值 */
export async function resubmitPublic(
  id: string,
  deviceToken: string,
  raw: unknown,
  now = new Date(),
): Promise<DeviceActionResult | (PublicSubmitResult & { ok: false })> {
  const current = await getDeviceSubmission(id, deviceToken, now);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status !== 'returned') return { ok: false, reason: 'not_returned' };
  const def = getFormDef(current.formId);
  if (!def) return { ok: false, reason: 'not_supported' };

  const idNo = text(current.publicData, 'profile.idNo');
  const values = { ...sanitize(def, 'public', raw), 'profile.idNo': idNo };
  const errors = validateRules(def.publicRules, values, now);
  if (Object.keys(errors).length > 0) return { ok: false, reason: 'invalid', errors };

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({
        status: 'submitted',
        ...indexFields(values),
        publicData: values,
        publicSubmittedAt: now,
        deviceExpiresAt: new Date(now.getTime() + DEVICE_TTL_MS),
        version: sql`${submissions.version} + 1`,
      })
      .where(and(eq(submissions.id, id), eq(submissions.status, 'returned')))
      .returning({ id: submissions.id });
    if (updated.length === 0) return { ok: false, reason: 'not_returned' } as const;
    await logEvent(tx, id, 'resubmitted');
    return { ok: true } as const;
  });
}

/* ---------- 後台 ---------- */

export type StaffActionResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'conflict' | 'locked' | 'not_ready' | 'invalid_status' };

async function isActiveUser(tx: Tx, actorId: string) {
  const [actor] = await tx.select({ status: users.status }).from(users).where(eq(users.id, actorId));
  return actor?.status === 'active';
}

async function lockRow(tx: Tx, id: string) {
  const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for('update');
  return row;
}

/** 暫存院所區；民眾已送出或修改中才能編輯，版本不符（別人已更新）時擋下 */
export async function saveStaffData(actorId: string, id: string, version: number, raw: unknown): Promise<StaffActionResult> {
  return db.transaction(async (tx) => {
    if (!(await isActiveUser(tx, actorId))) return { ok: false, reason: 'forbidden' } as const;
    const row = await lockRow(tx, id);
    if (!row) return { ok: false, reason: 'not_found' } as const;
    if (row.status !== 'submitted' && row.status !== 'returned') return { ok: false, reason: 'locked' } as const;
    if (row.version !== version) return { ok: false, reason: 'conflict' } as const;
    const def = getFormDef(row.formId);
    if (!def) return { ok: false, reason: 'not_found' } as const;

    const [updated] = await tx
      .update(submissions)
      .set({
        staffData: sanitize(def, 'staff', raw, row.publicData),
        staffUpdatedBy: actorId,
        staffUpdatedAt: new Date(),
        version: row.version + 1,
      })
      .where(eq(submissions.id, id))
      .returning({ version: submissions.version });
    return { ok: true, version: updated.version } as const;
  });
}

/** 確認送出：一併存入院所區，之後整張表單鎖定 */
export async function completeSubmission(
  actorId: string,
  id: string,
  version: number,
  raw: unknown,
): Promise<StaffActionResult> {
  return db.transaction(async (tx) => {
    if (!(await isActiveUser(tx, actorId))) return { ok: false, reason: 'forbidden' } as const;
    const row = await lockRow(tx, id);
    if (!row) return { ok: false, reason: 'not_found' } as const;
    if (row.status === 'returned') return { ok: false, reason: 'not_ready' } as const;
    if (row.status !== 'submitted') return { ok: false, reason: 'invalid_status' } as const;
    if (row.version !== version) return { ok: false, reason: 'conflict' } as const;
    const def = getFormDef(row.formId);
    if (!def) return { ok: false, reason: 'not_found' } as const;

    const now = new Date();
    const [updated] = await tx
      .update(submissions)
      .set({
        status: 'completed',
        staffData: sanitize(def, 'staff', raw, row.publicData),
        staffUpdatedBy: actorId,
        staffUpdatedAt: now,
        completedBy: actorId,
        completedAt: now,
        version: row.version + 1,
      })
      .where(eq(submissions.id, id))
      .returning({ version: submissions.version });
    await logEvent(tx, id, 'completed', actorId);
    return { ok: true, version: updated.version } as const;
  });
}

const TRANSITIONS = {
  reopen: { from: ['completed'], to: 'submitted', event: 'reopened' },
  void: { from: ['submitted', 'returned'], to: 'voided', event: 'voided' },
  restore: { from: ['voided'], to: 'submitted', event: 'restored' },
} as const satisfies Record<string, { from: readonly SubmissionStatus[]; to: SubmissionStatus; event: SubmissionAction }>;

async function transition(actorId: string, id: string, kind: keyof typeof TRANSITIONS): Promise<StaffActionResult> {
  const { from, to, event } = TRANSITIONS[kind];
  return db.transaction(async (tx) => {
    if (!(await isActiveUser(tx, actorId))) return { ok: false, reason: 'forbidden' } as const;
    const row = await lockRow(tx, id);
    if (!row) return { ok: false, reason: 'not_found' } as const;
    if (!(from as readonly SubmissionStatus[]).includes(row.status)) return { ok: false, reason: 'invalid_status' } as const;

    const [updated] = await tx
      .update(submissions)
      .set({
        status: to,
        version: row.version + 1,
        // 取消送出後清掉完成資訊，完整經過留在操作紀錄
        ...(kind === 'reopen' ? { completedBy: null, completedAt: null } : {}),
      })
      .where(eq(submissions.id, id))
      .returning({ version: submissions.version });
    await logEvent(tx, id, event, actorId);
    return { ok: true, version: updated.version } as const;
  });
}

/** 取消送出：回到「民眾已送出」，民眾的退回修改恢復可用 */
export const reopenSubmission = (actorId: string, id: string) => transition(actorId, id, 'reopen');
/** 作廢（處理重複送出）；只限尚未完成的資料 */
export const voidSubmission = (actorId: string, id: string) => transition(actorId, id, 'void');
/** 復原作廢 */
export const restoreSubmission = (actorId: string, id: string) => transition(actorId, id, 'restore');

const updater = alias(users, 'updater');
const completer = alias(users, 'completer');

/** 後台單筆頁 */
export async function getSubmission(id: string) {
  const [row] = await db
    .select({
      submission: submissions,
      staffUpdatedByName: updater.name,
      completedByName: completer.name,
    })
    .from(submissions)
    .leftJoin(updater, eq(submissions.staffUpdatedBy, updater.id))
    .leftJoin(completer, eq(submissions.completedBy, completer.id))
    .where(eq(submissions.id, id));
  if (!row) return null;
  return { ...row.submission, staffUpdatedByName: row.staffUpdatedByName, completedByName: row.completedByName };
}

/** 各狀態的筆數（後台首頁提醒用） */
export async function countSubmissionsByStatus() {
  const rows = await db
    .select({ status: submissions.status, n: sql<number>`count(*)::int` })
    .from(submissions)
    .groupBy(submissions.status);
  const counts: Record<SubmissionStatus, number> = { submitted: 0, returned: 0, completed: 0, voided: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/** 操作紀錄（民眾操作時 actorName 為 null） */
export async function listEvents(id: string) {
  return db
    .select({ action: submissionEvents.action, createdAt: submissionEvents.createdAt, actorName: users.name })
    .from(submissionEvents)
    .leftJoin(users, eq(submissionEvents.actorId, users.id))
    .where(eq(submissionEvents.submissionId, id))
    .orderBy(asc(submissionEvents.id));
}

const UNFINISHED: SubmissionStatus[] = ['submitted', 'returned'];

/** 同一人、同一表單的其他未完成資料（重複送出提示） */
export async function findDuplicates(id: string) {
  const [row] = await db
    .select({ idNo: submissions.idNo, formId: submissions.formId, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, id));
  if (!row || !UNFINISHED.includes(row.status)) return [];
  return db
    .select({ id: submissions.id, status: submissions.status, publicSubmittedAt: submissions.publicSubmittedAt })
    .from(submissions)
    .where(
      and(
        eq(submissions.idNo, row.idNo),
        eq(submissions.formId, row.formId),
        ne(submissions.id, id),
        inArray(submissions.status, UNFINISHED),
      ),
    )
    .orderBy(desc(submissions.publicSubmittedAt));
}

/** LIKE 的 %、_、\ 當一般字元 */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** 依表單、狀態的固定順序排序（不是依代號的字母順序） */
const orderOf = (values: readonly string[], column: AnyColumn) =>
  sql`array_position(array[${sql.raw(values.map((v) => `'${v}'`).join(', '))}]::text[], ${column})`;

/**
 * 協同完成列表：篩選（身分證號部分比對、表單、狀態；條件同時成立）、排序、分頁。
 * 表單與狀態只列出勾選的，任一組全不勾就沒有資料。
 * duplicates 為同一人同表單其他未完成的筆數。
 */
export async function searchSubmissions(q: SubmissionQuery) {
  // 全選的那一組不必加條件
  const where =
    q.forms.length && q.statuses.length
      ? and(
          q.forms.length < FORM_IDS.length ? inArray(submissions.formId, q.forms) : undefined,
          q.statuses.length < SUBMISSION_STATUSES.length ? inArray(submissions.status, q.statuses) : undefined,
          q.idNo ? like(submissions.idNo, `%${escapeLike(q.idNo)}%`) : undefined,
        )
      : sql`false`;

  const direction = q.dir === 'asc' ? sql`asc` : sql`desc`;
  const primary = {
    form: sql`${orderOf(FORM_IDS, submissions.formId)} ${direction}`,
    status: sql`${orderOf(SUBMISSION_STATUSES, submissions.status)} ${direction}`,
    name: sql`${submissions.name} ${direction}`,
    idNo: sql`${submissions.idNo} ${direction}`,
    submitted: sql`${submissions.publicSubmittedAt} ${direction}`,
    // 尚未完成的排在最後
    completed: sql`${submissions.completedAt} ${direction} nulls last`,
  }[q.sort];

  const duplicates = sql<number>`case when "heal_submissions"."status" in ('submitted', 'returned') then (
    select count(*)::int from "heal_submissions" as "others"
    where "others"."id_no" = "heal_submissions"."id_no"
      and "others"."form_id" = "heal_submissions"."form_id"
      and "others"."id" <> "heal_submissions"."id"
      and "others"."status" in ('submitted', 'returned')
  ) else 0 end`;
  const [{ total }] = await db.select({ total: count() }).from(submissions).where(where);
  const rows = await db
    .select({
      id: submissions.id,
      formId: submissions.formId,
      status: submissions.status,
      idNo: submissions.idNo,
      name: submissions.name,
      publicSubmittedAt: submissions.publicSubmittedAt,
      completedAt: submissions.completedAt,
      duplicates,
    })
    .from(submissions)
    .where(where)
    .orderBy(primary, desc(submissions.publicSubmittedAt), desc(submissions.createdAt), desc(submissions.id))
    .limit(PAGE_SIZE)
    .offset((q.page - 1) * PAGE_SIZE);

  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
