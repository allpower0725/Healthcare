import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { type UserRole, type UserStatus, users } from '@/db/schema';

export async function resetDb() {
  await db.execute(sql`truncate table sessions, users cascade`);
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
