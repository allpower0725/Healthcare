// 人類乳突病毒（HPV）檢測：健康署婦女人類乳突病毒檢測服務檢查紀錄結果表單
import type { FormValues } from '@/db/schema';
import type { FieldSpec, FormDef, Rule } from '../engine';
import { isTaiwanCitizenId, todayRoc } from '../format';
import { HOSPITAL_CODE } from '../hospital';
import {
  type Option,
  optionValues,
  PROFILE_FIELDS,
  PROFILE_RULES,
  REGISTERED_REGION_FIELDS,
  REGISTERED_REGION_RULE,
} from '../profile';

const NO_YES_UNKNOWN: readonly Option[] = [
  ['1', '無'],
  ['2', '有'],
  ['3', '不知道/拒答'],
];

/** 民眾區題目（題號為原表單題號，畫面上不顯示） */
export const HPV_QUESTIONS: readonly { key: string; title: string; options: readonly Option[] }[] = [
  { key: 'hpv.q9', title: '最近一年使用口服避孕藥達 6 個月以上', options: NO_YES_UNKNOWN },
  { key: 'hpv.q10', title: '最近一年因更年期症狀使用荷爾蒙補充療法達 6 個月以上', options: NO_YES_UNKNOWN },
  { key: 'hpv.q11', title: '請問您是否使用免疫抑制劑藥物（如類固醇、抗移植排斥藥物等）', options: NO_YES_UNKNOWN },
  {
    key: 'hpv.q12',
    title: '最近一年性行為時曾經使用保險套',
    options: [
      ['1', '無'],
      ['2', '有'],
      ['3', '最近一年無性行為'],
      ['4', '不知道/拒答'],
    ],
  },
  {
    key: 'hpv.q13',
    title: '最近一年平均每個月陰道灌洗頻率',
    options: [
      ['1', '從未灌洗'],
      ['2', '不到 1 次'],
      ['3', '1 次'],
      ['4', '2–4 次'],
      ['5', '至少 5 次'],
      ['6', '不知道/拒答'],
    ],
  },
  {
    key: 'hpv.q14',
    title: '最近一年吸菸習慣（持續吸菸 6 個月以上）',
    options: [
      ['1', '無'],
      ['2', '已戒菸 6 個月以上'],
      ['3', '有吸菸'],
    ],
  },
  {
    key: 'hpv.q15',
    title: '請問您接種的 HPV 疫苗是',
    options: [
      ['1', '未接種'],
      ['2', '保蓓（2 價）'],
      ['3', '嘉喜（4 價）'],
      ['4', '嘉喜（9 價）'],
      ['5', '不記得'],
    ],
  },
  {
    key: 'hpv.q16',
    title: '最近一次 HPV 檢測時間',
    options: [
      ['1', '1 年內'],
      ['2', '1–2 年內'],
      ['3', '2–3 年內'],
      ['4', '3 年以上'],
      ['5', '從未檢查過'],
    ],
  },
  {
    key: 'hpv.q17',
    title: '最近一次 HPV 檢測結果',
    options: [
      ['1', '未感染'],
      ['2', '有感染'],
      ['3', '不知道'],
      ['4', '從未檢查過'],
    ],
  },
];

/** 院所區選項 */
export const HPV_STAFF_OPTIONS = {
  nationality: [
    ['1', '本國'],
    ['2', '外籍人士'],
  ],
  van: [
    ['1', '否'],
    ['2', '抹片車'],
    ['3', '社區巡迴服務'],
  ],
  pay: [
    ['1', '預防保健'],
    ['2', '健保醫療給付'],
    ['3', '其他公務預算補助'],
    ['4', '其他'],
    ['6', '自費健康檢查'],
  ],
  redo: [
    ['1', '是'],
    ['2', '否'],
  ],
  collectorRole: [
    ['1', '婦產科醫師'],
    ['2', '家醫科醫師'],
    ['3', '助產人員'],
    ['4', '衛生所護理人員'],
    ['5', '衛生所醫師（非屬①②）'],
  ],
  withPap: [
    ['1', '否'],
    ['2', '是'],
  ],
  purpose: [
    ['1', '篩檢'],
    ['2', '追蹤'],
    ['3', '其他'],
  ],
  reagent: [
    ['1', 'Abbott RealTime HPV test'],
    ['2', 'BD Onclarity HPV Assay'],
    ['3', 'Roche Cobas HPV test'],
    ['4', 'CapitalBio HPV Genotyping Kit'],
    ['5', 'DR. HPV Genotyping IVD kit'],
    ['6', 'EASY CHIP HPV Blot'],
    ['8', 'Xpert HPV'],
    ['9', 'Alinity m HR HPV'],
    ['12', 'Aptima HPV 16 18/45 Genotype Assay'],
    ['99', 'Other'],
  ],
  judge: [
    ['1', '可判讀'],
    ['2', '無法判讀'],
  ],
  posNeg: [
    ['0', '陰性'],
    ['1', '陽性'],
  ],
  posNegUntested: [
    ['0', '陰性'],
    ['1', '陽性'],
    ['2', '未檢測'],
  ],
  hrTypes: [
    ['16', '16'],
    ['18', '18'],
    ['31', '31'],
    ['33', '33'],
    ['35', '35'],
    ['39', '39'],
    ['45', '45'],
    ['51', '51'],
    ['52', '52'],
    ['56', '56'],
    ['58', '58'],
    ['59', '59'],
    ['66', '66'],
    ['68', '68'],
    ['18/45', '18/45'],
    ['n1618', '非 16、18 之不分型'],
    ['n161845', '非 16、18/45 之不分型'],
  ],
  lrTypes: [
    ['6', '6'],
    ['11', '11'],
    ['40', '40'],
    ['42', '42'],
    ['43', '43'],
    ['44', '44'],
    ['54', '54'],
    ['61', '61'],
    ['70', '70'],
    ['72', '72'],
    ['82', '82'],
    ['nt', '不分型'],
  ],
} satisfies Record<string, readonly Option[]>;

