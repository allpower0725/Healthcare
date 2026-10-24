// 成人預防保健：健康署成人預防保健服務檢查紀錄結果表單
import type { FormValues } from '@/db/schema';
import type { FieldSpec, FormDef, Rule } from '../engine';
import { ageOn, rocToIso, todayIsoTaipei, todayRoc } from '../format';
import { HOSPITAL_CODE, HOSPITAL_NAME } from '../hospital';
import {
  type Option,
  optionValues,
  PROFILE_FIELDS,
  PROFILE_RULES,
  REGISTERED_COUNTY_FIELDS,
  REGISTERED_COUNTY_RULE,
  SEX_ABORIGINAL_FIELDS,
  SEX_ABORIGINAL_RULES,
} from '../profile';

/** 民眾區選項 */
export const ADULT_OPTIONS = {
  diseases: [
    ['htn', '高血壓'],
    ['dm', '糖尿病'],
    ['hyperlipid', '高血脂症'],
    ['heart', '心臟病'],
    ['stroke', '腦中風'],
    ['kidney', '腎臟病'],
    ['hbv', 'B 型肝炎'],
    ['hcv', 'C 型肝炎'],
    ['psych', '精神疾病'],
    ['other', '其他'],
    ['polio', '小兒麻痺'],
    ['none', '以上均無'],
  ],
  family: [
    ['htn', '高血壓'],
    ['dm', '糖尿病'],
    ['lipid', '血脂異常'],
    ['heart', '心臟病'],
    ['stroke', '腦中風'],
    ['psych', '精神疾病'],
    ['cancer', '癌症'],
    ['other', '其他'],
    ['none', '以上均無'],
  ],
  med: [
    ['0', '無'],
    ['1', '有'],
  ],
} satisfies Record<string, readonly Option[]>;

/** 健康行為（題號一～五） */
export const ADULT_BEHAVIORS: readonly { key: string; title: string; options: readonly Option[] }[] = [
  {
    key: 'adult.smoke',
    title: '最近半年來，您吸菸的情形是？',
    options: [
      ['1', '不吸菸'],
      ['2', '朋友敬菸或應酬才吸菸'],
      ['3', '平均一天約吸一包菸（含以下）'],
      ['4', '平均一天約吸一包菸以上'],
    ],
  },
  {
    key: 'adult.drink',
    title: '最近半年來，您喝酒的情形是？',
    options: [
      ['1', '不喝酒'],
      ['2', '偶爾喝酒或應酬才喝'],
      ['3', '經常喝酒'],
    ],
  },
  {
    key: 'adult.betel',
    title: '最近半年來，您嚼檳榔的情形是？',
    options: [
      ['1', '不嚼檳榔'],
      ['2', '偶爾會嚼或應酬才嚼'],
      ['3', '經常嚼或習慣在嚼'],
    ],
  },
  {
    key: 'adult.exercise',
    title: '最近二週，您是否有運動（每週達 150 分鐘以上）？',
    options: [
      ['1', '沒有'],
      ['2', '有，但未達每週 150 分鐘（2.5 小時）'],
      ['3', '有，且每週達 150 分鐘以上（2.5 小時）'],
    ],
  },
  {
    key: 'adult.cough',
    title: '您是否出現咳嗽超過二週的情形？',
    options: [
      ['1', '沒有'],
      ['2', '有'],
    ],
  },
];

