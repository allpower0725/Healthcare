import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { TABLES, columns, digest, localConfig, requireLocal, sourceConfig, structure, tableRows } from './lib/local-database';

async function main() {
  const test = process.argv.includes('--test');
  const label = test ? 'test' : 'main';
  const reportPath = `.local/database/copy-${label}.json`;
  assert(!existsSync(reportPath), '此資料庫已搬移過，禁止覆寫；請查閱既有核對紀錄。');
  const config = localConfig();
  const sources = sourceConfig();
  const sourceName = test ? 'wjcch_test' : 'wjcch';
  const targetName = test ? 'wjcch_db_test' : 'wjcch_db';
  const sourceUrl = sources[test ? 'SOURCE_TEST_DATABASE_URL' : 'SOURCE_DATABASE_URL'];
  const targetUrl = config[test ? 'TEST_MIGRATION_DATABASE_URL' : 'MIGRATION_DATABASE_URL'];
  requireLocal(sourceUrl, '5433', sourceName);
  requireLocal(targetUrl, '5432', targetName);
  const options = { max: 1, onnotice: () => {}, connection: { TimeZone: 'UTC' } };
  const source = postgres(sourceUrl, options);
  const target = postgres(targetUrl, options);
  const report: Record<string, unknown> = { source: sourceName, target: targetName, createdAt: new Date().toISOString(), tables: {} };
  try {
    // SHARE lock 阻擋搬移期間的新寫入；來源不執行 INSERT/UPDATE/DELETE 或 DDL。
    await source.begin('isolation level repeatable read', async (src) => {
      await src.unsafe(`LOCK TABLE ${TABLES.map((name) => `public.heal_${name}`).join(', ')} IN SHARE MODE`);
      for (const table of TABLES) {
        assert.deepEqual(await structure(target, 'heal_care', table), await structure(src, 'public', `heal_${table}`), `${table} 的欄位、限制或索引不一致，停止搬移。`);
      }
      // 使用同一 snapshot 建立整庫備份；不把資料或連線密碼寫入日誌。
      const [{ snapshot }] = await src`SELECT pg_export_snapshot() AS snapshot`;
      const directory = resolve(`.local/db-backups/2026-11-16-heal-care/${label}`);
      mkdirSync(directory, { recursive: true });
      const dump = `/tmp/healthcare-${label}-${Date.now()}.dump`;
      for (const args of [
        ['exec', 'healthcare-db', 'pg_dump', '-U', 'healthcare', '-d', sourceName, '-Fc', `--snapshot=${snapshot}`, `--file=${dump}`],
        ['cp', `healthcare-db:${dump}`, `${directory}/database.dump`],
      ]) {
        const result = spawnSync('docker', args, { encoding: 'utf8' });
        if (result.status !== 0) writeFileSync('.local/database/backup-error.log', result.stderr || result.error?.message || 'Docker failed');
        assert.equal(result.status, 0, '整庫備份失敗，未搬移資料；請檢查 Docker 與備份目錄。');
      }
      report.backup = `${directory}/database.dump`;
      await target.begin(async (dst) => {
        // 只允許剛套 baseline 的新庫；既有業務資料一律停止，避免覆寫。
        for (const table of TABLES) {
          const rows = await tableRows(dst, 'heal_care', table);
          assert.equal(rows.length, table === 'form_settings' ? 7 : table === 'appointment_settings' ? 1 : 0,
            '目標不是 baseline 初始狀態，拒絕覆寫。');
        }
        const settings = await dst`SELECT * FROM heal_care.form_settings WHERE is_open OR opens_at IS NOT NULL OR closes_at IS NOT NULL OR updated_by IS NOT NULL`;
        const appointmentSettings = await dst`SELECT * FROM heal_care.appointment_settings WHERE is_open OR recipients <> '{}'::text[] OR closed_dates <> '{}'::date[] OR booking_min_days <> 15 OR booking_max_days <> 90 OR updated_by IS NOT NULL`;
        assert.equal(settings.length + appointmentSettings.length, 0, '目標設定已異動，拒絕覆寫。');
        await dst.unsafe(`TRUNCATE ${TABLES.map((name) => `heal_care.${name}`).join(', ')}`);
        for (const table of TABLES) {
          const rows = await tableRows(src, 'public', `heal_${table}`);
          const names = (await columns(src, 'public', `heal_${table}`)).map((row) => `"${row.column_name}"`).join(', ');
          // PostgreSQL 自行轉型，避免 JS 對 bigint 或微秒時間精度造成資料損失。
          for (let start = 0; start < rows.length; start += 100) {
            const json = `[${rows.slice(start, start + 100).join(',')}]`;
            await dst.unsafe(`INSERT INTO heal_care.${table} (${names}) OVERRIDING SYSTEM VALUE
              SELECT ${names} FROM jsonb_populate_recordset(NULL::heal_care.${table}, $1::text::jsonb)`, [json]);
          }
          const copied = await tableRows(dst, 'heal_care', table);
          assert.equal(copied.length, rows.length, `${table} 筆數不一致。`);
          assert.equal(digest(copied), digest(rows), `${table} 資料雜湊不一致。`);
          (report.tables as Record<string, unknown>)[table] = { count: rows.length, sha256: digest(rows) };
        }
        const [sequence] = await src`SELECT last_value::text AS value, is_called FROM public.heal_submission_events_id_seq`;
        await dst`SELECT setval('heal_care.submission_events_id_seq', ${sequence.value}::bigint, ${sequence.is_called})`;
        report.sequence = sequence;
      });
    });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(`${label}：整庫備份完成，九張表的欄位／限制／索引、資料筆數與 SHA-256 核對一致；identity sequence 已保留。`);
  } finally {
    await Promise.all([source.end(), target.end()]);
  }
}

main().catch((error) => {
  // pg 的錯誤 detail 可能含資料列，不直接輸出。
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : `本機搬移失敗（${error.code ?? error.name}），目標資料交易已回復。`);
  process.exitCode = 1;
});
