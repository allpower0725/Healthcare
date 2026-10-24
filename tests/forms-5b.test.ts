import { describe, expect, it } from 'vitest';
import type { FormValues } from '@/db/schema';
import { fitDef } from '@/lib/forms/defs/fit';
import { hpDef, hpOnSet } from '@/lib/forms/defs/hp';
import { oralDef } from '@/lib/forms/defs/oral';
import { papDef } from '@/lib/forms/defs/pap';
import { type FormDef, missingStarred, sanitize, validateRules } from '@/lib/forms/engine';
import { fitPublicSample, hpPublicSample, oralPublicSample, papPublicSample } from './fixtures';

const NOW = new Date('2026-10-24T04:00:00Z');
const SIGNATURE = 'data:image/png;base64,iVBORw0KGgo=';

/** 民眾區：樣本資料加上修改後清理、驗證 */
const publicKit = (def: FormDef, sample: () => FormValues) => ({
  clean: (patch: FormValues = {}) => sanitize(def, 'public', { ...sample(), ...patch }),
  errors: (patch: FormValues = {}) =>
    validateRules(def.publicRules, sanitize(def, 'public', { ...sample(), ...patch }), NOW),
  defaults: (patch: FormValues = {}) => {
    const pub = sanitize(def, 'public', { ...sample(), ...patch });
    return sanitize(def, 'staff', def.staffDefaults(pub, NOW), pub);
  },
});

describe('子宮頸抹片', () => {
  const { clean, errors, defaults } = publicKit(papDef, papPublicSample);

  it('完整填寫時通過驗證', () => {
    expect(errors()).toEqual({});
  });

  it('已停經時不問最後一次月經日期；月經日期選填，但不可晚於今天', () => {
    expect(clean({ 'pap.q10': '1' })).toMatchObject({ 'pap.q11Y': '', 'pap.q11M': '', 'pap.q11D': '' });
    expect(errors({ 'pap.q11Y': '', 'pap.q11M': '', 'pap.q11D': '' })).toEqual({});
    expect(errors({ 'pap.q11M': '11' })).toEqual({ 'pap.q11': '日期不可晚於今天' });
  });

  it('沒接種 HPV 疫苗時清掉接種年份', () => {
    expect(clean({ 'pap.q15': '2' })['pap.q15Year']).toBe('');
  });

  it('預設值：本國身分證預選本國籍，其餘預選外籍；帶入本院名稱、代碼與今天', () => {
    expect(defaults()).toMatchObject({
      'pap.nationality': '1',
      'pap.van': '1',
      'pap.pay': '1',
      'pap.redo': '2',
      'pap.doubleCervix': '2',
      'pap.purpose': '1',
      'pap.collectOrgName': '烏日澄清醫院',
      'pap.collectOrgCode': '1536151042',
      'pap.collectY': '115',
      'pap.collectM': '10',
      'pap.collectD': '24',
    });
    expect(defaults({ 'profile.idNo': 'P12345678' })['pap.nationality']).toBe('2');
  });

  it('抹片難以判讀之原因最多二個，抹片良好時清空；選項以外的診斷不收', () => {
    const poor = sanitize(papDef, 'staff', {
      'pap.quality': '3',
      'pap.qualityReason': ['1', '2', '8'],
      'pap.qualityReasonOther': '其他原因',
      'pap.dx': '14',
      'pap.dxOther': 'x',
      'pap.ctCode': 'ab',
    });
    // 第三個「其他」被截掉，其說明也跟著清空
    expect(poor).toMatchObject({
      'pap.qualityReason': ['1', '2'],
      'pap.qualityReasonOther': '',
      'pap.dx': '14',
      'pap.dxOther': 'x',
      'pap.ctCode': 'AB',
    });
    const good = sanitize(papDef, 'staff', { 'pap.quality': '1', 'pap.qualityReason': ['1'], 'pap.dx': '99' });
    expect(good).toMatchObject({ 'pap.qualityReason': [], 'pap.dx': '' });
  });

  it('＊欄位：抹片良好時不提醒難以判讀之原因', () => {
    expect(missingStarred(papDef, { 'pap.quality': '1' })).not.toContain('抹片尚可或難以判讀之原因');
    expect(missingStarred(papDef, { 'pap.quality': '2' })).toContain('抹片尚可或難以判讀之原因');
  });
});

