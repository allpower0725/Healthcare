import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { FORM_IDS } from '../lib/forms/catalog';

export const USER_ROLES = ['superadmin', 'admin', 'staff'] as const;
export const USER_STATUSES = ['pending', 'active', 'rejected', 'disabled'] as const;
export const SESSION_PURPOSES = ['full', 'bind_google'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type SessionPurpose = (typeof SESSION_PURPOSES)[number];

// 所有資料表都開啟 RLS 且不設 policy：Supabase 公開 API（anon／authenticated）讀寫不到；
// 程式以資料表擁有者連線，不受 RLS 限制
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** 後台使用者（院所人員） */
export const users = pgTable(
  'heal_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: text('role', { enum: USER_ROLES }).notNull().default('staff'),
    status: text('status', { enum: USER_STATUSES }).notNull().default('pending'),
    /** Google 帳號唯一 ID；最高管理者綁定前為 NULL */
    googleSub: text('google_sub').unique(),
    /** 小寫；最高管理者綁定前為 NULL */
    email: text('email').unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    reviewedBy: uuid('reviewed_by').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamptz('reviewed_at'),
    lastLoginAt: timestamptz('last_login_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('heal_users_role_check', sql`${t.role} in ('superadmin', 'admin', 'staff')`),
    check('heal_users_status_check', sql`${t.status} in ('pending', 'active', 'rejected', 'disabled')`),
    // 最高管理者只能有一位
    uniqueIndex('heal_users_one_superadmin').on(t.role).where(sql`${t.role} = 'superadmin'`),
  ],
).enableRLS();

/** 登入 session；cookie 只放隨機 token，這裡只存 SHA-256 */
export const sessions = pgTable(
  'heal_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose', { enum: SESSION_PURPOSES }).notNull().default('full'),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [
    check('heal_sessions_purpose_check', sql`${t.purpose} in ('full', 'bind_google')`),
    index('heal_sessions_user_idx').on(t.userId),
  ],
).enableRLS();

/** 每張表單的開放設定；6 筆由 migration 建立，預設關閉 */
export const formSettings = pgTable(
  'heal_form_settings',
  {
    formId: text('form_id', { enum: FORM_IDS }).primaryKey(),
    /** 開放開關 */
    isOpen: boolean('is_open').notNull().default(false),
    /** NULL：開關打開就開放 */
    opensAt: timestamptz('opens_at'),
    /** NULL：不設結束時間 */
    closesAt: timestamptz('closes_at'),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamptz('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('heal_form_settings_form_id_check', sql`${t.formId} in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult')`),
    check(
      'heal_form_settings_period_check',
      sql`${t.opensAt} is null or ${t.closesAt} is null or ${t.opensAt} < ${t.closesAt}`,
    ),
  ],
).enableRLS();

export const SUBMISSION_STATUSES = ['submitted', 'returned', 'completed', 'voided'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_ACTIONS = [
  'submitted',
  'returned',
  'resubmitted',
  'completed',
  'reopened',
  'voided',
  'restored',
] as const;
export type SubmissionAction = (typeof SUBMISSION_ACTIONS)[number];

/** 表單欄位值：文字／單選為字串，複選為字串陣列 */
export type FormValues = Record<string, string | string[]>;

/**
 * 民眾送出的表單；每次送出都是新的一筆。
 * submitted 民眾已送出／returned 民眾修改中／completed 院所已送出（鎖定）／voided 已作廢
 */
export const submissions = pgTable(
  'heal_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formId: text('form_id', { enum: FORM_IDS }).notNull(),
    status: text('status', { enum: SUBMISSION_STATUSES }).notNull(),
    /** 列表查詢用，送出時由民眾資料帶入（身分證號一律大寫） */
    idNo: text('id_no').notNull(),
    name: text('name').notNull(),
    birthDate: date('birth_date'),
    /** 民眾填寫內容（含送出當下的基本資料與簽名圖） */
    publicData: jsonb('public_data').$type<FormValues>().notNull(),
    /** 院所填寫內容 */
    staffData: jsonb('staff_data').$type<FormValues>().notNull().default({}),
    /** 民眾裝置憑證（只存 SHA-256）；持有憑證的裝置才能查看、退回修改 */
    deviceTokenHash: text('device_token_hash'),
    deviceExpiresAt: timestamptz('device_expires_at'),
    publicSubmittedAt: timestamptz('public_submitted_at').notNull(),
    staffUpdatedBy: uuid('staff_updated_by').references(() => users.id, { onDelete: 'set null' }),
    staffUpdatedAt: timestamptz('staff_updated_at'),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamptz('completed_at'),
    /** 每次修改加 1；兩人同時編輯時，後存的會被擋下 */
    version: integer('version').notNull().default(1),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('heal_submissions_form_id_check', sql`${t.formId} in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult')`),
    check('heal_submissions_status_check', sql`${t.status} in ('submitted', 'returned', 'completed', 'voided')`),
    index('heal_submissions_id_no_idx').on(t.idNo),
    index('heal_submissions_form_status_idx').on(t.formId, t.status),
    index('heal_submissions_created_idx').on(t.createdAt.desc()),
    index('heal_submissions_submitted_at_idx').on(t.publicSubmittedAt.desc()),
    index('heal_submissions_completed_at_idx').on(t.completedAt),
    index('heal_submissions_device_idx').on(t.deviceTokenHash),
  ],
).enableRLS();

/** 送出、退回修改、確認送出、取消送出、作廢、復原的紀錄；民眾操作時 actor_id 為 NULL */
export const submissionEvents = pgTable(
  'heal_submission_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    action: text('action', { enum: SUBMISSION_ACTIONS }).notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'heal_submission_events_action_check',
      sql`${t.action} in ('submitted', 'returned', 'resubmitted', 'completed', 'reopened', 'voided', 'restored')`,
    ),
    index('heal_submission_events_submission_idx').on(t.submissionId),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type FormSetting = typeof formSettings.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