/** 院所區選項與重複出現的項目 */
export const ADULT_STAFF = {
  normal: [
    ['1', '無明顯異常'],
    ['2', '異常'],
  ],
  yesNo: [
    ['Y', '有'],
    ['N', '無'],
  ],
  entAbn: [
    ['aid', '助聽器'],
    ['caries', '齲齒'],
    ['perio', '牙結石或牙周病'],
    ['other', '其他'],
  ],
  uproQual: [
    ['neg', '－'],
    ['pm', '+/－'],
    ['p1', '+'],
    ['p2', '++'],
    ['p3', '+++'],
    ['p4', '++++'],
  ],
  hepatitis: [
    ['1', '陰性'],
    ['2', '陽性'],
    ['3', '未執行'],
  ],
  counsel: [
    ['smoke', '戒菸'],
    ['drink', '節酒'],
    ['betel', '戒檳榔'],
    ['exercise', '規律運動（含 150 分鐘／每週）'],
    ['weight', '維持正常體重'],
    ['diet', '健康飲食（含我的健康餐盤）'],
    ['injury', '事故傷害預防'],
    ['oral', '口腔保健'],
    ['risk', '慢性疾病風險評估'],
    ['kidney', '腎病識能衛教指導（含尿蛋白、eGFR 的數據、腎功能期別及其嚴重度、危險因子衛教）'],
  ],
  advice: [
    ['life', '生活型態改善，並定期追蹤'],
    ['exam', '進一步檢查'],
    ['treat', '接受治療'],
  ],
  hepResult: [
    ['neg', '陰性'],
    ['pos', '陽性'],
    ['exam', '進一步檢查'],
    ['treat', '接受治療'],
  ],
  resCough: [
    ['1', '沒有'],
    ['2', '有：建議轉診進一步評估是否可能為結核病'],
  ],
} satisfies Record<string, readonly Option[]>;

/** 身體檢查：胸部、心臟聽診…（異常時填說明） */
export const ADULT_EXAMS = [
  ['chest', '胸部'],
  ['heart', '心臟聽診'],
  ['lung', '呼吸聽診'],
  ['abd', '腹部'],
  ['limb', '四肢'],
] as const;

/** 生化檢查：[代號, 名稱, 單位]；低密度脂蛋白膽固醇（自動計算）排在 hdl 之後 */
export const ADULT_LABS = [
  ['glu', '飯前血糖', 'mg/dl'],
  ['tc', '總膽固醇', 'mg/dl'],
  ['tg', '三酸甘油脂', 'mg/dl'],
  ['hdl', '高密度脂蛋白膽固醇', 'mg/dl'],
] as const;
export const ADULT_LABS2 = [
  ['ast', 'AST（GOT）', 'IU/L'],
  ['alt', 'ALT（GPT）', 'IU/L'],
  ['cr', '肌酸酐', 'mg/dl'],
] as const;

/** 檢查結果：代謝症候群為「沒有／有」，其餘為「正常／異常」 */
export const ADULT_RESULTS = [
  ['bp', '血壓'],
  ['glu', '飯前血糖'],
  ['lipid', '血脂肪'],
  ['renal', '腎功能'],
  ['liver', '肝功能'],
  ['mets', '代謝症候群'],
] as const;
export const resultOptions = (key: string): readonly Option[] =>
  key === 'mets'
    ? [
        ['1', '沒有'],
        ['2', '有'],
      ]
    : [
        ['1', '正常'],
        ['2', '異常'],
      ];

export const ADULT_RISKS = [
  ['chd', '冠心病'],
  ['dm', '糖尿病'],
  ['htn', '高血壓'],
  ['stroke', '腦中風'],
  ['mace', '心血管不良事件'],
] as const;