describe('口腔黏膜檢查', () => {
  const { errors, defaults } = publicKit(oralDef, oralPublicSample);

  it('完整填寫時通過驗證', () => {
    expect(errors()).toEqual({});
  });

  it('性別必填；手機選填，有填時檢查格式', () => {
    expect(errors({ 'profile.sex': '', 'profile.mobile': '123' })).toEqual({
      'profile.sex': '請選擇一個選項',
      'profile.mobile': '請輸入含區碼的完整號碼，例如 0912345678 或 04-23456789',
    });
    expect(errors({ 'profile.mobile': '0987654321' })).toEqual({});
  });

  it('預設值：支付方式、篩檢地點、本院名稱及代碼、今天', () => {
    expect(defaults()).toMatchObject({
      'oral.pay': '1',
      'oral.site': '2',
      'oral.clinic': '烏日澄清醫院 1536151042',
      'oral.visitY': '115',
      'oral.visitM': '10',
      'oral.visitD': '24',
    });
  });

  it('未發現異常時清掉部位圖、轉診單與複檢結果', () => {
    const staff = {
      'oral.mapMarks': SIGNATURE,
      'oral.referHospital': '中國醫藥大學附設醫院',
      'oral.followed': '1',
      'oral.confirmY': '115',
      'oral.biopsy': '1',
      'oral.treat': '0',
    };
    expect(sanitize(oralDef, 'staff', { ...staff, 'oral.result': '0' })).toMatchObject({
      'oral.mapMarks': '',
      'oral.referHospital': '',
      'oral.followed': '',
      'oral.confirmY': '',
      'oral.biopsy': '',
      'oral.treat': '',
    });
    expect(sanitize(oralDef, 'staff', { ...staff, 'oral.result': '71' })).toMatchObject(staff);
  });

  it('上皮變異才填分級；有接受複檢才檢查複檢日期', () => {
    const clean = sanitize(oralDef, 'staff', { 'oral.result': '1', 'oral.pathDx': '21', 'oral.pathGrade': '23' });
    expect(clean['oral.pathGrade']).toBe('');
    const date = { 'oral.confirmY': '115', 'oral.confirmM': '2', 'oral.confirmD': '30' };
    expect(validateRules(oralDef.staffRules, { 'oral.result': '1', 'oral.followed': '0', ...date }, NOW)).toEqual({});
    expect(validateRules(oralDef.staffRules, { 'oral.result': '1', 'oral.followed': '1', ...date }, NOW)).toEqual({
      'oral.confirm': '日期不存在，請再確認',
    });
  });
});

describe('胃幽門螺旋桿菌', () => {
  const { clean, errors, defaults } = publicKit(hpDef, hpPublicSample);

  it('完整填寫時通過驗證', () => {
    expect(errors()).toEqual({});
  });

  it('個人病史至少選一項，「無」與其他疾病互斥；選「無」時不問發生年份', () => {
    expect(errors({ 'hp.pmh': [] })).toEqual({ 'hp.pmh': '請至少選擇一項；沒有請選「無」' });
    expect(clean({ 'hp.pmh': ['none', 'gu'] })['hp.pmh']).toEqual(['gu']);
    expect(clean({ 'hp.pmh': ['none'] })).toMatchObject({ 'hp.pmh': ['none'], 'hp.pmhYear': '' });
  });

  it('原住民須填族別；不是原住民時清掉族別', () => {
    expect(errors({ 'profile.aboriginal': 'Y' })).toEqual({ 'profile.tribe': '請填寫族別' });
    expect(clean({ 'profile.tribe': '阿美族' })['profile.tribe']).toBe('');
  });

  it('家族病史選「有」須勾家人；選「無」時清掉家人與人數', () => {
    expect(errors({ 'hp.famHp': 'Y' })).toEqual({ 'hp.famHpRel': '請勾選是哪些家人' });
    expect(clean({ 'hp.famGc': 'N' })).toMatchObject({ 'hp.famGcRel': [], 'hp.famGcSib': '' });
  });

  it('有服藥須勾藥物；沒勾抗血小板藥物時清掉其細項', () => {
    expect(errors({ 'hp.meds': 'Y' })).toEqual({ 'hp.medList': '請勾選服用的藥物' });
    const meds = { 'hp.meds': 'Y', 'hp.antiplatelet': ['1'] };
    expect(clean({ ...meds, 'hp.medList': ['3'] })['hp.antiplatelet']).toEqual(['1']);
    expect(clean({ ...meds, 'hp.medList': ['1'] })['hp.antiplatelet']).toEqual([]);
  });

  it('年份（人數）與「不詳」擇一', () => {
    const values: FormValues = {};
    const set = (key: string, value: string | string[]) => {
      values[key] = value;
    };
    hpOnSet('hp.pmhYear', '110', set);
    hpOnSet('hp.famGcChildU', '1', set);
    expect(values).toEqual({ 'hp.pmhYearU': '', 'hp.famGcChild': '' });
    hpOnSet('hp.endoYear', '', set);
    expect(values).not.toHaveProperty('hp.endoYearU');
  });

  it('預設值：支付方式、採檢單位與代碼、今天；第二次門診日期留空', () => {
    expect(defaults()).toMatchObject({
      'hp.pay': '1',
      'hp.unit': '烏日澄清醫院',
      'hp.unitCode': '1536151042',
      'hp.visitY': '115',
      'hp.visit2Y': '',
    });
  });
});

