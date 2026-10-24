import { describe, expect, it } from 'vitest';
import { hpvDef } from '@/lib/forms/defs/hpv';
import { evalCondition, missingStarred, sanitize, validateRules } from '@/lib/forms/engine';
import { hpvPublicSample } from './fixtures';

const NOW = new Date('2026-10-24T04:00:00Z');

describe('條件判斷', () => {
  it('等於、不等於、多個值、複選、或', () => {
    const v = { a: '1', b: ['x', 'y'], c: '' };
    expect(evalCondition('a=1', v)).toBe(true);
    expect(evalCondition('a=2|3', v)).toBe(false);
    expect(evalCondition('a!=2', v)).toBe(true);
    expect(evalCondition('b=y', v)).toBe(true);
    expect(evalCondition('c=1||a=1', v)).toBe(true);
    expect(evalCondition('missing!=1', v)).toBe(true);
  });
});

describe('欄位清理', () => {
  it('只留下該區塊定義的欄位，選項不合法時清空', () => {
    const clean = sanitize(hpvDef, 'public', {
      ...hpvPublicSample(),
      'hpv.q9': '9',
      'hpv.judge': '1',
      'evil.key': 'x',
      'profile.name': '  王小美  ',
    });
    expect(clean['hpv.q9']).toBe('');
    expect(clean['profile.name']).toBe('王小美');
    expect('hpv.judge' in clean).toBe(false);
    expect('evil.key' in clean).toBe(false);
  });

  it('身分證號轉大寫、去空白；數字欄位只留數字；超過長度截斷', () => {
    const clean = sanitize(hpvDef, 'public', {
      ...hpvPublicSample(),
      'profile.idNo': ' a2345 67893 ',
      'profile.birthY': '7x2',
      'profile.name': '王'.repeat(80),
    });
    expect(clean['profile.idNo']).toBe('A234567893');
    expect(clean['profile.birthY']).toBe('72');
    expect(clean['profile.name']).toHaveLength(40);
  });

  it('條件不成立的欄位清空', () => {
    const clean = sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.regCounty': '臺北市' });
    expect(clean['profile.regCounty']).toBe('');

    const staff = sanitize(hpvDef, 'staff', { 'hpv.judge': '2', 'hpv.hr': '1', 'hpv.hrTypes': ['16'] });
    expect(staff['hpv.hr']).toBe('');
    expect(staff['hpv.hrTypes']).toEqual([]);
  });

  it('複選只留合法且不重複的選項', () => {
    const staff = sanitize(hpvDef, 'staff', {
      'hpv.judge': '1',
      'hpv.hr': '1',
      'hpv.hrTypes': ['16', '16', '99', '18/45'],
    });
    expect(staff['hpv.hrTypes']).toEqual(['16', '18/45']);
  });

  it('簽名只接受 PNG data URL 且不超過 300 KB', () => {
    const bad = sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'hpv.sigConsent': 'javascript:alert(1)' });
    expect(bad['hpv.sigConsent']).toBe('');
    const huge = `data:image/png;base64,${'A'.repeat(310 * 1024)}`;
    expect(sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'hpv.sigConsent': huge })['hpv.sigConsent']).toBe('');
  });

  it('非物件輸入視為空白', () => {
    expect(sanitize(hpvDef, 'public', null)['profile.name']).toBe('');
    expect(sanitize(hpvDef, 'public', 'x')['hpv.q9']).toBe('');
  });
});

