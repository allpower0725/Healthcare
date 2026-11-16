import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd(), false);

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL;
const maintenance = existsSync('.local/database/connections.env')
  ? parseEnv(readFileSync('.local/database/connections.env', 'utf8')) : {};
const TEST_MIGRATION_DATABASE_URL = process.env.TEST_MIGRATION_DATABASE_URL ??
  (maintenance.TEST_DATABASE_URL === TEST_DATABASE_URL ? maintenance.TEST_MIGRATION_DATABASE_URL : undefined);
if (!TEST_DATABASE_URL || !TEST_MIGRATION_DATABASE_URL) {
  throw new Error('請設定專用的 TEST_DATABASE_URL 與 TEST_MIGRATION_DATABASE_URL。');
}
const testUrl = new URL(TEST_DATABASE_URL);
const maintenanceUrl = new URL(TEST_MIGRATION_DATABASE_URL);
if (testUrl.pathname !== '/wjcch_db_test' || !['localhost', '127.0.0.1'].includes(testUrl.hostname)) {
  throw new Error('測試會清除資料，只允許本機 wjcch_db_test。');
}
if (maintenanceUrl.host !== testUrl.host || maintenanceUrl.pathname !== testUrl.pathname) {
  throw new Error('測試管理連線與測試應用連線必須指向同一本機資料庫。');
}
// 只在測試行程載入維護憑證，讓 globalSetup 能維護 journal。
process.env.TEST_MIGRATION_DATABASE_URL = TEST_MIGRATION_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // server-only 在 Next 以外的環境會直接丟錯，測試時換成空模組
      'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    env: { DATABASE_URL: TEST_DATABASE_URL, TEST_MIGRATION_DATABASE_URL },
    globalSetup: ['./tests/global-setup.ts'],
    // 測試共用同一個資料庫，逐檔執行避免互相清掉資料
    fileParallelism: false,
  },
});
