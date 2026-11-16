import assert from 'node:assert/strict';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const connections = parseEnv(readFileSync('.local/database/connections.env', 'utf8'));
const config = { DATABASE_URL: connections.DATABASE_URL!, TEST_DATABASE_URL: connections.TEST_DATABASE_URL! };
assert(existsSync('.local/database/verification.json'), '尚未完成權限驗證。');
const verification = JSON.parse(readFileSync('.local/database/verification.json', 'utf8'));
if (process.argv.includes('--fresh')) {
  assert.equal(verification.mode, 'fresh', '請先完成全新空庫驗證。');
} else {
  assert(existsSync('.local/database/copy-main.json') && existsSync('.local/database/copy-test.json'), '兩庫尚未完成搬移與核對。');
  assert.equal(verification.mode, 'copy', '請先完成搬移資料核對。');
}
// Next 的較高優先順序檔案不能暗中覆蓋 .env 新連線。
for (const file of ['.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local', '.env.test', '.env.test.local']) {
  if (!existsSync(file)) continue;
  const values = parseEnv(readFileSync(file, 'utf8'));
  assert(!Object.keys(connections).some((key) => key in values), `${file} 含有資料庫覆寫，請先整理再切換。`);
}
let content = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
assert(!existsSync('.local/database/env-before-activation'), '已保存切換紀錄，停止以免重複切換。');
if (existsSync('.env')) copyFileSync('.env', '.local/database/env-before-activation');
content = content.replace(/^(?:TEST_)?MIGRATION_DATABASE_URL=.*\r?\n?/gm, '');
for (const [key, value] of Object.entries(config)) {
  const line = new RegExp(`^${key}=.*$`, 'm');
  content = line.test(content) ? content.replace(line, `${key}=${value}`) : `${content.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync('.env', content, { mode: 0o600 });
console.log('已切換 .env 至新本機資料庫；請重新啟動應用程式，舊連線存於 .local/database/env-before-activation。');
