// 表單欄位定義、清理與驗證（瀏覽器與伺服器共用，不可引用伺服器專用模組）
import type { FormValues } from '@/db/schema';
import type { FormId } from './catalog';
import { ageOn, rocToIso, todayIsoTaipei } from './format';
import { TW_DISTRICTS } from './tw-districts';

export type Part = 'public' | 'staff';
/** 條件：'名稱=值'、'名稱!=值'、'名稱=值1|值2'、以 '||' 串接表示任一成立；陣列表示全部成立 */
export type Condition = string | readonly string[];

export type FieldSpec = {
  part: Part;
  /** text 文字、choice 單選、multi 複選、flag 單一勾選、town 鄉鎮市區（依所選縣市）、image 簽名或標示圖 */
  kind: 'text' | 'choice' | 'multi' | 'flag' | 'town' | 'image';
  options?: readonly string[];
  /** multi 的互斥選項（例：「以上均無」）：不能與其他選項同時勾選 */
  exclusive?: readonly string[];
  /** multi 最多可勾選幾項（例：抹片難以判讀之原因最多二個） */
  maxPick?: number;
  /** flag 勾選時的值，預設 '1' */
  value?: string;
  /** town 對應的縣市欄位 */
  countyKey?: string;
  maxLength?: number;
  digits?: boolean;
  /** 只留數字與小數點（例：身高、檢驗數值） */
  decimal?: boolean;
  uppercase?: boolean;
  showIf?: Condition;
};

export type RuleType =
  | 'text'
  | 'choice'
  | 'multi'
  | 'rocdate'
  | 'twid'
  | 'phone'
  | 'email'
  | 'address'
  | 'region'
  | 'signature';

/**
 * 驗證規則（對應原表單的 .field[data-required][data-type]）。
 * keys 的順序：rocdate 為年、月、日；address 為縣市、鄉鎮、村里、路街、門牌；region 為縣市、鄉鎮。
 */
export type Rule = {
  id: string;
  type: RuleType;
  keys: readonly string[];
  required?: boolean;
  range?: 'birth' | 'past';
  msg?: string;
  showIf?: Condition;
};

export type FormDef = {
  id: FormId;
  fields: Readonly<Record<string, FieldSpec>>;
  publicRules: readonly Rule[];
  /** 院所區只做格式檢查（例如日期是否存在），不強制必填 */
  staffRules: readonly Rule[];
  /** 院所區的＊欄位：確認送出前提醒 */
  starred: readonly { label: string; keys: readonly string[] }[];
  /** 院所區第一次開啟時的預設值 */
  staffDefaults: (publicValues: FormValues, now: Date) => FormValues;
};

export const IMAGE_MAX_BYTES = 300 * 1024;
const PNG_PREFIX = 'data:image/png;base64,';

const asText = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const valueOf = (values: FormValues, key: string) => {
  const v = values[key];
  return Array.isArray(v) ? v : (v ?? '');
};

export function isEmpty(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.length === 0 : !v;
}

export function evalCondition(expr: string, values: FormValues): boolean {
  if (expr.includes('||')) return expr.split('||').some((part) => evalCondition(part.trim(), values));
  const m = /^([^!=]+)(!=|=)(.*)$/.exec(expr);
  if (!m) return true;
  const current = valueOf(values, m[1]);
  const wanted = m[3].split('|');
  const hit = Array.isArray(current) ? current.some((v) => wanted.includes(v)) : wanted.includes(current);
  return m[2] === '=' ? hit : !hit;
}

export function conditionsHold(condition: Condition | undefined, values: FormValues) {
  if (!condition) return true;
  return typeof condition === 'string'
    ? evalCondition(condition, values)
    : condition.every((c) => evalCondition(c, values));
}

function cleanField(spec: FieldSpec, raw: unknown, values: FormValues): string | string[] {
  switch (spec.kind) {
    case 'multi': {
      const list = Array.isArray(raw) ? raw.map(asText) : [];
      const picked = [...new Set(list)].filter((v) => spec.options?.includes(v));
      // 互斥選項與其他選項同時出現時，只留其他選項
      const others = picked.filter((v) => !spec.exclusive?.includes(v));
      const kept = others.length > 0 ? others : picked.slice(0, 1);
      return spec.maxPick ? kept.slice(0, spec.maxPick) : kept;
    }
    case 'choice': {
      const v = asText(raw);
      return spec.options?.includes(v) ? v : '';
    }
    case 'flag':
      return asText(raw) === (spec.value ?? '1') ? (spec.value ?? '1') : '';
    case 'town': {
      const v = asText(raw).trim();
      const county = asText(values[spec.countyKey ?? '']);
      return TW_DISTRICTS[county]?.includes(v) ? v : '';
    }
    case 'image': {
      const v = asText(raw);
      return v.startsWith(PNG_PREFIX) && v.length <= IMAGE_MAX_BYTES && /^[A-Za-z0-9+/=]+$/.test(v.slice(PNG_PREFIX.length))
        ? v
        : '';
    }
    default: {
      let v = asText(raw).trim();
      if (spec.uppercase) v = v.toUpperCase().replace(/\s+/g, '');
      if (spec.digits) v = v.replace(/\D/g, '');
      if (spec.decimal) v = v.replace(/[^\d.]/g, '');
      return Array.from(v)
        .slice(0, spec.maxLength ?? 100)
        .join('');
    }
  }
}

