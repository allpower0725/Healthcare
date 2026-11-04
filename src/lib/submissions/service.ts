import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { type AnyColumn, and, asc, count, desc, eq, gt, ilike, inArray, like, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  type FormValues,
  type Submission,
  formSettings,
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
import { formStatus } from '@/lib/forms/settings';
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
  | { ok: false; reason: 'not_supported' | 'not_open' | 'not_found' | 'not_returned' | 'ambiguous' }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ownsSubmission(row: Submission, deviceToken: string, now: Date) {
  return row.deviceTokenHash === hashDeviceToken(deviceToken)
    && row.deviceExpiresAt != null && row.deviceExpiresAt > now && row.status !== 'voided';
}

function samePublicData(row: Submission, values: FormValues) {
  return isDeepStrictEqual(sanitize(getFormDef(row.formId)!, 'public', row.publicData), values);
}

/** 更新同一案件；只清除不再適用的院所欄位，其餘內容及填寫人資訊保留。呼叫前須鎖住原列。 */
async function updateReturned(tx: Tx, row: Submission, values: FormValues, now: Date) {
  // 即使兩次送出落在同一毫秒，仍讓修改批次的識別時間前進。
  const submittedAt = new Date(Math.max(now.getTime(), row.publicSubmittedAt.getTime() + 1));
  await tx.update(submissions).set({
    status: 'submitted',
    ...indexFields(values),
    publicData: values,
    staffData: Object.keys(row.staffData).length ? sanitize(getFormDef(row.formId)!, 'staff', row.staffData, values) : row.staffData,
    publicSubmittedAt: submittedAt,
    deviceExpiresAt: new Date(now.getTime() + DEVICE_TTL_MS),
    version: row.version + 1,
  }).where(eq(submissions.id, row.id));
  await logEvent(tx, row.id, 'resubmitted');
}

/** 新填寫與遺失編號的重試：原裝置的未完成案件優先續用，已完成案件不覆蓋。 */
export async function createPublicSubmission(
  formId: FormId,
  raw: unknown,
  deviceToken: string,
  now = new Date(),
  requestId?: string,
): Promise<PublicSubmitResult> {
  const def = getFormDef(formId);
  if (!def) return { ok: false, reason: 'not_supported' };
  if (requestId != null && !UUID.test(requestId)) return { ok: false, reason: 'not_found' };

  const values = sanitize(def, 'public', raw);
  const errors = validateRules(def.publicRules, values, now);
  if (Object.keys(errors).length > 0) return { ok: false, reason: 'invalid', errors };

  return db.transaction(async (tx) => {
    // 第一筆尚未存在時也須序列化相同案件的請求；交易結束自動釋放，適用交易模式連線池。
    const lockKey = createHash('sha256').update(JSON.stringify(['public-submit', hashDeviceToken(deviceToken), formId, indexFields(values).idNo]))
      .digest().readBigInt64BE(0).toString();
    await tx.execute(sql`select pg_advisory_xact_lock(${lockKey}::bigint)`);

    // 首次送出的 UUID 在請求前就保存在裝置上；回應遺失後重試也不會建立另一筆。
    if (requestId) {
      const known = await lockRow(tx, requestId);
      if (known) {
        if (!ownsSubmission(known, deviceToken, now) || known.formId !== formId || known.idNo !== indexFields(values).idNo) {
          return { ok: false, reason: 'not_found' } as const;
        }
        if (known.status !== 'returned' && samePublicData(known, values)) return { ok: true, id: known.id } as const;
        return { ok: false, reason: 'not_returned' } as const;
      }
    }

    const existing = await tx.select().from(submissions).where(and(
      eq(submissions.formId, formId), eq(submissions.idNo, indexFields(values).idNo),
      eq(submissions.deviceTokenHash, hashDeviceToken(deviceToken)), gt(submissions.deviceExpiresAt, now),
      inArray(submissions.status, ['submitted', 'returned']),
    )).limit(2).for('update');
    // 歷史重複案件需由人員比對，不任選一筆覆蓋或自動合併。
    if (existing.length > 1) return { ok: false, reason: 'ambiguous' } as const;
    const current = existing[0];
    if (current) {
      if (current.status === 'returned') {
        await updateReturned(tx, current, values, now);
        return { ok: true, id: current.id } as const;
      }
      if (samePublicData(current, values)) return { ok: true, id: current.id } as const;
      return { ok: false, reason: 'not_returned' } as const;
    }

    const [setting] = await tx.select().from(formSettings).where(eq(formSettings.formId, formId));
    if (!setting || formStatus(setting, now) !== 'open') return { ok: false, reason: 'not_open' } as const;
    const [row] = await tx
      .insert(submissions)
      .values({
        id: requestId,
        formId,
        status: 'submitted',
        ...indexFields(values),
        publicData: values,
        deviceTokenHash: hashDeviceToken(deviceToken),
        deviceExpiresAt: new Date(now.getTime() + DEVICE_TTL_MS),
        publicSubmittedAt: now,
      })
      .onConflictDoNothing({ target: submissions.id })
      .returning({ id: submissions.id });
    // 其他裝置占用相同 UUID 時不洩漏資料，也不另建一筆。
    if (!row) return { ok: false, reason: 'not_found' } as const;
    await logEvent(tx, row.id, 'submitted');
    return { ok: true, id: row.id } as const;
  });
}

/** 暫存編號遺失時，只恢復這個有效裝置唯一一份相同身分、同種類的未完成案件。 */
export async function findRecoverableSubmission(formId: FormId, idNo: string, deviceToken: string, now = new Date()) {
  const rows = await db.select().from(submissions).where(and(
    eq(submissions.formId, formId), eq(submissions.idNo, idNo.toUpperCase().replace(/\s+/g, '')),
    eq(submissions.deviceTokenHash, hashDeviceToken(deviceToken)), gt(submissions.deviceExpiresAt, now),
    inArray(submissions.status, ['submitted', 'returned']),
  )).limit(2);
  return rows.length === 1 ? rows[0] : null;
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

export type DeviceActionResult = { ok: true } | { ok: false; reason: 'not_found' | 'locked' | 'not_returned' | 'conflict' };

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
  previousSubmittedAt?: string,
): Promise<DeviceActionResult | (PublicSubmitResult & { ok: false })> {
  return db.transaction(async (tx) => {
    const current = await lockRow(tx, id);
    if (!current || !ownsSubmission(current, deviceToken, now)) return { ok: false, reason: 'not_found' } as const;
    const def = getFormDef(current.formId);
    if (!def) return { ok: false, reason: 'not_supported' } as const;
    const values = { ...sanitize(def, 'public', raw), 'profile.idNo': current.idNo };
    const errors = validateRules(def.publicRules, values, now);
    if (Object.keys(errors).length > 0) return { ok: false, reason: 'invalid', errors } as const;

    if (current.status !== 'returned') {
      // 僅將已成功處理的相同內容視為重試，不讓晚到的請求覆蓋已提交／已完成的資料。
      if (previousSubmittedAt && previousSubmittedAt !== current.publicSubmittedAt.toISOString() && samePublicData(current, values)) {
        return { ok: true } as const;
      }
      return { ok: false, reason: 'not_returned' } as const;
    }
    if (previousSubmittedAt && previousSubmittedAt !== current.publicSubmittedAt.toISOString()) {
      return { ok: false, reason: 'conflict' } as const;
    }
    await updateReturned(tx, current, values, now);
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
 * 協同完成列表：篩選（姓名／身分證號部分比對、表單、狀態；條件同時成立）、排序、分頁。
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
          q.idNo
            ? /\d/.test(q.idNo)
              ? like(submissions.idNo, `%${escapeLike(q.idNo)}%`)
              : ilike(submissions.name, `%${escapeLike(q.idNo)}%`)
            : undefined,
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
