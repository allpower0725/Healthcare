import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle/heal-care',
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL! },
  // 管理紀錄由管理帳號擁有，與九張應用資料表分開。
  migrations: { schema: 'db_migrations', table: 'healthcare' },
  strict: true,
});
