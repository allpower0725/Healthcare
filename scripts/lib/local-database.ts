import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import type postgres from 'postgres';

// 外鍵順序；只接受這九張表，避免把管理紀錄或其他應用的資料帶入。
export const TABLES = ['users', 'form_settings', 'sessions', 'submissions', 'submission_events',
  'appointment_settings', 'appointments', 'appointment_notices', 'appointment_attempt_limits'] as const;
export const localConfig = () => parseEnv(readFileSync('.local/database/connections.env', 'utf8'));
export const sourceConfig = () => parseEnv(readFileSync('.local/database/source.env', 'utf8'));
export const digest = (rows: string[]) => createHash('sha256').update(rows.join('\n')).digest('hex');

export function requireLocal(url: string | undefined, port: string, database: string): asserts url is string {
  assert(url, '缺少指定的本機連線設定。');
  const parsed = new URL(url);
  assert(['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === port && parsed.pathname === `/${database}`,
    '本機工具只接受指定的 localhost 來源／目標，不能連線 Supabase 或其他資料庫。');
}

type Query = postgres.Sql | postgres.TransactionSql;
export async function tableRows(sql: Query, schema: string, table: string): Promise<string[]> {
  const rows = await sql.unsafe(`SELECT to_jsonb(t)::text AS data FROM "${schema}"."${table}" t ORDER BY (to_jsonb(t)::text) COLLATE "C"`);
  return rows.map((row) => row.data as string);
}

export async function columns(sql: Query, schema: string, table: string) {
  return sql`SELECT column_name, data_type, udt_name, is_nullable, column_default, is_identity,
    identity_generation, identity_start, identity_increment
    FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = ${table}
    ORDER BY column_name`;
}

const normalize = (text: string) => text.replaceAll('"', '').replaceAll('heal_care.', '').replaceAll('public.', '').replaceAll('heal_', '');
export async function structure(sql: Query, schema: string, table: string) {
  const constraints = await sql`SELECT pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = ${schema} AND t.relname = ${table}`;
  const indexes = await sql`SELECT indexdef AS definition FROM pg_indexes
    WHERE schemaname = ${schema} AND tablename = ${table}`;
  return {
    columns: [...await columns(sql, schema, table)],
    constraints: constraints.map((row) => normalize(row.definition)).sort(),
    indexes: indexes.map((row) => normalize(row.definition)).sort(),
  };
}
