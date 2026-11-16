import { expect, test } from 'vitest';
import { databaseSslOptions } from '../src/db/ssl';

test('本機不被強制切成 TLS；Supabase 缺少 CA 時拒絕連線', () => {
  expect(databaseSslOptions('postgres://healthcare@localhost:5432/wjcch_db')).toEqual({});
  expect(() => databaseSslOptions('postgres://healthcare.ref@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')).toThrow('DATABASE_SSL_CA');
});

test('Supabase CA 保留完整憑證檢查且支援環境變數換行', () => {
  const result = databaseSslOptions('postgres://healthcare@db.project.supabase.co/postgres', '-----BEGIN CERTIFICATE-----\\npublic-ca\\n-----END CERTIFICATE-----');
  expect(result.ssl?.rejectUnauthorized).toBe(true);
  expect(result.ssl?.ca).toContain('\npublic-ca\n');
});
