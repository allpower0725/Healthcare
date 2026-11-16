import { migrateDatabase } from '../scripts/lib/database-migrations';

// 測試前套新 baseline；不以應用程式連線建立管理紀錄。
export default async function setup() {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!url) throw new Error('TEST_MIGRATION_DATABASE_URL 未設定');
  const parsed = new URL(url);
  if (parsed.pathname !== '/wjcch_db_test' || !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('Migration 測試只允許本機 wjcch_db_test。');
  }
  await migrateDatabase(url);
}
