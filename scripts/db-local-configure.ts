import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { loadEnvConfig } from '@next/env';

const directory = '.local/database';
loadEnvConfig(process.cwd(), true);
mkdirSync(`${directory}/secrets`, { recursive: true });
assert(!existsSync(`${directory}/connections.env`), '本機設定已存在，停止以免覆蓋密碼。');
for (const role of ['db_owner', 'healthcare']) {
  const path = `${directory}/secrets/${role}_password`;
  assert(!existsSync(path), '密碼檔已存在，停止以免覆蓋。');
  writeFileSync(path, randomBytes(32).toString('base64url') + '\n', { mode: 0o600, flag: 'wx' });
}
const password = (role: string) => readFileSync(`${directory}/secrets/${role}_password`, 'utf8').trim();
const url = (role: string, database: string) =>
  `postgres://${role}:${password(role)}@localhost:5432/${database}`;
const config = {
  DATABASE_URL: url('healthcare', 'wjcch_db'),
  MIGRATION_DATABASE_URL: url('db_owner', 'wjcch_db'),
  TEST_DATABASE_URL: url('healthcare', 'wjcch_db_test'),
  TEST_MIGRATION_DATABASE_URL: url('db_owner', 'wjcch_db_test'),
};
writeFileSync(`${directory}/connections.env`, Object.entries(config).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
// 只保存舊本機來源；不將雲端憑證複製到搬移設定。
const source = process.env.DATABASE_URL;
if (source) {
  const parsed = new URL(source);
  if (['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === '5433') {
    const sourceTest = new URL(source);
    sourceTest.pathname = '/wjcch_test';
    writeFileSync(`${directory}/source.env`, `SOURCE_DATABASE_URL=${source}\nSOURCE_TEST_DATABASE_URL=${process.env.TEST_DATABASE_URL ?? sourceTest.href}\n`, { mode: 0o600, flag: 'wx' });
  }
}
assert.equal(parseEnv(readFileSync(`${directory}/connections.env`, 'utf8')).DATABASE_URL, config.DATABASE_URL);
console.log('已產生兩組獨立隨機密碼與 .local/database/connections.env；尚未切換應用程式連線。');