describe('糞便潛血檢查：民眾區', () => {
  const { clean, errors } = publicKit(fitDef, fitPublicSample);
  const noAnnex = { 'fit.smoke': '0', 'fit.famCrc': '0', 'fit.famCa': '2' };

  it('完整填寫時通過驗證', () => {
    expect(errors()).toEqual({});
  });

  it('吸菸及家族史都不是「有」時，附表不需填寫也不需簽名', () => {
    expect(errors({ ...noAnnex, 'fit.sigAnnex': '' })).toEqual({});
    expect(clean(noAnnex)).toMatchObject({
      'fit.smokeAge': '',
      'fit.annexConsent': '',
      'fit.smokeHabit': '',
      'fit.t1Rel': [],
      'fit.t1FatherAge1': '',
      'fit.sigAnnex': '',
    });
  });

  it('附表須選擇是否同意並簽名；不同意時不問吸菸習慣與家族罹癌表', () => {
    expect(errors({ 'fit.annexConsent': '', 'fit.sigAnnex': '' })).toEqual({
      'fit.annexConsent': '請選擇一個選項',
      'fit.sigAnnex': '請點選「點此簽名」完成簽名',
    });
    expect(errors({ 'fit.annexConsent': 'N' })).toEqual({});
    expect(clean({ 'fit.annexConsent': 'N' })).toMatchObject({
      'fit.smokeHabit': '',
      'fit.quitAge': '',
      'fit.t1Rel': [],
      'fit.t1SibAge2': '',
      'fit.sigAnnex': SIGNATURE,
    });
  });

  it('吸菸史為「有」才問吸菸習慣；家族史為「有」須勾家人', () => {
    expect(errors({ 'fit.smokeHabit': '' })).toEqual({ 'fit.smokeHabit': '請選擇一個選項' });
    expect(clean({ 'fit.smoke': '0' })).toMatchObject({ 'fit.smokeHabit': '', 'fit.quitAge': '' });
    expect(errors({ 'fit.t1Rel': [], 'fit.famCa': '1' })).toEqual({
      'fit.t1Rel': '請勾選是哪些家人',
      'fit.t2Rel': '請勾選是哪些家人',
    });
  });

  it('只留勾選家人的資料；父親、母親只有一個罹癌年紀，其他癌症才有癌別', () => {
    const values = clean({
      'fit.t1Rel': ['Sib'],
      'fit.t1FatherAge2': '70',
      'fit.t1SibAge3': '7x0',
      'fit.t1SibType': '肺癌',
      'fit.famCa': '1',
      'fit.t2Rel': ['Mother'],
      'fit.t2MotherType': '乳癌',
    });
    expect(values).toMatchObject({
      'fit.t1FatherAge1': '',
      'fit.t1SibAge3': '70',
      'fit.t2MotherType': '乳癌',
    });
    expect(values).not.toHaveProperty('fit.t1FatherAge2');
    expect(values).not.toHaveProperty('fit.t1SibType');
    expect(values).not.toHaveProperty('fit.t1FatherN');
  });
});

