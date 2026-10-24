// 子宮頸抹片檢查：健康署婦女子宮頸抹片檢查服務檢查紀錄結果表單（附表三之四）
import type { FormValues } from '@/db/schema';
import type { FieldSpec, FormDef, Rule } from '../engine';
import { isTaiwanCitizenId, todayRoc } from '../format';
import { HOSPITAL_CODE, HOSPITAL_NAME } from '../hospital';
import {
  type Option,
  optionValues,
  PROFILE_FIELDS,
  PROFILE_RULES,
  REGISTERED_REGION_FIELDS,
  REGISTERED_REGION_RULE,
} from '../profile';

const YES_NO_UNKNOWN: readonly Option[] = [
  ['1', '是'],
  ['2', '否'],
  ['3', '不知道'],
];

/** 民眾區單選題（題號為原表單題號，畫面上不顯示）；第 11 題最後一次月經日期另外處理 */
export const PAP_QUESTIONS: readonly { key: string; title: string; hint?: string; options: readonly Option[] }[] = [
  {
    key: 'pap.q9',
    title: '最近一次抹片檢查時間？',
    options: [
      ['1', '1 年內'],
      ['2', '1 至 2 年內'],
      ['3', '2 至 3 年內'],
      ['4', '3 年以上'],
      ['5', '從未檢查過'],
    ],
  },
  { key: 'pap.q10', title: '已停經？（一年無月經）', options: YES_NO_UNKNOWN },
  { key: 'pap.q12', title: '現在是否懷孕？', options: YES_NO_UNKNOWN },
  { key: 'pap.q13', title: '子宮是否切除？', options: YES_NO_UNKNOWN },
  { key: 'pap.q14', title: '子宮是否接受過放射線治療？', options: YES_NO_UNKNOWN },
  {
    key: 'pap.q15',
    title: '是否曾接種人類乳突病毒（HPV）疫苗？',
    hint: '民國 95 年起有 HPV 疫苗。',
    options: YES_NO_UNKNOWN,
  },
];

/** 細胞病理診斷，依原表單順序：head 為分類標題；top 表示不屬於上方分類（列印時不縮排） */
export const PAP_DX: readonly ({ head: string } | { value: string; label: string; top?: boolean })[] = [
  { head: 'NEGATIVE FOR INTRAEPITHELIAL LESION OR MALIGNANCY' },
  { value: '1', label: 'Within normal limit' },
  { value: '2', label: 'Reactive changes：Inflammation, repair, radiation, and others' },
  { value: '3', label: 'Atrophy with inflammation' },
  { head: 'ATYPICAL SQUAMOUS CELLS' },
  { value: '4', label: 'Atypical squamous cells（ASC-US）' },
  { value: '16', label: 'Atypical squamous cells cannot exclude HSIL' },
  { head: 'LOW-GRADE SQUAMOUS INTRAEPITHELIAL LESION' },
  { value: '6', label: 'Mild dysplasia（CIN1）with koilocytes' },
  { value: '7', label: 'Mild dysplasia（CIN1）without koilocytes' },
  { head: 'HIGH-GRADE SQUAMOUS INTRAEPITHELIAL LESION' },
  { value: '8', label: 'Moderate dysplasia（CIN2）' },
  { value: '9', label: 'Severe dysplasia（CIN3）' },
  { value: '10', label: 'Carcinoma in situ（CIN3）' },
  { value: '11', label: 'SQUAMOUS CELL CARCINOMA', top: true },
  { head: 'ATYPICAL GLANDULAR CELLS' },
  { value: '5', label: 'Atypical glandular cells' },
  { value: '15', label: 'Atypical glandular cells favor neoplasm' },
  { value: '18', label: 'ENDOCERVICAL ADENOCARCINOMA IN SITU', top: true },
  { value: '12', label: 'ADENOCARCINOMA', top: true },
  { value: '13', label: 'OTHER MALIGNANT NEOPLASM', top: true },
  { value: '14', label: 'OTHER', top: true },
  // 原表單此項排在最後、但列印時縮排
  { value: '17', label: 'Dysplasia cannot exclude HSIL' },
];