describe('HPV 民眾區驗證', () => {
  it('完整填寫時通過', () => {
    expect(validateRules(hpvDef.publicRules, sanitize(hpvDef, 'public', hpvPublicSample()), NOW)).toEqual({});
  });

  it('必填欄位未填', () => {
    const values = sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'hpv.q12': '', 'hpv.sigConsent': '' });
    const errors = validateRules(hpvDef.publicRules, values, NOW);
    expect(Object.keys(errors).sort()).toEqual(['hpv.q12', 'hpv.sigConsent']);
  });

  it('出生日期：不存在、晚於今天、誤填西元年', () => {
    const check = (y: string, m: string, d: string) =>
      validateRules(
        hpvDef.publicRules,
        sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.birthY': y, 'profile.birthM': m, 'profile.birthD': d }),
        NOW,
      )['profile.birth'];
    expect(check('72', '2', '30')).toBe('日期不存在，請再確認');
    expect(check('116', '1', '1')).toBe('出生日期不可晚於今天');
    expect(check('200', '2', '30')).toBe('請填寫「民國」年，例如 72');
    expect(check('72', '5', '')).toBe('請完整填寫年、月、日');
  });

  it('地址：沒選鄉鎮、沒有路名也沒有村里、沒有門牌', () => {
    const check = (patch: Record<string, string>) =>
      validateRules(hpvDef.publicRules, sanitize(hpvDef, 'public', { ...hpvPublicSample(), ...patch }), NOW)[
        'profile.addr'
      ];
    expect(check({ 'profile.addrTown': '' })).toBe('請選擇鄉鎮市區');
    expect(check({ 'profile.addrRoad': '' })).toBe('請填寫路（街）名；若地址沒有路名，請填寫村里');
    expect(check({ 'profile.addrRoad': '', 'profile.addrVillage': '光明里' })).toBeUndefined();
    expect(check({ 'profile.addrNo': '' })).toBe('請填寫門牌號碼');
  });

  it('電話位數；身分證號只要有填（外籍可填護照號碼）', () => {
    const errors = validateRules(
      hpvDef.publicRules,
      sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.phone': '12345', 'profile.idNo': 'P12345' }),
      NOW,
    );
    expect(errors['profile.phone']).toBeDefined();
    expect(errors['profile.idNo']).toBeUndefined();
  });

  it('電子郵件選填：沒填可以送出，有填時檢查格式', () => {
    const check = (email: string) =>
      validateRules(
        hpvDef.publicRules,
        sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.email': email }),
        NOW,
      )['profile.email'];
    expect(check('')).toBeUndefined();
    expect(check('wang.xiaomei@example.com')).toBeUndefined();
    expect(check(' Wang@Example.com ')).toBeUndefined();
    expect(check('wang@example')).toBe('請輸入正確的電子郵件，例如 name@example.com');
    expect(check('wang example.com')).toBe('請輸入正確的電子郵件，例如 name@example.com');
  });

  it('戶籍地址與現住址不同時才要求填寫', () => {
    const values = sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.regSame': '' });
    expect(validateRules(hpvDef.publicRules, values, NOW)['profile.reg']).toBe('請選擇縣市及鄉鎮市區');
  });
});

describe('HPV 院所區', () => {
  it('預設值：本國身分證預選本國籍、帶入本院代碼與今天日期', () => {
    const defaults = hpvDef.staffDefaults(sanitize(hpvDef, 'public', hpvPublicSample()), NOW);
    expect(defaults).toMatchObject({
      'hpv.nationality': '1',
      'hpv.van': '1',
      'hpv.pay': '1',
      'hpv.redo': '2',
      'hpv.collectOrg': '1536151042',
      'hpv.collectY': '115',
      'hpv.collectM': '10',
      'hpv.collectD': '24',
    });
    const foreign = hpvDef.staffDefaults(
      sanitize(hpvDef, 'public', { ...hpvPublicSample(), 'profile.idNo': 'P12345678' }),
      NOW,
    );
    expect(foreign['hpv.nationality']).toBe('2');
  });

  it('列出未填的＊欄位，被隱藏的不算', () => {
    const defaults = hpvDef.staffDefaults(sanitize(hpvDef, 'public', hpvPublicSample()), NOW);
    const missing = missingStarred(hpvDef, sanitize(hpvDef, 'staff', defaults));
    expect(missing).toContain('檢體取樣醫事人員簽名');
    expect(missing).toContain('檢驗結果');
    expect(missing).not.toContain('國籍');
    expect(missing).not.toContain('採檢體日期');
  });
});
