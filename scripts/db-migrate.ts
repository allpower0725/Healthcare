import { loadEnvConfig } from '@next/env';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { migrateDatabase } from './lib/database-migrations';

async function main() {
  const local = process.argv.includes('--local');
  const test = process.argv.includes('--test');
  loadEnvConfig(process.cwd());
  const key = test ? 'TEST_MIGRATION_DATABASE_URL' : 'MIGRATION_DATABASE_URL';
  const appKey = test ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  const saved = existsSync('.local/database/connections.env')
    ? parseEnv(readFileSync('.local/database/connections.env', 'utf8')) : {};
  // 管理密碼不放進 Next runtime 的 .env。只有端點完全吻合才使用本機維護檔。
  const config = local || (!process.env[key] && saved[appKey] === process.env[appKey]) ? saved : process.env;
  const url = config[key];
  if (!url) throw new Error(`${key} 未設定；管理帳號與 DATABASE_URL 必須分開。`);
  await migrateDatabase(url);
  console.log(`${test ? '測試庫' : '主庫'} migration 完成。`);
}

main().catch((error) => {
  console.error(`Migration 失敗（${error.code ?? error.name}）：請確認管理連線、schema／角色初始化與 migration 檔案；交易已回復。`);
  process.exitCode = 1;
});