/** 院所區選項 */
export const PAP_STAFF_OPTIONS = {
  nationality: [
    ['1', '本國'],
    ['2', '外籍人士'],
  ],
  van: [
    ['1', '否'],
    ['2', '抹片車'],
    ['3', '社區巡迴服務篩檢'],
  ],
  pay: [
    ['1', '預防保健'],
    ['2', '健保醫療給付'],
    ['3', '其他公務預算補助'],
    ['4', '其他'],
    ['6', '自費健康檢查'],
  ],
  yesNo: [
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
  withHpv: [
    ['1', '否'],
    ['2', '是'],
  ],
  purpose: [
    ['1', '篩檢'],
    ['2', '懷疑癌症'],
    ['3', '追蹤'],
    ['4', '前次抹片難以判讀'],
    ['5', '其他'],
  ],
  specimenType: [
    ['1', '常規抹片'],
    ['2', '液體標本'],
  ],
  readMethod: [
    ['1', '人工'],
    ['2', '機械'],
    ['3', '人工＋機械'],
  ],
  quality: [
    ['1', '良好'],
    ['2', '尚可'],
    ['3', '抹片難以判讀'],
  ],
  qualityReason: [
    ['1', '抹片固定或保存不良'],
    ['2', '細胞太少'],
    ['3', '太厚或太多血液'],
    ['4', '沒有子宮內頸成份'],
    ['5', '炎症細胞過多'],
    ['6', '存在外來物（如潤滑劑）'],
    ['7', '過多細胞溶解或自溶'],
    ['8', '其他'],
  ],
  infection: [
    ['1', 'Candida'],
    ['2', 'Trichomonas'],
    ['3', 'Herpes'],
    ['7', 'Shift in flora（bacterial vaginosis）'],
    ['8', 'Actinomyces'],
    ['6', 'Others'],
  ],
  advice: [
    ['1', '因抹片難以判讀，請重做抹片檢查'],
    ['2', '治療發炎，並於三個月後重做抹片檢查'],
    ['3', '抹片結果異常，請再做進一步檢查'],
    ['4', '其他建議'],
  ],
} satisfies Record<string, readonly Option[]>;

const O = PAP_STAFF_OPTIONS;
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

/** 未停經（或不確定）才問最後一次月經日期 */
const NOT_MENOPAUSE = 'pap.q10!=1';
/** 抹片尚可或難以判讀時才需填原因 */
const POOR_QUALITY = 'pap.quality=2|3';

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  ...REGISTERED_REGION_FIELDS,
  ...Object.fromEntries(PAP_QUESTIONS.map((q) => [q.key, choice('public', q.options)])),
  'pap.q11Y': { part: 'public', kind: 'text', maxLength: 3, digits: true, showIf: NOT_MENOPAUSE },
  'pap.q11M': { part: 'public', kind: 'text', maxLength: 2, digits: true, showIf: NOT_MENOPAUSE },
  'pap.q11D': { part: 'public', kind: 'text', maxLength: 2, digits: true, showIf: NOT_MENOPAUSE },
  'pap.q15Year': { part: 'public', kind: 'text', maxLength: 3, digits: true, showIf: 'pap.q15=1' },
  'pap.sigConsent': { part: 'public', kind: 'image' },

  // 收案資訊
  'pap.nationality': choice('staff', O.nationality),
  'pap.van': choice('staff', O.van),
  'pap.pay': choice('staff', O.pay),
  'pap.redo': choice('staff', O.yesNo),
  'pap.schedule': staffText(2),
  // 三之一、抹片資料（採檢醫療機構）
  'pap.chartNo': staffText(20),
  'pap.doubleCervix': choice('staff', O.yesNo),
  ...staffDate('pap.collect'),
  'pap.collectOrgName': staffText(30),
  'pap.collectOrgCode': staffText(10, { digits: true }),
  'pap.sigCollector': { part: 'staff', kind: 'image' },
  'pap.collectorRole': choice('staff', O.collectorRole),
  'pap.withHpv': choice('staff', O.withHpv),
  'pap.purpose': choice('staff', O.purpose),
  'pap.finding': staffText(100),
  // 三之二、抹片資料（病理醫療機構）
  'pap.cytoNo': staffText(30),
  'pap.readOrgName': staffText(30),
  'pap.readOrgCode': staffText(10, { digits: true }),
  ...staffDate('pap.recv'),
  'pap.specimenType': choice('staff', O.specimenType),
  // 四、抹片判讀結果
  'pap.readMethod': choice('staff', O.readMethod),
  'pap.quality': choice('staff', O.quality),
  'pap.qualityReason': {
    part: 'staff',
    kind: 'multi',
    options: optionValues(O.qualityReason),
    maxPick: 2,
    showIf: POOR_QUALITY,
  },
  'pap.qualityReasonOther': staffText(30, { showIf: [POOR_QUALITY, 'pap.qualityReason=8'] }),
  'pap.infection': { part: 'staff', kind: 'multi', options: optionValues(O.infection) },
  'pap.infectionOther': staffText(30, { showIf: 'pap.infection=6' }),
  'pap.dx': {
    part: 'staff',
    kind: 'choice',
    options: PAP_DX.flatMap((row) => ('value' in row ? [row.value] : [])),
  },
  'pap.dxOther': staffText(30, { showIf: 'pap.dx=14' }),
  'pap.endometrial': choice('staff', O.yesNo),
  'pap.advice': { part: 'staff', kind: 'multi', options: optionValues(O.advice) },
  'pap.adviceOther': staffText(80, { showIf: 'pap.advice=4' }),
  // 檢驗者
  'pap.sigCt': { part: 'staff', kind: 'image' },
  'pap.ctCode': staffText(2, { uppercase: true }),
  'pap.sigCp': { part: 'staff', kind: 'image' },
  'pap.cpCode': staffText(2, { uppercase: true }),
  'pap.cpM': staffText(2, { digits: true }),
  'pap.cpD': staffText(2, { digits: true }),
};

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  REGISTERED_REGION_RULE,
  ...PAP_QUESTIONS.map((q): Rule => ({ id: q.key, type: 'choice', keys: [q.key], required: true })),
  { id: 'pap.q11', type: 'rocdate', keys: dateKeys('pap.q11'), range: 'past', showIf: NOT_MENOPAUSE },
  { id: 'pap.sigConsent', type: 'signature', keys: ['pap.sigConsent'], required: true },
];