const S = ADULT_STAFF;
const choice = (part: FieldSpec['part'], options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({
  part,
  kind: 'choice',
  options: optionValues(options),
  showIf,
});
const multi = (part: FieldSpec['part'], options: readonly Option[], extra: Partial<FieldSpec> = {}): FieldSpec => ({
  part,
  kind: 'multi',
  options: optionValues(options),
  ...extra,
});
const text = (part: FieldSpec['part'], maxLength: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  part,
  kind: 'text',
  maxLength,
  ...extra,
});
const staffText = (maxLength: number, extra: Partial<FieldSpec> = {}) => text('staff', maxLength, extra);
const value = (maxLength: number, extra: Partial<FieldSpec> = {}) => staffText(maxLength, { decimal: true, ...extra });
const image: FieldSpec = { part: 'staff', kind: 'image' };
const staffDate = (prefix: string): Record<string, FieldSpec> => ({
  [`${prefix}Y`]: staffText(3, { digits: true }),
  [`${prefix}M`]: staffText(2, { digits: true }),
  [`${prefix}D`]: staffText(2, { digits: true }),
});
const dateKeys = (prefix: string) => [`${prefix}Y`, `${prefix}M`, `${prefix}D`] as const;
const labFields = (labs: readonly (readonly [string, string, string])[]) =>
  Object.fromEntries(
    labs.flatMap(([k]) => [
      [`adult.${k}`, value(6)],
      [`adult.${k}Ref`, staffText(12)],
    ]),
  );

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  ...SEX_ABORIGINAL_FIELDS,
  ...REGISTERED_COUNTY_FIELDS,
  'adult.dx': multi('public', ADULT_OPTIONS.diseases, { exclusive: ['none'] }),
  'adult.dxOther': text('public', 20, { showIf: 'adult.dx=other' }),
  'adult.med': choice('public', ADULT_OPTIONS.med),
  'adult.medCause': text('public', 20, { showIf: 'adult.med=1' }),
  'adult.fam': multi('public', ADULT_OPTIONS.family, { exclusive: ['none'] }),
  'adult.famCancer': text('public', 12, { showIf: 'adult.fam=cancer' }),
  'adult.famOther': text('public', 20, { showIf: 'adult.fam=other' }),
  ...Object.fromEntries(ADULT_BEHAVIORS.map((q) => [q.key, choice('public', q.options)])),

  ...staffDate('adult.s1'),
  ...staffDate('adult.s2'),
  'adult.sigS1': image,
  'adult.sigS2': image,
  'adult.sigHep': image,

  'adult.height': value(5),
  'adult.weight': value(5),
  'adult.pulse': staffText(3, { digits: true }),
  'adult.waist': value(5),
  'adult.sbp': staffText(3, { digits: true }),
  'adult.dbp': staffText(3, { digits: true }),
  'adult.vaR': value(5),
  'adult.vaL': value(5),
  'adult.vcR': value(5),
  'adult.vcL': value(5),
  'adult.ent': choice('staff', S.normal),
  'adult.entAbn': multi('staff', S.entAbn, { showIf: 'adult.ent=2' }),
  'adult.lymph': choice('staff', S.yesNo),
  'adult.thyroid': choice('staff', S.yesNo),
  ...Object.fromEntries(
    ADULT_EXAMS.flatMap(([k]) => [
      [`adult.ex_${k}`, choice('staff', S.normal)],
      [`adult.ex_${k}Note`, staffText(20, { showIf: `adult.ex_${k}=2` })],
    ]),
  ),
  'adult.otherAbn': staffText(40),

  'adult.uproQual': choice('staff', S.uproQual),
  ...labFields([['uproQuant', '尿液蛋白質（定量）', 'mg/dl'], ...ADULT_LABS, ...ADULT_LABS2]),
  'adult.ldlRef': staffText(12),
  'adult.ua': value(6),
  'adult.hbsag': choice('staff', S.hepatitis),
  'adult.hcv': choice('staff', S.hepatitis),

  'adult.counsel': multi('staff', S.counsel),

  ...Object.fromEntries(
    ADULT_RESULTS.flatMap(([k]) => [
      [`adult.res_${k}`, choice('staff', resultOptions(k))],
      [`adult.res_${k}Adv`, multi('staff', S.advice, { showIf: `adult.res_${k}=2` })],
      [`adult.res_${k}Mon`, staffText(2, { digits: true, showIf: [`adult.res_${k}=2`, `adult.res_${k}Adv=life`] })],
    ]),
  ),
  'adult.res_renalStage': staffText(3, { showIf: 'adult.res_renal=2' }),
  ...Object.fromEntries(
    ADULT_RISKS.flatMap(([k]) => [
      [`adult.risk_${k}`, value(5, { showIf: `adult.risk_${k}NA!=1` })],
      [`adult.risk_${k}NA`, { part: 'staff', kind: 'flag' } satisfies FieldSpec],
    ]),
  ),
  'adult.resHbv': multi('staff', S.hepResult, { exclusive: ['neg'] }),
  'adult.resHcv': multi('staff', S.hepResult, { exclusive: ['neg'] }),
  'adult.resCough': choice('staff', S.resCough),

  'adult.org': staffText(40),
  'adult.sigDoctor': image,
  'adult.dualOrg': staffText(30),
  'adult.dualAddr': staffText(60),
};

