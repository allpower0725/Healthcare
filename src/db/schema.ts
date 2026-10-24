import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
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

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** 後台使用者（院所人員） */
export const users = pgTable(
  'users',
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
    check('users_role_check', sql`${t.role} in ('superadmin', 'admin', 'staff')`),
    check('users_status_check', sql`${t.status} in ('pending', 'active', 'rejected', 'disabled')`),
    // 最高管理者只能有一位
    uniqueIndex('users_one_superadmin').on(t.role).where(sql`${t.role} = 'superadmin'`),
  ],
);

/** 登入 session；cookie 只放隨機 token，這裡只存 SHA-256 */
export const sessions = pgTable(
  'sessions',
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
    check('sessions_purpose_check', sql`${t.purpose} in ('full', 'bind_google')`),
    index('sessions_user_idx').on(t.userId),
  ],
);

/** 每張表單的開放設定；6 筆由 migration 建立，預設關閉 */
export const formSettings = pgTable(
  'form_settings',
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
    check('form_settings_form_id_check', sql`${t.formId} in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult')`),
    check(
      'form_settings_period_check',
      sql`${t.opensAt} is null or ${t.closesAt} is null or ${t.opensAt} < ${t.closesAt}`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type FormSetting = typeof formSettings.$inferSelect;
