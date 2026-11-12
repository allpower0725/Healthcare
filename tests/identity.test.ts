import { describe, expect, it } from 'vitest';
import { FORM_IDS } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { identityError, normalizeIdentityNumber } from '@/lib/forms/identity';

describe('共用證件種類與號碼驗證', () => {
  it('身分證與新舊式統一證號分別檢查格式及檢查碼', () => {
    for (const id of ['A123456789', 'A234567893', 'B120667503']) expect(identityError('national_id', id)).toBeNull();
    for (const id of ['A800000014', 'AB12345677', 'AD12345671']) expect(identityError('resident_id', id)).toBeNull();
    expect(identityError('national_id', 'A123456788')).toBeTruthy();
    expect(identityError('resident_id', 'A800000015')).toBeTruthy();
    expect(identityError('resident_id', 'AB12345678')).toBeTruthy();
  });

  it('類型不符或缺少類型時拒絕，不自動退回護照規則', () => {
    expect(identityError('national_id', 'A800000014')).toBeTruthy();
    expect(identityError('resident_id', 'A123456789')).toBeTruthy();
    expect(identityError('national_id', 'P12345')).toBeTruthy();
    expect(identityError(undefined, 'A123456789')).toBeTruthy();
    expect(identityError('unknown', 'P12345')).toBeTruthy();
  });

  it('護照接受英數混合、純數字及前導零；不假定特定發照國格式', () => {
    for (const id of ['001234567', 'TS1234567', 'P12345', 'A1234567890123456789']) {
      expect(identityError('passport', id)).toBeNull();
    }
    for (const id of ['', '1234', 'A123456789012345678901', 'P123-4567', '護照123456']) {
      expect(identityError('passport', id)).toBeTruthy();
    }
  });

  it('統一英數字字寬與大小寫、去空白，保留前導零與可疑標點', () => {
    expect(normalizeIdentityNumber(' ａ１２３ ４５６７８９ ')).toBe('A123456789');
    expect(identityError('national_id', ' ａ１２３ ４５６７８９ ')).toBeNull();
    expect(normalizeIdentityNumber('00p-12345')).toBe('00P-12345');
    expect(identityError('national_id', 'A12345678O')).toBeTruthy();
    expect(identityError('passport', 123456789)).toBeTruthy();
  });

  it.each(FORM_IDS)('%s 共用同一規則，伺服器清理不會把過長證件號截成合法號碼', (id) => {
    const def = getFormDef(id)!;
    const rule = def.publicRules.filter((rule) => rule.id === 'profile.idNo');
    expect(rule).toHaveLength(1);
    const clean = sanitize(def, 'public', { 'profile.idType': 'passport', 'profile.idNo': 'A123456789012345678901' });
    expect(clean['profile.idNo']).toBe('A123456789012345678901');
    expect(validateRules(rule, clean)['profile.idNo']).toBeTruthy();
    expect(validateRules(rule, sanitize(def, 'public', { 'profile.idNo': 'A123456789' }))['profile.idNo']).toBeTruthy();
  });
});
