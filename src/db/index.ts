import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 開發模式熱更新會重新載入模組，沿用同一個連線池以免連線數一直增加
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 未設定');
  // prepare: false 才能透過 Supabase 的交易模式連線池連線
  return postgres(url, { prepare: false });
}

export const pgClient = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = pgClient;

export const db = drizzle(pgClient, { schema });
