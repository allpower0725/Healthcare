import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  // 資料庫可能與其他專案共用，migration 紀錄表也加上 heal_ 前綴
  migrations: { table: 'heal_drizzle_migrations' },
  strict: true,
});