const O = HPV_STAFF_OPTIONS;
const choice = (part: FieldSpec['part'], options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({
  part,
  kind: 'choice',
  options: optionValues(options),
  showIf,
});
const staffText = (maxLength: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  part: 'staff',
  kind: 'text',
  maxLength,
  ...extra,
});
const staffDate = (prefix: string): Record<string, FieldSpec> => ({
  [`${prefix}Y`]: staffText(3, { digits: true }),
  [`${prefix}M`]: staffText(2, { digits: true }),
  [`${prefix}D`]: staffText(2, { digits: true }),
});
const dateKeys = (prefix: string) => [`${prefix}Y`, `${prefix}M`, `${prefix}D`] as const;

const RESULT_READABLE = 'hpv.judge=1';

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  ...REGISTERED_REGION_FIELDS,
  ...Object.fromEntries(HPV_QUESTIONS.map((q) => [q.key, choice('public', q.options)])),
  'hpv.sigConsent': { part: 'public', kind: 'image' },

  'hpv.nationality': choice('staff', O.nationality),
  'hpv.van': choice('staff', O.van),
  'hpv.pay': choice('staff', O.pay),
  'hpv.redo': choice('staff', O.redo),
  'hpv.schedule': staffText(2),
  'hpv.collectOrg': staffText(10, { digits: true }),
  ...staffDate('hpv.collect'),
  'hpv.sigCollector': { part: 'staff', kind: 'image' },
  'hpv.collectorRole': choice('staff', O.collectorRole),
  'hpv.withPap': choice('staff', O.withPap),
  'hpv.purpose': choice('staff', O.purpose),
  'hpv.lab': staffText(10, { digits: true }),
  'hpv.specimenNo': staffText(30),
  ...staffDate('hpv.recv'),
  ...staffDate('hpv.report'),
  'hpv.reagent': choice('staff', O.reagent),
  'hpv.reagentOther': staffText(40, { showIf: 'hpv.reagent=99' }),
  'hpv.judge': choice('staff', O.judge),
  'hpv.hr': choice('staff', O.posNeg, RESULT_READABLE),
  'hpv.hrTypes': { part: 'staff', kind: 'multi', options: optionValues(O.hrTypes), showIf: [RESULT_READABLE, 'hpv.hr=1'] },
  'hpv.lr': choice('staff', O.posNegUntested, RESULT_READABLE),
  'hpv.lrTypes': { part: 'staff', kind: 'multi', options: optionValues(O.lrTypes), showIf: [RESULT_READABLE, 'hpv.lr=1'] },
  'hpv.ot': choice('staff', O.posNegUntested, RESULT_READABLE),
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((i) => [`hpv.ot${i}`, staffText(6, { showIf: [RESULT_READABLE, 'hpv.ot=1'] })]),
  ),
  'hpv.sigLab': { part: 'staff', kind: 'image' },
};

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  REGISTERED_REGION_RULE,
  ...HPV_QUESTIONS.map((q): Rule => ({ id: q.key, type: 'choice', keys: [q.key], required: true })),
  { id: 'hpv.sigConsent', type: 'signature', keys: ['hpv.sigConsent'], required: true },
];

const staffRules: Rule[] = [
  { id: 'hpv.collect', type: 'rocdate', keys: dateKeys('hpv.collect') },
  { id: 'hpv.recv', type: 'rocdate', keys: dateKeys('hpv.recv') },
  { id: 'hpv.report', type: 'rocdate', keys: dateKeys('hpv.report') },
];

export const hpvDef: FormDef = {
  id: 'hpv',
  fields,
  publicRules,
  staffRules,
  starred: [
    { label: '國籍', keys: ['hpv.nationality'] },
    { label: '抹片車或社區巡迴服務', keys: ['hpv.van'] },
    { label: '支付方式', keys: ['hpv.pay'] },
    { label: '無法判讀重做', keys: ['hpv.redo'] },
    { label: '採檢醫療機構', keys: ['hpv.collectOrg'] },
    { label: '採檢體日期', keys: dateKeys('hpv.collect') },
    { label: '檢體取樣醫事人員簽名', keys: ['hpv.sigCollector'] },
    { label: '本次是否同時進行抹片檢查', keys: ['hpv.withPap'] },
    { label: '檢驗實驗室', keys: ['hpv.lab'] },
    { label: '檢體編號', keys: ['hpv.specimenNo'] },
    { label: '檢體收到日期', keys: dateKeys('hpv.recv') },
    { label: '發報告日期', keys: dateKeys('hpv.report') },
    { label: '檢驗試劑', keys: ['hpv.reagent'] },
    { label: '檢驗結果', keys: ['hpv.judge'] },
    { label: '檢驗者簽名', keys: ['hpv.sigLab'] },
  ],
  staffDefaults(publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    const idNo = typeof publicValues['profile.idNo'] === 'string' ? publicValues['profile.idNo'] : '';
    return {
      // 本國身分證預選本國，其餘（統一證號、護照號碼）預選外籍人士
      'hpv.nationality': isTaiwanCitizenId(idNo) ? '1' : '2',
      'hpv.van': '1',
      'hpv.pay': '1',
      'hpv.redo': '2',
      'hpv.collectOrg': HOSPITAL_CODE,
      'hpv.collectY': today.y,
      'hpv.collectM': today.m,
      'hpv.collectD': today.d,
    };
  },
};