/**
 * 依欄位定義清理某一區塊的資料：只留下定義內的欄位、選項不合法時清空、
 * 條件不成立（畫面上被隱藏）的欄位清空。context 為條件判斷時可參考的其他區塊資料。
 */
export function sanitize(def: FormDef, part: Part, raw: unknown, context: FormValues = {}): FormValues {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const keys = Object.keys(def.fields).filter((key) => def.fields[key].part === part);
  const out: FormValues = {};

  // town 依賴同區塊的縣市欄位，先處理其他欄位
  for (const key of keys) if (def.fields[key].kind !== 'town') out[key] = cleanField(def.fields[key], src[key], out);
  for (const key of keys) if (def.fields[key].kind === 'town') out[key] = cleanField(def.fields[key], src[key], out);

  // 被隱藏的欄位清空；條件可能一層層相依，重複到不再變動為止
  for (let changed = true, round = 0; changed && round < 10; round++) {
    changed = false;
    const all = { ...context, ...out };
    for (const key of keys) {
      const spec = def.fields[key];
      if (spec.showIf && !conditionsHold(spec.showIf, all) && !isEmpty(out[key])) {
        out[key] = spec.kind === 'multi' ? [] : '';
        changed = true;
      }
    }
  }
  return out;
}

function ruleError(rule: Rule, values: FormValues, today: string): string | null {
  const text = (key: string) => {
    const v = valueOf(values, key);
    return Array.isArray(v) ? v.join(',') : v;
  };
  const [k0, k1, k2, k3, k4] = rule.keys;

  switch (rule.type) {
    case 'rocdate': {
      const [y, m, d] = [text(k0), text(k1), text(k2)];
      if (!y && !m && !d) return rule.required ? (rule.msg ?? '請填寫日期') : null;
      if (!y || !m || !d) return '請完整填寫年、月、日';
      const iso = rocToIso(y, m, d);
      if (!iso) return Number(y) > 150 ? '請填寫「民國」年，例如 72' : '日期不存在，請再確認';
      if (rule.range === 'birth') {
        if (iso > today) return '出生日期不可晚於今天';
        if (ageOn(iso, today) > 120) return '請確認出生年份（民國年）';
      }
      if (rule.range === 'past' && iso > today) return '日期不可晚於今天';
      return null;
    }
    case 'address': {
      if (![k0, k1, k2, k3, k4].some((k) => text(k))) return rule.required ? (rule.msg ?? '請填寫現住址') : null;
      if (!text(k0)) return '請選擇縣市';
      if (!text(k1)) return '請選擇鄉鎮市區';
      if (!text(k3) && !text(k2)) return '請填寫路（街）名；若地址沒有路名，請填寫村里';
      if (!text(k4)) return '請填寫門牌號碼';
      return null;
    }
    case 'region': {
      if (!text(k0) && !text(k1)) return rule.required ? (rule.msg ?? '請選擇縣市及鄉鎮市區') : null;
      if (!text(k0)) return '請選擇縣市';
      if (!text(k1)) return '請選擇鄉鎮市區';
      return null;
    }
    case 'phone': {
      const v = text(k0);
      if (!v) return rule.required ? (rule.msg ?? '請填寫聯絡電話') : null;
      const main = v.split('#')[0];
      const digits = main.replace(/\D/g, '').length;
      return /^[+\d\s()\-－]+$/.test(main) && digits >= 9 && digits <= 12
        ? null
        : '請輸入含區碼的完整號碼，例如 0912345678 或 04-23456789';
    }
    case 'email': {
      const v = text(k0);
      if (!v) return rule.required ? (rule.msg ?? '請填寫電子郵件') : null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : '請輸入正確的電子郵件，例如 name@example.com';
    }
    default: {
      if (!isEmpty(valueOf(values, k0))) return null;
      if (!rule.required) return null;
      const fallback: Record<string, string> = {
        choice: '請選擇一個選項',
        multi: '請至少選擇一項',
        twid: '請填寫身分證統一編號、統一證號或護照號碼',
        signature: '請點選「點此簽名」完成簽名',
      };
      return rule.msg ?? fallback[rule.type] ?? '請填寫此欄位';
    }
  }
}

/** 依規則驗證，回傳 { 規則 id: 錯誤訊息 }；條件不成立的規則略過 */
export function validateRules(rules: readonly Rule[], values: FormValues, now = new Date()) {
  const today = todayIsoTaipei(now);
  const errors: Record<string, string> = {};
  for (const rule of rules) {
    if (!conditionsHold(rule.showIf, values)) continue;
    const message = ruleError(rule, values, today);
    if (message) errors[rule.id] = message;
  }
  return errors;
}

/** 院所區尚未填寫的＊欄位名稱；畫面上被隱藏的不算 */
export function missingStarred(def: FormDef, staffValues: FormValues, publicValues: FormValues = {}) {
  const all = { ...publicValues, ...staffValues };
  return def.starred
    .filter(({ keys }) => keys.every((key) => conditionsHold(def.fields[key]?.showIf, all)))
    .filter(({ keys }) => keys.some((key) => isEmpty(valueOf(all, key))))
    .map(({ label }) => label);
}
