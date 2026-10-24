// 表單共用的格式檢查與轉換（瀏覽器與伺服器共用，不可引用伺服器專用模組）

const ID_LETTER: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, M: 21,
  N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
};

/**
 * 身分證統一編號與新式統一證號：1 碼字母＋9 碼數字（第 2 碼 1、2 為國民，8、9 為外籍），含檢查碼。
 * 舊式統一證號：2 碼字母＋8 碼數字，只檢查格式。
 */
export function checkTwId(raw: string): { ok: boolean; foreign?: boolean } {
  const id = String(raw || '').toUpperCase();
  if (/^[A-Z][A-D]\d{8}$/.test(id)) return { ok: true, foreign: true };
  if (!/^[A-Z][1289]\d{8}$/.test(id)) return { ok: false };
  const n = ID_LETTER[id[0]];
  let sum = Math.floor(n / 10) + (n % 10) * 9 + Number(id[9]);
  for (let i = 1; i <= 8; i++) sum += Number(id[i]) * (9 - i);
  if (sum % 10 !== 0) return { ok: false };
  return { ok: true, foreign: id[1] === '8' || id[1] === '9' };
}

/** 本國身分證格式（1 碼字母＋1 或 2＋8 碼數字），用來預選國籍、提醒核對檢查碼 */
export function isTaiwanCitizenId(id: string) {
  return /^[A-Z][12]\d{8}$/.test(id);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 民國年月日轉成西元 ISO 日期（YYYY-MM-DD）；日期不存在或格式錯誤回傳 null */
export function rocToIso(y: string, m: string, d: string): string | null {
  if (!/^\d{1,3}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d) || Number(y) < 1) return null;
  const year = Number(y) + 1911;
  const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    return null;
  }
  return `${year}-${pad(Number(m))}-${pad(Number(d))}`;
}

/** 某年某月的天數；年或月還沒填好時，以可能的最大天數為準（2 月為 29 天） */
function daysInMonth(y: string, m: string) {
  const month = Number(m);
  if (!/^\d{1,2}$/.test(m) || month < 1 || month > 12) return 31;
  if (month !== 2) return [4, 6, 9, 11].includes(month) ? 30 : 31;
  // 民國年至少 2 位數才算填好（避免輸入到一半就依錯的年份判斷閏年）
  if (!/^\d{2,3}$/.test(y)) return 29;
  const year = Number(y) + 1911;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
}

/** 月份輸入上限：超過 12 固定為 12，「00」改為 01；輸入中的單一數字保留 */
export function clampMonth(value: string) {
  if (!value) return value;
  const n = Number(value);
  if (n > 12) return '12';
  if (value.length >= 2 && n === 0) return '01';
  return value;
}

/** 日期輸入上限：超過該月天數固定為最大值，「00」改為 01 */
export function clampDay(value: string, y: string, m: string) {
  if (!value) return value;
  const n = Number(value);
  const max = daysInMonth(y, m);
  if (n > max) return String(max);
  if (value.length >= 2 && n === 0) return '01';
  return value;
}

/** 台灣時間的今天（YYYY-MM-DD） */
export function todayIsoTaipei(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 台灣時間的今天（民國年月日，不補零） */
export function todayRoc(now = new Date()) {
  const [year, month, day] = todayIsoTaipei(now).split('-').map(Number);
  return { y: String(year - 1911), m: String(month), d: String(day) };
}

/** 足歲（兩個日期都是 YYYY-MM-DD） */
export function ageOn(birthIso: string, onIso: string) {
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [y, m, d] = onIso.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** 「臺中市」→ { base: '臺中', sfx: '市' }，供紙本「＿＿市」格式使用 */
export function splitSuffix(value: string, suffixes: string[]) {
  const v = String(value || '').trim();
  for (const s of suffixes) {
    if (v.length > s.length && v.endsWith(s)) return { base: v.slice(0, -s.length), sfx: s };
  }
  return { base: v, sfx: '' };
}

const AREA_CODES = ['0836', '0826', '082', '089', '049', '037', '02', '03', '04', '05', '06', '07', '08'];

/** 電話拆成「區碼－號碼」，供紙本電話欄使用 */
export function splitPhone(raw: string) {
  const s = String(raw || '').trim();
  const m = s.match(/^\(\s*(0\d{1,3})\s*\)\s*(.+)$/) || s.match(/^(0\d{1,3})\s*[-－–]\s*(.+)$/);
  if (m) return { area: m[1], num: m[2].trim() };
  const digits = s.replace(/\D/g, '');
  if (/^09\d{8}$/.test(digits)) return { area: digits.slice(0, 4), num: digits.slice(4) };
  const code = AREA_CODES.find((c) => digits.startsWith(c));
  if (code && digits.length > code.length + 4) return { area: code, num: digits.slice(code.length) };
  return { area: '', num: s };
}

/** 身分證號遮罩：A23****893 */
export function maskIdNo(id: string) {
  return id.length >= 6 ? `${id.slice(0, 3)}****${id.slice(-3)}` : id;
}

const CIRCLED = '⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
/** 選項代碼：0–20 用圈號，其餘照原數字（院所區選項前、紙本） */
export function codeOf(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 20 && String(n) === value ? CIRCLED[n] : value;
}
