import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { migrateDatabase } from './lib/database-migrations';

async function main() {
  const directory = '.local/cloud-migrations/2026-11-16-heal-care';
  assert(existsSync(`${directory}/before.json`), '必須先完成雲端備份。');
  const config = parseEnv(readFileSync(`${directory}/connections.env`, 'utf8'));
  const url = config.MIGRATION_DATABASE_URL!;
  const parsed = new URL(url);
  assert.equal(parsed.hostname, 'aws-0-ap-northeast-1.pooler.supabase.com');
  assert.equal(decodeURIComponent(parsed.username), 'db_owner.tbulauezaixdjzdcqsem');
  assert.equal(parsed.pathname, '/postgres');
  await migrateDatabase(url, undefined, readFileSync(`${directory}/supabase-ca.crt`, 'utf8'));
  console.log('Supabase 新 baseline 完成；舊 public 資料與正式站連線尚未切換。');
}
main().catch((error) => {
  console.error(`雲端 baseline 失敗（${error.code ?? error.name}），交易已回復。`);
  process.exitCode = 1;
});