const PICK_ONE = '請勾選至少一項；都沒有請選「以上均無」';

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  ...SEX_ABORIGINAL_RULES,
  REGISTERED_COUNTY_RULE,
  { id: 'adult.dx', type: 'multi', keys: ['adult.dx'], required: true, msg: PICK_ONE },
  {
    id: 'adult.dxOther',
    type: 'text',
    keys: ['adult.dxOther'],
    required: true,
    msg: '請填寫其他疾病的名稱',
    showIf: 'adult.dx=other',
  },
  { id: 'adult.med', type: 'choice', keys: ['adult.med'], required: true },
  { id: 'adult.fam', type: 'multi', keys: ['adult.fam'], required: true, msg: PICK_ONE },
  {
    id: 'adult.famOther',
    type: 'text',
    keys: ['adult.famOther'],
    required: true,
    msg: '請填寫家人其他疾病的名稱',
    showIf: 'adult.fam=other',
  },
  ...ADULT_BEHAVIORS.map((q): Rule => ({ id: q.key, type: 'choice', keys: [q.key], required: true })),
];

const staffRules: Rule[] = [
  { id: 'adult.s1', type: 'rocdate', keys: dateKeys('adult.s1') },
  { id: 'adult.s2', type: 'rocdate', keys: dateKeys('adult.s2') },
];

export type AdultCalc = {
  /** 足歲（出生日期到第一階段日期；未填第一階段日期則以今天計算） */
  age: number | null;
  bmi: number | null;
  ldl: number | null;
  /** 三酸甘油脂 > 400：LDL 公式不適用 */
  ldlNa: boolean;
  egfr: number | null;
};

/** 自動計算：年齡、BMI、LDL、eGFR（只顯示與列印，不存入資料庫） */
export function adultCalc(values: Readonly<Record<string, string | string[] | undefined>>, now = new Date()): AdultCalc {
  const t = (key: string) => {
    const v = values[key];
    return typeof v === 'string' ? v : '';
  };
  const num = (key: string) => {
    const v = Number.parseFloat(t(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const birth = rocToIso(t('profile.birthY'), t('profile.birthM'), t('profile.birthD'));
  const on = rocToIso(t('adult.s1Y'), t('adult.s1M'), t('adult.s1D')) ?? todayIsoTaipei(now);
  const age = birth && birth <= on ? ageOn(birth, on) : null;

  const h = num('adult.height');
  const w = num('adult.weight');
  const bmi = h && h >= 50 && w ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;

  const tc = num('adult.tc');
  const hdl = num('adult.hdl');
  const tg = num('adult.tg');
  const ldl = tc && hdl && tg && tg <= 400 ? Math.round(tc - hdl - tg / 5) : null;

  const cr = num('adult.cr');
  const sex = t('profile.sex');
  const egfr =
    cr && age && (sex === 'M' || sex === 'F')
      ? Math.round(186 * cr ** -1.154 * age ** -0.203 * (sex === 'F' ? 0.742 : 1) * 10) / 10
      : null;

  return { age, bmi, ldl, ldlNa: !!tg && tg > 400, egfr };
}

/** 檢驗結果填入 B、C 型肝炎時，同步帶入「檢查結果與建議」的陰性／陽性（院所人員可再修改） */
export function adultOnSet(key: string, value: string | string[], set: (key: string, value: string | string[]) => void) {
  const target = ({ 'adult.hbsag': 'adult.resHbv', 'adult.hcv': 'adult.resHcv' } as Record<string, string>)[key];
  if (target && (value === '1' || value === '2')) set(target, [value === '1' ? 'neg' : 'pos']);
}

export const adultDef: FormDef = {
  id: 'adult',
  fields,
  publicRules,
  staffRules,
  // 原表單沒有＊欄位；「△」（提供 B、C 型肝炎檢查時必填）只在畫面與紙本標示
  starred: [],
  staffDefaults(publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    const cough = publicValues['adult.cough'];
    return {
      'adult.s1Y': today.y,
      'adult.s1M': today.m,
      'adult.s1D': today.d,
      'adult.org': `${HOSPITAL_NAME} ${HOSPITAL_CODE}`,
      // 咳嗽症狀預設為民眾第五題的回答（選項代碼相同）
      'adult.resCough': typeof cough === 'string' ? cough : '',
    };
  },
};