describe('糞便潛血檢查：院所區', () => {
  const { defaults } = publicKit(fitDef, fitPublicSample);

  it('預設值：本院名稱及代碼、今天；評值（一）帶入姓名與身分證號；附表不適用時不帶訪問日期', () => {
    expect(defaults()).toMatchObject({
      'fit.pay': '1',
      'fit.site': '2',
      'fit.clinic': '烏日澄清醫院 1536151042',
      'fit.visitY': '115',
      'fit.edu1Y': '115',
      'fit.edu1Name': '王大明',
      'fit.edu1Pid': 'A234567893',
      'fit.edu2Y': '',
      'fit.ivY': '115',
    });
    expect(defaults({ 'fit.smoke': '0', 'fit.famCrc': '0', 'fit.famCa': '0' })).toMatchObject({
      'fit.ivY': '',
      'fit.ivM': '',
      'fit.ivD': '',
    });
  });

  it('附表不適用時清掉訪問人員簽名（依民眾的答案判斷）', () => {
    const staff = { 'fit.sigInterviewer': SIGNATURE };
    expect(sanitize(fitDef, 'staff', staff, fitPublicSample())['fit.sigInterviewer']).toBe(SIGNATURE);
    const noAnnex = sanitize(fitDef, 'public', { ...fitPublicSample(), 'fit.smoke': '0', 'fit.famCrc': '0' });
    expect(sanitize(fitDef, 'staff', staff, noAnnex)['fit.sigInterviewer']).toBe('');
  });

  it('陰性時清掉確診結果；陽性未確診時只留理由', () => {
    const confirmed = {
      'fit.followed': '1',
      'fit.confirmHospital': '烏日澄清醫院',
      'fit.confirmY': '115',
      'fit.method': '1',
      'fit.dx': ['3'],
      'fit.polypCut': '2',
    };
    expect(sanitize(fitDef, 'staff', { ...confirmed, 'fit.result': '0' })).toMatchObject({
      'fit.followed': '',
      'fit.confirmHospital': '',
      'fit.confirmY': '',
      'fit.method': '',
      'fit.dx': [],
      'fit.polypCut': '',
    });
    expect(sanitize(fitDef, 'staff', { ...confirmed, 'fit.result': '1' })).toMatchObject(confirmed);
    expect(
      sanitize(fitDef, 'staff', {
        ...confirmed,
        'fit.result': '1',
        'fit.followed': '0',
        'fit.noReason': '6',
        'fit.noReasonOther': '個案另行就醫',
      }),
    ).toMatchObject({ 'fit.noReason': '6', 'fit.noReasonOther': '個案另行就醫', 'fit.confirmHospital': '', 'fit.dx': [] });
  });

  it('診斷「正常」與其他互斥；有息肉才問有無切除', () => {
    const base = { 'fit.result': '1', 'fit.followed': '1', 'fit.polypCut': '2' };
    expect(sanitize(fitDef, 'staff', { ...base, 'fit.dx': ['0', '3'] })).toMatchObject({
      'fit.dx': ['3'],
      'fit.polypCut': '2',
    });
    expect(sanitize(fitDef, 'staff', { ...base, 'fit.dx': ['0'] })).toMatchObject({ 'fit.dx': ['0'], 'fit.polypCut': '' });
  });

  it('衛教檢核表：步驟三「已說明危險因子」與「不適用」互斥；選項以外的值不收', () => {
    const clean = sanitize(fitDef, 'staff', { 'fit.edu1S3': ['risk', 'na'], 'fit.edu2S1': ['age', 'x'], 'fit.edu2S5': ['1'] });
    expect(clean).toMatchObject({ 'fit.edu1S3': ['risk'], 'fit.edu2S1': ['age'], 'fit.edu2S5': ['1'] });
  });

  it('確診日期只在有接受確診時檢查', () => {
    const date = { 'fit.confirmY': '115', 'fit.confirmM': '2', 'fit.confirmD': '30' };
    expect(validateRules(fitDef.staffRules, { 'fit.result': '1', 'fit.followed': '0', ...date }, NOW)).toEqual({});
    expect(validateRules(fitDef.staffRules, { 'fit.result': '1', 'fit.followed': '1', ...date }, NOW)).toEqual({
      'fit.confirm': '日期不存在，請再確認',
    });
  });
});
