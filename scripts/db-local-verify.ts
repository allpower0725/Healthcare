import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';
import { TABLES, digest, localConfig, requireLocal, sourceConfig, structure, tableRows } from './lib/local-database';

async function denied(url: string, statement: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  let code: string | undefined;
  try {
    await client.begin(async (tx) => {
      await tx.unsafe(statement);
      // 若意外允許，仍強制 rollback，不留下權限探測物件。
      throw new Error('UNEXPECTED_PERMISSION');
    });
  } catch (error) {
    code = (error as { code?: string }).code;
  } finally {
    await client.end();
  }
  assert.equal(code, '42501', `應拒絕的操作沒有回覆 insufficient_privilege：${statement}`);
}

async function main() {
  const config = localConfig();
  const fresh = process.argv.includes('--fresh');
  if (fresh) assert(!existsSync('.local/database/source.env'), '存在舊本機來源時必須走保留資料的搬移流程。');
  const sources = fresh ? {} : sourceConfig();
  const checks: string[] = [];
  for (const test of [false, true]) {
    const name = test ? 'wjcch_db_test' : 'wjcch_db';
    const appUrl = config[test ? 'TEST_DATABASE_URL' : 'DATABASE_URL'];
    const adminUrl = config[test ? 'TEST_MIGRATION_DATABASE_URL' : 'MIGRATION_DATABASE_URL'];
    requireLocal(appUrl, '5432', name);
    requireLocal(adminUrl, '5432', name);
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {}, connection: { TimeZone: 'UTC' } });
    const app = postgres(appUrl, { max: 1, onnotice: () => {} });
    try {
      const [role] = await app`SELECT current_user, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
        FROM pg_roles WHERE rolname = current_user`;
      assert.equal(role.current_user, 'healthcare');
      for (const key of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolreplication', 'rolbypassrls']) assert.equal(role[key], false);
      const objects = await admin`SELECT c.relname, c.relkind, c.relrowsecurity, pg_get_userbyid(c.relowner) AS owner
        FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'heal_care' AND c.relkind IN ('r', 'S') ORDER BY c.relname`;
      assert.deepEqual(objects.filter((row) => row.relkind === 'r').map((row) => row.relname).sort(), [...TABLES].sort());
      for (const object of objects) {
        assert.equal(object.owner, 'healthcare');
        if (object.relkind === 'r') assert.equal(object.relrowsecurity, true);
      }
      const [schema] = await admin`SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = 'heal_care'`;
      assert.equal(schema.owner, 'healthcare');
      const [database] = await admin`SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = current_database()`;
      assert.equal(database.owner, 'db_owner');
      // 成功路徑也用真實 app 連線驗證，最後 rollback。
      try {
        await app.begin(async (tx) => {
          await tx`CREATE TABLE heal_care.permission_probe (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, value text)`;
          await tx`INSERT INTO heal_care.permission_probe (value) VALUES ('probe')`;
          await tx`UPDATE heal_care.permission_probe SET value = 'updated'`;
          assert.equal((await tx`SELECT value FROM heal_care.permission_probe`)[0].value, 'updated');
          await tx`ALTER TABLE heal_care.permission_probe ADD COLUMN extra text`;
          await tx`DELETE FROM heal_care.permission_probe`;
          await tx`DROP TABLE heal_care.permission_probe`;
          throw new Error('ROLLBACK_PROBE');
        });
      } catch (error) {
        assert.equal((error as Error).message, 'ROLLBACK_PROBE');
      }
      for (const statement of [
        'CREATE SCHEMA permission_probe',
        'CREATE TABLE public.permission_probe (id integer)',
        'CREATE TEMP TABLE permission_probe (id integer)',
        'CREATE ROLE permission_probe',
        'SET ROLE db_owner',
        'ALTER ROLE healthcare BYPASSRLS',
        'SELECT * FROM db_migrations.healthcare',
      ]) await denied(appUrl, statement);
      const other = new URL(appUrl);
      other.pathname = '/postgres';
      await denied(other.href, 'SELECT 1');
      // 測試公開角色即使獲得 USAGE/SELECT 仍被 RLS 擋住；角色與授權全部 rollback。
      try {
        await admin.begin(async (tx) => {
          await tx`CREATE ROLE permission_probe NOLOGIN`;
          await tx`GRANT USAGE ON SCHEMA heal_care TO permission_probe`;
          await tx`GRANT SELECT ON ALL TABLES IN SCHEMA heal_care TO permission_probe`;
          await tx`SET LOCAL ROLE permission_probe`;
          for (const table of TABLES) assert.equal((await tx.unsafe(`SELECT count(*)::int AS count FROM heal_care.${table}`))[0].count, 0);
          throw new Error('ROLLBACK_PROBE');
        });
      } catch (error) {
        assert.equal((error as Error).message, 'ROLLBACK_PROBE');
      }
      if (!test && !fresh) {
        requireLocal(sources.SOURCE_DATABASE_URL, '5433', 'wjcch');
        const source = postgres(sources.SOURCE_DATABASE_URL, { max: 1, connection: { TimeZone: 'UTC' } });
        try {
          for (const table of TABLES) {
            assert.deepEqual(await structure(admin, 'heal_care', table), await structure(source, 'public', `heal_${table}`), `${table} 結構不同。`);
            assert.equal(digest(await tableRows(admin, 'heal_care', table)), digest(await tableRows(source, 'public', `heal_${table}`)), `${table} 資料不同。`);
          }
        } finally { await source.end(); }
      }
      checks.push(`${name}: ownership, RLS, schema DDL/DML, cross-schema/admin access denied${test || fresh ? '' : ', source data/structure equal'}`);
    } finally { await Promise.all([admin.end(), app.end()]); }
  }
  writeFileSync('.local/database/verification.json', JSON.stringify({ mode: fresh ? 'fresh' : 'copy', verifiedAt: new Date().toISOString(), checks }, null, 2) + '\n');
  console.log(`兩庫權限與 RLS${fresh ? '' : '、主庫來源資料核對'}通過；healthcare 可管理 heal_care，無法操作 public、管理紀錄或提升權限。`);
}

main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : `本機驗證失敗（${error.code ?? error.name}）。`);
  process.exitCode = 1;
});
