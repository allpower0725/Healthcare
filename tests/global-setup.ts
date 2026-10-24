import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// 測試前把 drizzle/ 的 migration 套到測試資料庫
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgres://healthcare:healthcare@localhost:5433/healthcare_test';
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  } finally {
    await client.end();
  }
}
