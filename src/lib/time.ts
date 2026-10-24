// 後台與民眾端一律以台灣時間（UTC+8，無日光節約）輸入與顯示

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** 顯示用：2026/11/01 08:30 */
export function formatDateTime(value: Date | null) {
  if (!value) return '—';
  // Intl 的輸出會夾雜不可見的方向字元，改用固定格式組字
  const [date, time] = toTaipeiInput(value).split('T');
  return `${date.replaceAll('-', '/')} ${time}`;
}

/** <input type="datetime-local"> 的值（視為台灣時間）轉成 Date；空值或格式錯誤回傳 null */
export function fromTaipeiInput(value: string): Date | null {
  const m = INPUT_PATTERN.exec(value.trim());
  if (!m) return null;

  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(utc);
  // 拒絕 2 月 30 日、13 月這類會被 Date 自動進位的值
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) return null;
  return new Date(utc - TAIPEI_OFFSET_MS);
}

/** Date 轉成 <input type="datetime-local"> 的值（台灣時間） */
export function toTaipeiInput(value: Date | null) {
  if (!value) return '';
  return new Date(value.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 16);
}
