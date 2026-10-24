import { describe, expect, it } from 'vitest';
import { adultCalc, adultDef, adultOnSet } from '@/lib/forms/defs/adult';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { adultPublicSample } from './fixtures';

const NOW = new Date('2026-10-24T04:00:00Z');
const publicErrors = (patch: Record<string, string | string[]>) =>
  validateRules(adultDef.publicRules, sanitize(adultDef, 'public', { ...adultPublicSample(), ...patch }), NOW);

describe('成人預防保健：民眾區', () => {
  it('完整填寫時通過驗證', () => {
    expect(publicErrors({})).toEqual({});
  });

  it('疾病史、家族史至少勾一項；選「其他」須填名稱，癌症名稱選填', () => {
    expect(publicErrors({ 'adult.dx': [], 'adult.fam': [] })).toEqual({
      'adult.dx': '請勾選至少一項；都沒有請選「以上均無」',
      'adult.fam': '請勾選至少一項；都沒有請選「以上均無」',
    });
    expect(publicErrors({ 'adult.dx': ['other'], 'adult.fam': ['other'] })).toEqual({
      'adult.dxOther': '請填寫其他疾病的名稱',
      'adult.famOther': '請填寫家人其他疾病的名稱',
    });
    expect(publicErrors({ 'adult.fam': ['cancer'], 'adult.famCancer': '' })).toEqual({});
  });

  it('戶籍地與現住址不同時須選縣市', () => {
    expect(publicErrors({ 'profile.regSame': '' })).toEqual({ 'profile.regCounty': '請選擇戶籍地縣市' });
    expect(publicErrors({ 'profile.regSame': '', 'profile.regCounty': '臺北市' })).toEqual({});
  });

  it('性別、原住民必填', () => {
    expect(publicErrors({ 'profile.sex': '', 'profile.aboriginal': 'X' })).toEqual({
      'profile.sex': '請選擇一個選項',
      'profile.aboriginal': '請選擇一個選項',
    });
  });

  it('「以上均無」與其他選項同時出現時只留其他選項', () => {
    const clean = sanitize(adultDef, 'public', {
      ...adultPublicSample(),
      'adult.dx': ['none', 'htn'],
      'adult.fam': ['none'],
    });
    expect(clean['adult.dx']).toEqual(['htn']);
    expect(clean['adult.fam']).toEqual(['none']);
  });

  it('沒有長期服藥時清掉病因', () => {
    const clean = sanitize(adultDef, 'public', { ...adultPublicSample(), 'adult.med': '0' });
    expect(clean['adult.medCause']).toBe('');
  });
});

describe('成人預防保健：院所區', () => {
  it('預設值：第一階段日期今天、機構名稱及代號、咳嗽症狀沿用民眾回答；檢驗參考值留空', () => {
    const defaults = sanitize(adultDef, 'staff', adultDef.staffDefaults(adultPublicSample(), NOW), adultPublicSample());
    expect(defaults).toMatchObject({
      'adult.s1Y': '115',
      'adult.s1M': '10',
      'adult.s1D': '24',
      'adult.org': '烏日澄清醫院 1536151042',
      'adult.resCough': '2',
      'adult.gluRef': '',
      'adult.s2Y': '',
    });
  });

  it('數值欄位只留數字與小數點；被隱藏的欄位清空', () => {
    const clean = sanitize(adultDef, 'staff', {
      'adult.height': '170.5cm',
      'adult.pulse': '7a6',
      'adult.ent': '1',
      'adult.entAbn': ['perio'],
      'adult.res_bp': '2',
      'adult.res_bpAdv': ['exam'],
      'adult.res_bpMon': '3',
      'adult.res_glu': '1',
      'adult.res_gluAdv': ['life'],
      'adult.risk_chd': '8.5',
      'adult.risk_chdNA': '1',
      'adult.resHbv': ['neg', 'exam'],
    });
    expect(clean).toMatchObject({
      'adult.height': '170.5',
      'adult.pulse': '76',
      'adult.entAbn': [],
      'adult.res_bpAdv': ['exam'],
      'adult.res_bpMon': '',
      'adult.res_gluAdv': [],
      'adult.risk_chd': '',
      'adult.risk_chdNA': '1',
      'adult.resHbv': ['exam'],
    });
  });

  it('HBsAg、Anti-HCV 選陰性或陽性時帶入檢查結果；未執行不帶', () => {
    const values: Record<string, string | string[]> = {};
    const set = (key: string, value: string | string[]) => {
      values[key] = value;
    };
    adultOnSet('adult.hbsag', '1', set);
    adultOnSet('adult.hcv', '2', set);
    expect(values).toEqual({ 'adult.resHbv': ['neg'], 'adult.resHcv': ['pos'] });
    adultOnSet('adult.hbsag', '3', set);
    expect(values['adult.resHbv']).toEqual(['neg']);
  });

  it('日期格式檢查', () => {
    expect(validateRules(adultDef.staffRules, { 'adult.s1Y': '115', 'adult.s1M': '2', 'adult.s1D': '30' }, NOW)).toEqual({
      'adult.s1': '日期不存在，請再確認',
    });
  });
});

describe('成人預防保健：自動計算', () => {
  const base = {
    'profile.birthY': '54',
    'profile.birthM': '3',
    'profile.birthD': '9',
    'profile.sex': 'M',
    'adult.s1Y': '115',
    'adult.s1M': '10',
    'adult.s1D': '23',
  };

  it('年齡以第一階段日期計算足歲；未填時以今天計算', () => {
    expect(adultCalc(base, NOW).age).toBe(61);
    expect(adultCalc({ ...base, 'adult.s1M': '3', 'adult.s1D': '8' }, NOW).age).toBe(60);
    expect(adultCalc({ ...base, 'adult.s1Y': '' }, NOW).age).toBe(61);
  });

  it('BMI：身高未滿 50 公分或缺值時不計算', () => {
    expect(adultCalc({ ...base, 'adult.height': '170', 'adult.weight': '72' }, NOW).bmi).toBe(24.9);
    expect(adultCalc({ ...base, 'adult.height': '1.7', 'adult.weight': '72' }, NOW).bmi).toBeNull();
    expect(adultCalc({ ...base, 'adult.height': '170' }, NOW).bmi).toBeNull();
  });

  it('LDL：三酸甘油脂超過 400 時不適用', () => {
    const lipids = { 'adult.tc': '210', 'adult.hdl': '45', 'adult.tg': '160' };
    expect(adultCalc({ ...base, ...lipids }, NOW)).toMatchObject({ ldl: 133, ldlNa: false });
    expect(adultCalc({ ...base, ...lipids, 'adult.tg': '401' }, NOW)).toMatchObject({ ldl: null, ldlNa: true });
  });

  it('eGFR：依肌酸酐、年齡、性別；女性 × 0.742；缺性別時不計算', () => {
    expect(adultCalc({ ...base, 'adult.cr': '1.0' }, NOW).egfr).toBe(80.7);
    expect(adultCalc({ ...base, 'profile.sex': 'F', 'adult.cr': '0.8' }, NOW).egfr).toBe(77.5);
    expect(adultCalc({ ...base, 'profile.sex': '', 'adult.cr': '1.0' }, NOW).egfr).toBeNull();
  });
});
