import assert from 'node:assert/strict';
import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { TABLES } from './lib/local-database';

// 此工具只準備檔案，不連線或變更雲端；套用前必須盤點、備份與審閱。
const directory = '.local/cloud-migrations/2026-11-16-heal-care';
const project = 'tbulauezaixdjzdcqsem';
const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
mkdirSync(`${directory}/secrets`, { recursive: true });
assert(!existsSync(`${directory}/connections.env`), '雲端設定已存在，不覆蓋密碼。');
function scram(password: string) {
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password, salt, 4096, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest('base64');
  const serverKey = createHmac('sha256', salted).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${storedKey}:${serverKey}`;
}
const passwords = Object.fromEntries(['db_owner', 'healthcare'].map((role) => {
  const password = randomBytes(32).toString('base64url');
  writeFileSync(`${directory}/secrets/${role}_password`, password + '\n', { flag: 'wx', mode: 0o600 });
  return [role, password];
}));
const uri = (role: string, port: number) => `postgresql://${role}.${project}:${passwords[role]}@${host}:${port}/postgres?sslmode=verify-full`;
writeFileSync(`${directory}/connections.env`, `DATABASE_URL=${uri('healthcare', 6543)}\nMIGRATION_DATABASE_URL=${uri('db_owner', 5432)}\nHEALTHCARE_SESSION_URL=${uri('healthcare', 5432)}\n`, { flag: 'wx', mode: 0o600 });

// 傳送 verifier，而非明文密碼；此產物也保持 Git 忽略。
const bootstrap = [
  `CREATE ROLE db_owner LOGIN NOSUPERUSER CREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${scram(passwords.db_owner)}';`,
  `CREATE ROLE healthcare LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${scram(passwords.healthcare)}';`,
  'GRANT healthcare TO db_owner WITH ADMIN TRUE, INHERIT FALSE, SET TRUE;',
  'GRANT db_owner, healthcare TO postgres WITH INHERIT FALSE, SET TRUE;',
  'GRANT CONNECT, CREATE ON DATABASE postgres TO db_owner;',
  'GRANT CONNECT ON DATABASE postgres TO healthcare;',
  'CREATE SCHEMA heal_care AUTHORIZATION healthcare;',
  'CREATE SCHEMA db_migrations AUTHORIZATION db_owner;',
  'REVOKE ALL ON SCHEMA heal_care, db_migrations FROM PUBLIC, anon, authenticated, service_role, his_user;',
  'ALTER ROLE healthcare IN DATABASE postgres SET search_path TO pg_catalog, heal_care;',
  'ALTER ROLE db_owner IN DATABASE postgres SET search_path TO pg_catalog, heal_care, db_migrations;',
  'SET LOCAL ROLE healthcare; ALTER DEFAULT PRIVILEGES IN SCHEMA heal_care REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC; RESET ROLE;',
  // 暫時授權維護帳號備份舊九表，完成切換後撤銷並移除 policy。
  ...TABLES.flatMap((table) => [
    `GRANT SELECT ON public.heal_${table} TO db_owner;`,
    `CREATE POLICY db_owner_backup_select ON public.heal_${table} FOR SELECT TO db_owner USING (true);`,
  ]),
  'GRANT USAGE ON SCHEMA public, drizzle TO db_owner;',
  'GRANT SELECT ON drizzle.heal_drizzle_migrations TO db_owner;',
  'GRANT SELECT ON SEQUENCE drizzle.heal_drizzle_migrations_id_seq TO db_owner;',
  'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO db_owner;',
].join('\n');
writeFileSync(`${directory}/bootstrap.sql`, bootstrap + '\n', { flag: 'wx', mode: 0o600 });
const journal = JSON.parse(readFileSync('drizzle/heal-care/meta/_journal.json', 'utf8'));
assert.equal(journal.entries.length, 1, '首次雲端轉換必須審閱完整 migration 清單。');
console.log('已準備雲端專用兩組密碼、TLS 連線檔與角色初始化 SQL；尚未連線或切換。');
