import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { formSettings, type UserRole, type UserStatus, users } from '@/db/schema';
import { FORM_IDS } from '@/lib/forms/catalog';

export async function resetDb() {
  await db.execute(sql`truncate table heal_submission_events, heal_submissions, heal_sessions, heal_users, heal_form_settings cascade`);
  // 與 migration 相同：6 張表單各一筆，預設關閉
  await db.insert(formSettings).values(FORM_IDS.map((formId) => ({ formId })));
}

let seq = 0;

/** 建立測試用使用者，預設為已啟用的 staff */
export async function createUser(fields: { role?: UserRole; status?: UserStatus; name?: string } = {}) {
  seq += 1;
  const [user] = await db
    .insert(users)
    .values({
      role: fields.role ?? 'staff',
      status: fields.status ?? 'active',
      name: fields.name ?? `測試人員${seq}`,
      googleSub: `sub-${seq}-${Date.now()}`,
      email: `user${seq}-${Date.now()}@example.com`,
    })
    .returning();
  return user;
}

export function googleIdentity(n: number | string) {
  return {
    sub: `google-${n}`,
    email: `Person${n}@Example.com`,
    name: `Google 使用者 ${n}`,
    picture: `https://example.com/${n}.png`,
  };
}
