import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import postgres from 'postgres';
import { afterAll, expect, test } from 'vitest';
import { migrateDatabase } from '../scripts/lib/database-migrations';

const url = process.env.TEST_MIGRATION_DATABASE_URL!;
const admin = postgres(url, { max: 1, onnotice: () => {} });
afterAll(() => admin.end());

test('重跑 migration 不改變 journal，已套用 SQL 的雜湊變動會被拒絕', async () => {
  const before = [...await admin`SELECT * FROM db_migrations.healthcare ORDER BY id`];
  await migrateDatabase(url);
  expect([...await admin`SELECT * FROM db_migrations.healthcare ORDER BY id`]).toEqual(before);
  try {
    await admin`UPDATE db_migrations.healthcare SET hash = 'tampered' WHERE id = ${before[0].id}`;
    await expect(migrateDatabase(url)).rejects.toThrow('已套用 migration 不得修改');
  } finally {
    await admin`UPDATE db_migrations.healthcare SET hash = ${before[0].hash} WHERE id = ${before[0].id}`;
  }
});

test('失敗的新增 migration 會一起回復 DDL 及 journal', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'healthcare-migrations-'));
  try {
    mkdirSync(join(directory, 'meta'));
    const journal = JSON.parse(readFileSync('drizzle/heal-care/meta/_journal.json', 'utf8'));
    for (const entry of journal.entries) copyFileSync(`drizzle/heal-care/${entry.tag}.sql`, join(directory, `${entry.tag}.sql`));
    journal.entries.push({ idx: journal.entries.length, version: '7', when: journal.entries.at(-1).when + 1, tag: 'rollback_probe', breakpoints: true });
    writeFileSync(join(directory, 'meta/_journal.json'), JSON.stringify(journal));
    writeFileSync(join(directory, 'rollback_probe.sql'), 'CREATE TABLE heal_care.migration_rollback_probe (id integer);\n--> statement-breakpoint\nSELECT 1 / 0;');
    const before = [...await admin`SELECT * FROM db_migrations.healthcare ORDER BY id`];
    await expect(migrateDatabase(url, directory)).rejects.toMatchObject({ code: '22012' });
    expect((await admin`SELECT to_regclass('heal_care.migration_rollback_probe') AS name`)[0].name).toBeNull();
    expect([...await admin`SELECT * FROM db_migrations.healthcare ORDER BY id`]).toEqual(before);
  } finally {
    assert(resolve(directory).startsWith(resolve(tmpdir()) + sep) && directory.includes('healthcare-migrations-'));
    rmSync(directory, { recursive: true });
  }
});
