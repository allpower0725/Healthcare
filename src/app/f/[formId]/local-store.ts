// 民眾裝置上的暫存（IndexedDB），規則與原電子表單相同：
// - 裝置上只保留「一位填寫者」，以身分證號識別；輸入不同號碼時清除全部資料
// - 自第一次存入起保留 12 小時，逾時整批刪除
// - 通過身分證關卡時發給該分頁一組隨機憑證（sessionStorage，不含身分證號），同一分頁重新整理可續填
// 資料：session { owner, createdAt, tokens }、profile（共用基本資料）、form:<表單>（表單欄位與送出紀錄）
import type { FormValues } from '@/db/schema';

const DB_NAME = 'pp-forms-v2';
const STORE = 'records';
const TTL_MS = 12 * 60 * 60 * 1000;
const MAX_TOKENS = 20;

export type FormRecord = { values: FormValues; submissionId?: string };
type Rec = {
  key: string;
  owner?: string;
  createdAt?: number;
  tokens?: string[];
  data?: FormValues | FormRecord;
};
export type Loaded = { profile: FormValues | null; form: FormRecord | null };

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null); // 不支援 IndexedDB（例如部分無痕模式）：表單照常可填，只是不暫存
      }
    });
  }
  return dbPromise;
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
const get = (store: IDBObjectStore, key: string) =>
  new Promise<Rec | undefined>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as Rec | undefined);
    req.onerror = () => reject(req.error);
  });

/** 在單一交易中執行；任何錯誤都只記錄，不影響填寫 */
async function run<T>(fn: (store: IDBObjectStore) => Promise<T>, fallback: T): Promise<T> {
  const db = await openDb();
  if (!db) return fallback;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const result = await fn(tx.objectStore(STORE));
    await done(tx);
    return result;
  } catch (error) {
    console.warn('[暫存]', error);
    return fallback;
  }
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function purgeExpired(store: IDBObjectStore) {
  const session = await get(store, 'session');
  if (session && !(Date.now() - (session.createdAt ?? 0) < TTL_MS)) store.clear();
}

async function loadFor(store: IDBObjectStore, formId: string): Promise<Loaded> {
  const profile = await get(store, 'profile');
  const form = await get(store, `form:${formId}`);
  return { profile: (profile?.data as FormValues) ?? null, form: (form?.data as FormRecord) ?? null };
}

export const localStore = {
  /** 清掉過期資料 */
  purge: () => run(async (store) => purgeExpired(store), undefined),

  /** 以身分證號開始：相同擁有者帶出資料，不同則清空；ownerChanged 表示清除過別人的資料 */
  open: (owner: string, formId: string) =>
    run<Loaded & { token: string | null; ownerChanged: boolean }>(
      async (store) => {
        await purgeExpired(store);
        let session = await get(store, 'session');
        const ownerChanged = !!session && session.owner !== owner;
        if (!session || session.owner !== owner) {
          store.clear();
          session = { key: 'session', owner, createdAt: Date.now(), tokens: [] };
        }
        const token = newToken();
        session.tokens = [...(session.tokens ?? []), token].slice(-MAX_TOKENS);
        store.put(session);
        return { ...(await loadFor(store, formId)), token, ownerChanged };
      },
      { profile: null, form: null, token: null, ownerChanged: false },
    ),

  /** 同一分頁重新整理：憑證有效才回傳擁有者與資料 */
  resume: (token: string | null, formId: string) =>
    token
      ? run(async (store) => {
          await purgeExpired(store);
          const session = await get(store, 'session');
          if (!session?.owner || !(session.tokens ?? []).includes(token)) return null;
          return { ...(await loadFor(store, formId)), owner: session.owner };
        }, null)
      : Promise.resolve(null),

  /** 換人或更換身分證號：作廢這個分頁的憑證（資料保留到輸入不同號碼為止） */
  release: (token: string | null) =>
    token
      ? run(async (store) => {
          const session = await get(store, 'session');
          if (!session) return;
          session.tokens = (session.tokens ?? []).filter((t) => t !== token);
          store.put(session);
        }, undefined)
      : Promise.resolve(),

  /** 寫入前確認擁有者沒變（另一個分頁可能已換人填寫）；基本資料與既有資料合併 */
  save: (owner: string, formId: string, form: FormRecord, profile: FormValues | null) =>
    run(async (store) => {
      const session = await get(store, 'session');
      if (session?.owner !== owner) return;
      if (profile) {
        const prev = (await get(store, 'profile'))?.data as FormValues | undefined;
        store.put({ key: 'profile', owner, data: { ...prev, ...profile } });
      }
      store.put({ key: `form:${formId}`, owner, data: form });
    }, undefined),

  clearAll: () => run(async (store) => store.clear(), undefined),
};
