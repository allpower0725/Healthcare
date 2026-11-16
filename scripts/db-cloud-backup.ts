import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
import { TABLES, digest, structure, tableRows } from './lib/local-database';

async function main() {
  const directory = '.local/cloud-migrations/2026-11-16-heal-care';
  const config = parseEnv(readFileSync(`${directory}/connections.env`, 'utf8'));
  const url = new URL(config.MIGRATION_DATABASE_URL!);
  assert.equal(url.hostname, 'aws-0-ap-northeast-1.pooler.supabase.com');
  assert.equal(decodeURIComponent(url.username), 'db_owner.tbulauezaixdjzdcqsem');
  assert.equal(url.pathname, '/postgres');
  const ca = readFileSync(`${directory}/supabase-ca.crt`, 'utf8');
  const sql = postgres(url.href, { prepare: false, max: 1, ssl: { ca, rejectUnauthorized: true }, connection: { TimeZone: 'UTC' } });
  const tables: Record<string, unknown> = {};
  const backupDirectory = resolve('.local/db-backups/2026-11-16-supabase-heal-care');
  mkdirSync(backupDirectory, { recursive: true });
  try {
    await sql.begin('isolation level repeatable read', async (tx) => {
      // 一致性 snapshot 不阻擋正式站寫入；最終切換會另鎖來源並重核資料。
      const [snapshot] = await tx`SELECT pg_export_snapshot() AS value`;
      for (const table of TABLES) {
        const rows = await tableRows(tx, 'public', `heal_${table}`);
        tables[table] = { count: rows.length, sha256: digest(rows), structure: await structure(tx, 'public', `heal_${table}`) };
      }
      const certCopy = spawnSync('docker', ['cp', `${directory}/supabase-ca.crt`, 'wjcch:/tmp/supabase-ca.crt'], { encoding: 'utf8' });
      assert.equal(certCopy.status, 0, 'CA 憑證準備失敗，未切換。');
      const result = spawnSync('docker', ['exec', '--env', 'PGPASSWORD', '--env', 'PGSSLMODE=verify-full', '--env', 'PGSSLROOTCERT=/tmp/supabase-ca.crt',
        'wjcch', 'pg_dump', '--host', url.hostname, '--port', url.port, '--username', decodeURIComponent(url.username),
        '--dbname', 'postgres', '--format=custom', '--enable-row-security', `--snapshot=${snapshot.value}`,
        '--table=public.heal_*', '--table=drizzle.heal_drizzle_migrations', '--file=/tmp/supabase-heal-care-before.dump'],
      { encoding: 'utf8', env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } });
      if (result.status !== 0) writeFileSync(`${directory}/backup-error.log`, result.stderr || result.error?.message || 'Docker failed');
      assert.equal(result.status, 0, '雲端備份失敗，未切換；請檢查本機 backup-error.log。');
      const copy = spawnSync('docker', ['cp', 'wjcch:/tmp/supabase-heal-care-before.dump', `${backupDirectory}/database.dump`], { encoding: 'utf8' });
      assert.equal(copy.status, 0, '備份下載失敗，未切換。');
      const [sequence] = await tx`SELECT last_value::text AS value, is_called FROM public.heal_submission_events_id_seq`;
      writeFileSync(`${directory}/before.json`, JSON.stringify({ project: 'tbulauezaixdjzdcqsem', createdAt: new Date().toISOString(), tables, sequence, backup: `${backupDirectory}/database.dump` }, null, 2) + '\n');
    });
    console.log('雲端九表整庫格式備份已下載，欄位／限制／索引、各表筆數及 SHA-256 已保存；未變更資料。');
  } finally { await sql.end(); }
}
main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : `雲端備份失敗（${error.code ?? error.name}），未切換。`);
  process.exitCode = 1;
});
