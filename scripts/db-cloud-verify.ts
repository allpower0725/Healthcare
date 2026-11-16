import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
import { TABLES, digest, structure, tableRows } from './lib/local-database';
import { databaseSslOptions } from '../src/db/ssl';

async function main() {
  const directory = '.local/cloud-migrations/2026-11-16-heal-care';
  const config = parseEnv(readFileSync(`${directory}/connections.env`, 'utf8'));
  const before = JSON.parse(readFileSync(`${directory}/before.json`, 'utf8'));
  const after = process.argv.includes('--after');
  const app = postgres(config.DATABASE_URL!, { prepare: false, max: 1, connection: { TimeZone: 'UTC' },
    ...databaseSslOptions(config.DATABASE_URL!, readFileSync(`${directory}/supabase-ca.crt`, 'utf8')) });
  const hashes: Record<string, unknown> = {};
  try {
    const [role] = await app`SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      FROM pg_roles WHERE rolname=current_user`;
    assert.equal(role.name, 'healthcare');
    for (const key of ['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls']) assert.equal(role[key], false);
    const objects = await app`SELECT tablename, tableowner, rowsecurity FROM pg_tables WHERE schemaname='heal_care'`;
    assert.deepEqual(objects.map((row) => row.tablename).sort(), [...TABLES].sort());
    for (const object of objects) { assert.equal(object.tableowner, 'healthcare'); assert.equal(object.rowsecurity, true); }
    const [access] = await app`SELECT has_schema_privilege(current_user,'public','CREATE') AS public_create,
      has_schema_privilege(current_user,'db_migrations','USAGE') AS migration_access`;
    assert.equal(access.public_create, false);
    assert.equal(access.migration_access, false);
    for (const table of TABLES) {
      assert.deepEqual(await structure(app, 'heal_care', table), before.tables[table].structure, `${table} 結構不一致。`);
      if (after) {
        const rows = await tableRows(app, 'heal_care', table);
        assert.equal(rows.length, before.tables[table].count, `${table} 筆數不一致。`);
        assert.equal(digest(rows), before.tables[table].sha256, `${table} 雜湊不一致。`);
        hashes[table] = { count: rows.length, sha256: digest(rows) };
      }
    }
    for (const statement of ['SET ROLE db_owner', 'CREATE SCHEMA permission_probe',
      'CREATE TABLE public.permission_probe (id integer)', 'SELECT * FROM db_migrations.healthcare', 'SELECT * FROM auth.users']) {
      let code: string | undefined;
      try { await app.begin(async (tx) => { await tx.unsafe(statement); throw new Error('UNEXPECTED_PERMISSION'); }); }
      catch (error) { code = (error as { code?: string }).code; }
      assert.equal(code, '42501', '應用帳號的越權操作必須被拒絕。');
    }
    try {
      await app.begin(async (tx) => {
        await tx`CREATE TABLE heal_care.permission_probe (id integer PRIMARY KEY)`;
        await tx`INSERT INTO heal_care.permission_probe VALUES (1)`;
        await tx`ALTER TABLE heal_care.permission_probe ADD COLUMN value text`;
        await tx`UPDATE heal_care.permission_probe SET value='probe'`;
        await tx`DELETE FROM heal_care.permission_probe`;
        await tx`DROP TABLE heal_care.permission_probe`;
        throw new Error('ROLLBACK_PROBE');
      });
    } catch (error) { assert.equal((error as Error).message, 'ROLLBACK_PROBE'); }
    writeFileSync(`${directory}/${after ? 'after' : 'provision-verification'}.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), role: 'healthcare', tls: 'official CA, rejectUnauthorized=true', tables: hashes, permissions: 'schema owner DDL/DML allowed; cross-schema and role escalation denied' }, null, 2) + '\n');
    console.log(`Supabase healthcare 權限、RLS、九表結構${after ? '、逐表資料筆數及 SHA-256' : ''}全部通過。`);
  } finally { await app.end(); }
}
main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : `雲端驗證失敗（${error.code ?? error.name}）。`);
  process.exitCode = 1;
});