const staffRules: Rule[] = [
  { id: 'pap.collect', type: 'rocdate', keys: dateKeys('pap.collect') },
  { id: 'pap.recv', type: 'rocdate', keys: dateKeys('pap.recv') },
];

export const papDef: FormDef = {
  id: 'pap',
  fields,
  publicRules,
  staffRules,
  starred: [
    { label: '國籍', keys: ['pap.nationality'] },
    { label: '抹片車或社區巡迴服務', keys: ['pap.van'] },
    { label: '支付方式', keys: ['pap.pay'] },
    { label: '難判重做', keys: ['pap.redo'] },
    { label: '雙子宮頸', keys: ['pap.doubleCervix'] },
    { label: '抹片檢體取樣日期', keys: dateKeys('pap.collect') },
    { label: '抹片檢體取樣機構名稱及代碼', keys: ['pap.collectOrgName', 'pap.collectOrgCode'] },
    { label: '抹片檢體取樣醫事人員簽名', keys: ['pap.sigCollector'] },
    { label: '本次檢查是否合併 HPV 檢測服務', keys: ['pap.withHpv'] },
    { label: '做抹片目的', keys: ['pap.purpose'] },
    { label: '抹片細胞病理編號', keys: ['pap.cytoNo'] },
    { label: '抹片判讀機構名稱及代碼', keys: ['pap.readOrgName', 'pap.readOrgCode'] },
    { label: '抹片收到日期', keys: dateKeys('pap.recv') },
    { label: '檢體種類', keys: ['pap.specimenType'] },
    { label: '閱片方式', keys: ['pap.readMethod'] },
    { label: '抹片品質', keys: ['pap.quality'] },
    { label: '抹片尚可或難以判讀之原因', keys: ['pap.qualityReason'] },
    { label: '可能的感染', keys: ['pap.infection'] },
    { label: '細胞病理診斷', keys: ['pap.dx'] },
    { label: '檢驗者（Cytopathologist）簽名及代碼', keys: ['pap.sigCp', 'pap.cpCode'] },
    { label: '確診日期', keys: ['pap.cpM', 'pap.cpD'] },
  ],
  staffDefaults(publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    const idNo = typeof publicValues['profile.idNo'] === 'string' ? publicValues['profile.idNo'] : '';
    return {
      // 本國身分證預選本國，其餘（統一證號、護照號碼）預選外籍人士
      'pap.nationality': isTaiwanCitizenId(idNo) ? '1' : '2',
      'pap.van': '1',
      'pap.pay': '1',
      'pap.redo': '2',
      'pap.doubleCervix': '2',
      'pap.purpose': '1',
      'pap.collectOrgName': HOSPITAL_NAME,
      'pap.collectOrgCode': HOSPITAL_CODE,
      'pap.collectY': today.y,
      'pap.collectM': today.m,
      'pap.collectD': today.d,
    };
  },
};
