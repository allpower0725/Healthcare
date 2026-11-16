import assert from 'node:assert/strict';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';
import { databaseSslOptions } from '../../src/db/ssl';

/** 管理帳號只維護 journal；DDL 切換成 healthcare，確保未來新增物件仍歸 schema 擁有者。 */
export async function migrateDatabase(url: string, migrationsFolder = './drizzle/heal-care', certificate = process.env.DATABASE_SSL_CA) {
  const client = postgres(url, { max: 1, onnotice: () => {}, ...databaseSslOptions(url, certificate) });
  try {
    const migrations = readMigrationFiles({ migrationsFolder });
    await client.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(20261116, 1)`;
      const [identity] = await tx`SELECT current_user AS name`;
      assert.notEqual(identity.name, 'healthcare', 'Migration 必須使用管理連線，不可使用應用程式帳號。');
      await tx`CREATE SCHEMA IF NOT EXISTS db_migrations`;
      await tx`REVOKE ALL ON SCHEMA db_migrations FROM PUBLIC`;
      await tx`CREATE TABLE IF NOT EXISTS db_migrations.healthcare (
        id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL UNIQUE
      )`;
      const applied = await tx`SELECT hash, created_at FROM db_migrations.healthcare ORDER BY created_at`;
      assert(applied.length <= migrations.length, '資料庫包含本機沒有的 migration，停止套用。');
      for (let i = 0; i < applied.length; i++) {
        assert.equal(Number(applied[i].created_at), migrations[i].folderMillis, 'Migration 順序不一致。');
        assert.equal(applied[i].hash, migrations[i].hash, '已套用 migration 不得修改，請新增 migration。');
      }
      for (const migration of migrations.slice(applied.length)) {
        await tx`SET LOCAL ROLE healthcare`;
        for (const statement of migration.sql) {
          if (statement.trim()) await tx.unsafe(statement);
        }
        await tx`RESET ROLE`;
        await tx`INSERT INTO db_migrations.healthcare (hash, created_at)
          VALUES (${migration.hash}, ${migration.folderMillis})`;
      }
    });
  } finally {
    await client.end();
  }
}
