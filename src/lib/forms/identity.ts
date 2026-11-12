import { checkTwId } from './format';

export const IDENTITY_TYPES = [
  ['national_id', '身分證'], ['resident_id', '統一證號'], ['passport', '護照'],
] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number][0];
export const IDENTITY_MAX_LENGTH = 20;
export const IDENTITY_HINTS: Record<IdentityType, string> = {
  national_id: '共 10 碼：1 碼英文字母＋9 碼數字，請依身分證填寫。',
  resident_id: '新式為 1 碼英文字母＋9 碼數字；舊式為 2 碼英文字母＋8 碼數字。',
  passport: '請依護照資料頁填寫 5–20 碼英文字母或數字，保留開頭的 0。',
};

export function isIdentityType(value: unknown): value is IdentityType {
  return IDENTITY_TYPES.some(([type]) => type === value);
}

/** 支援貼上全形英數字；只調整字寬、大小寫與空白，不猜測 O／0 或移除標點。 */
export function normalizeIdentityNumber(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').toUpperCase().replace(/\s+/g, '') : '';
}

/** 依明確選擇的種類檢查，不把未通過的身分證或統一證號自動當成護照。 */
export function identityError(type: unknown, value: unknown): string | null {
  if (!isIdentityType(type)) return '請選擇證件種類，再確認證件號碼。';
  const id = normalizeIdentityNumber(value);
  if (!id) return '請填寫證件號碼。';
  if (type === 'passport') {
    return /^[A-Z0-9]{5,20}$/.test(id) ? null : '護照號碼輸入有誤，請再確認。請填寫 5–20 碼英文字母或數字。';
  }
  const matchesType = type === 'national_id' ? /^[A-Z][12]\d{8}$/.test(id)
    : /^(?:[A-Z][89]\d{8}|[A-Z][A-D]\d{8})$/.test(id);
  return matchesType && checkTwId(id).ok ? null
    : `${type === 'national_id' ? '身分證號碼' : '統一證號'}輸入有誤，請再確認證件種類及完整 10 碼號碼。`;
}
