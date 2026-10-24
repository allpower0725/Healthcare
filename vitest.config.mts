import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://healthcare:healthcare@localhost:5433/healthcare_test';

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
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ['./tests/global-setup.ts'],
    // 測試共用同一個資料庫，逐檔執行避免互相清掉資料
    fileParallelism: false,
  },
});
