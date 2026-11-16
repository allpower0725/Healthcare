import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { TABLES } from './lib/local-database';

const directory = '.local/cloud-migrations/2026-11-16-heal-care';
const before = JSON.parse(readFileSync(`${directory}/before.json`, 'utf8'));
assert.equal(before.project, 'tbulauezaixdjzdcqsem');
const sql = [
  "SET LOCAL lock_timeout = '10s';",
  "SET LOCAL statement_timeout = '60s';",
  "SET LOCAL TIME ZONE 'UTC';",
  'SET LOCAL ROLE healthcare;',
  'GRANT USAGE, CREATE ON SCHEMA heal_care TO postgres;',
  'GRANT ALL ON ALL TABLES IN SCHEMA heal_care TO postgres;',
  'GRANT ALL ON ALL SEQUENCES IN SCHEMA heal_care TO postgres;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA heal_care GRANT ALL ON TABLES TO postgres;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA heal_care GRANT ALL ON SEQUENCES TO postgres;',
  'RESET ROLE;',
  "SELECT cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname='wjcch-appointment-notices-hourly';",
  `LOCK TABLE ${TABLES.flatMap((table) => [`public.heal_${table}`, `heal_care.${table}`]).join(', ')} IN ACCESS EXCLUSIVE MODE;`,
  // 備份後若有新增、修改或刪除，一律停止，先重做備份。
  ...TABLES.map((table) => `DO $check$ DECLARE actual text; BEGIN
    SELECT encode(extensions.digest(coalesce(string_agg(data, E'\\n' ORDER BY data COLLATE "C"), ''), 'sha256'), 'hex') INTO actual
      FROM (SELECT to_jsonb(t)::text AS data FROM public.heal_${table} t) rows;
    IF actual <> '${before.tables[table].sha256}' THEN RAISE EXCEPTION 'Source changed since backup: ${table}'; END IF;
  END $check$;`),
  `TRUNCATE ${TABLES.map((table) => `heal_care.${table}`).join(', ')};`,
  ...TABLES.map((table) => {
    const names = before.tables[table].structure.columns.map((column: { column_name: string }) => `"${column.column_name}"`).join(', ');
    return `INSERT INTO heal_care.${table} (${names}) OVERRIDING SYSTEM VALUE SELECT ${names} FROM public.heal_${table};`;
  }),
  `SELECT setval('heal_care.submission_events_id_seq', last_value, is_called) FROM public.heal_submission_events_id_seq;`,
  ...TABLES.map((table) => `DO $check$ DECLARE actual text; BEGIN
    SELECT encode(extensions.digest(coalesce(string_agg(data, E'\\n' ORDER BY data COLLATE "C"), ''), 'sha256'), 'hex') INTO actual
      FROM (SELECT to_jsonb(t)::text AS data FROM heal_care.${table} t) rows;
    IF actual <> '${before.tables[table].sha256}' THEN RAISE EXCEPTION 'Copy verification failed: ${table}'; END IF;
  END $check$;`),
  'ALTER ROLE his_user NOLOGIN;',
  'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM his_user;',
  'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM his_user;',
  'REVOKE CONNECT ON DATABASE postgres FROM his_user;',
  'DROP POLICY IF EXISTS his_user_select ON public.heal_submissions;',
  'DROP POLICY IF EXISTS his_user_update ON public.heal_submissions;',
  // 舊站已發出的請求也不能在複製完成後偷偷寫回舊庫。
  'SET LOCAL ROLE db_owner;',
  `CREATE FUNCTION db_migrations.reject_legacy_writes() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO pg_catalog
    AS $body$ BEGIN RAISE EXCEPTION '資料庫已完成切換，請重新整理頁面後重試；已填內容請保留。' USING ERRCODE = '55000'; END $body$;`,
  'REVOKE ALL ON FUNCTION db_migrations.reject_legacy_writes() FROM PUBLIC;',
  'GRANT USAGE ON SCHEMA db_migrations TO postgres;',
  'GRANT EXECUTE ON FUNCTION db_migrations.reject_legacy_writes() TO postgres;',
  'RESET ROLE;',
  ...TABLES.flatMap((table) => [
    `CREATE TRIGGER reject_legacy_writes BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.heal_${table} FOR EACH STATEMENT EXECUTE FUNCTION db_migrations.reject_legacy_writes();`,
    `DROP POLICY db_owner_backup_select ON public.heal_${table};`,
    `REVOKE SELECT ON public.heal_${table} FROM db_owner;`,
  ]),
  'REVOKE SELECT ON drizzle.heal_drizzle_migrations FROM db_owner;',
  'REVOKE SELECT ON ALL SEQUENCES IN SCHEMA public, drizzle FROM db_owner;',
  'REVOKE USAGE ON SCHEMA public, drizzle FROM db_owner;',
  // 舊資料封存到不公開的 schema，保留回復證據，不留下另一個 public 寫入入口。
  'SET LOCAL ROLE db_owner;',
  'CREATE SCHEMA heal_care_legacy_20261116 AUTHORIZATION db_owner;',
  'REVOKE ALL ON SCHEMA heal_care_legacy_20261116 FROM PUBLIC, anon, authenticated, service_role, healthcare, his_user;',
  'GRANT USAGE, CREATE ON SCHEMA heal_care_legacy_20261116 TO postgres;',
  'RESET ROLE;',
  ...TABLES.flatMap((table) => [
    `ALTER TABLE public.heal_${table} SET SCHEMA heal_care_legacy_20261116;`,
    `ALTER TABLE heal_care_legacy_20261116.heal_${table} OWNER TO db_owner;`,
  ]),
  'SET LOCAL ROLE db_owner;',
  'REVOKE ALL ON ALL TABLES IN SCHEMA heal_care_legacy_20261116 FROM PUBLIC, anon, authenticated, service_role, healthcare, his_user;',
  'REVOKE ALL ON ALL SEQUENCES IN SCHEMA heal_care_legacy_20261116 FROM PUBLIC, anon, authenticated, service_role, healthcare, his_user;',
  'RESET ROLE;',
  'NOTIFY pgrst, \'reload schema\';',
];
writeFileSync(`${directory}/cutover.sql`, sql.join('\n') + '\n');
const rollback = [
  '-- 只限新正式站尚未接受任何寫入時使用。已上線後須先比對並回搬新寫入，不可直接回復快照。',
  "SET LOCAL lock_timeout = '10s';",
  'GRANT db_owner TO postgres WITH INHERIT TRUE;',
  ...TABLES.flatMap((table) => [
    `ALTER TABLE heal_care_legacy_20261116.heal_${table} OWNER TO postgres;`,
    `ALTER TABLE heal_care_legacy_20261116.heal_${table} SET SCHEMA public;`,
    `DROP TRIGGER reject_legacy_writes ON public.heal_${table};`,
  ]),
  'GRANT db_owner TO postgres WITH INHERIT FALSE;',
  "SELECT cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname='wjcch-appointment-notices-hourly';",
  '-- his_user 依使用者要求保持停用。新 heal_care 保留供核對；舊 deployment 仍保有舊管理連線快照。',
].join('\n');
writeFileSync(`${directory}/rollback-before-release.sql`, rollback + '\n');
console.log('已準備原子搬移、雜湊核對、舊整合停用與舊表防寫入 SQL；尚未套用。');
