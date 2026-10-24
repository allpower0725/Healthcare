// 糞便潛血檢查（大腸癌篩檢）：健康署定量免疫法糞便潛血檢查服務檢查紀錄結果表單、
// 大腸癌篩檢衛教指引檢核表、大腸癌篩檢家族史及吸菸習慣資料表（附表五之六）
import type { FormValues } from '@/db/schema';
import type { FieldSpec, FormDef, Rule } from '../engine';
import { todayRoc } from '../format';
import { HOSPITAL_CODE, HOSPITAL_NAME } from '../hospital';
import {
  MOBILE_FIELDS,
  MOBILE_RULE,
  type Option,
  optionValues,
  PROFILE_FIELDS,
  PROFILE_RULES,
  SEX_ABORIGINAL_FIELDS,
  SEX_ABORIGINAL_RULES,
} from '../profile';

/** 吸菸或家族史任一題選「有」時，需另填附表五之六 */
export const FIT_ANNEX = 'fit.smoke=1||fit.famCrc=1||fit.famCa=1';
const ANNEX_AGREED = [FIT_ANNEX, 'fit.annexConsent=Y'];

export const FIT_OPTIONS = {
  smoke: [
    ['0', '無'],
    ['1', '有（含已戒菸）'],
  ],
  family: [
    ['0', '無'],
    ['1', '有'],
    ['2', '不知道'],
  ],
  noYes: [
    ['0', '無'],
    ['1', '有'],
  ],
  consent: [
    ['Y', '同意'],
    ['N', '不同意'],
  ],
  smokeHabit: [
    ['1', '已戒菸'],
    ['2', '吸 10 年以下，每天少於 20 支'],
    ['3', '吸 10 年以下，每天 20 支或以上'],
    ['4', '吸超過 10 年，每天少於 20 支'],
    ['5', '吸超過 10 年，每天 20 支或以上'],
  ],
  pay: [
    ['1', '預防保健'],
    ['3', '健保醫療給付'],
    ['4', '其他公務預算補助'],
    ['5', '自費健康檢查'],
    ['9', '其他'],
  ],
  site: [
    ['1', '社區或職場設站篩檢'],
    ['2', '門診'],
    ['3', '住院'],
    ['4', '郵寄'],
    ['5', '其他'],
  ],
  result: [
    ['0', '陰性'],
    ['1', '陽性'],
  ],
  reagent: [
    ['0', 'Eiken'],
    ['2', '其他'],
    ['3', 'Kyowa（HM-JACKarc）'],
  ],
  followed: [
    ['0', '沒有'],
    ['1', '有'],
  ],
  noReason: [
    ['1', '無法聯繫'],
    ['2', '出國'],
    ['3', '搬家'],
    ['4', '死亡'],
    ['5', '拒做'],
    ['6', '其他'],
  ],
  method: [
    ['1', '大腸鏡'],
    ['9', '其他'],
  ],
  dx: [
    ['0', '正常'],
    ['1', '痔瘡'],
    ['2', '潰瘍性大腸炎'],
    ['3', '息肉'],
    ['4', '大腸癌'],
    ['9', '其他'],
  ],
  polypCut: [
    ['1', '未切除'],
    ['2', '已完全切除'],
    ['3', '未完全切除'],
  ],
} satisfies Record<string, readonly Option[]>;

/** 附表五之六的家人：代號、稱謂、最多填幾位罹癌年紀、列印表頭 */
export const FIT_RELATIVES: readonly { value: string; label: string; max: number; head: string }[] = [
  { value: 'Father', label: '父親', max: 1, head: '父親' },
  { value: 'Mother', label: '母親', max: 1, head: '母親' },
  { value: 'Child', label: '子女', max: 3, head: '子女' },
  { value: 'Sib', label: '兄弟／姊妹', max: 3, head: '兄弟/姊妹' },
  { value: 'Pat', label: '其他父系親屬', max: 3, head: '其他父系親屬*' },
  { value: 'Mat', label: '其他母系親屬', max: 3, head: '其他母系親屬*' },
];

/** 附表五之六的兩張家族罹癌表；其他癌症另填癌別 */
export const FIT_ANNEX_TABLES = [
  { key: 'fit.t1', when: 'fit.famCrc=1', title: '大腸直腸癌家族史', question: '哪些家人得過大腸直腸癌？', withType: false },
  {
    key: 'fit.t2',
    when: 'fit.famCa=1',
    title: '其他癌症家族史',
    question: '哪些家人得過大腸癌以外的其他癌症？',
    withType: true,
  },
] as const;

/** 大腸癌篩檢衛教指引檢核表：步驟與評值項目（exclusive 為互斥選項；冒號開頭的項目原表單即如此） */
export const FIT_CHECKLIST: readonly { step: string; title: string; items: readonly (readonly [string, string])[]; exclusive?: string[] }[] = [
  {
    step: '【步驟一】',
    title: '評估民眾是否符合衛生福利部國民健康署大腸癌篩檢之補助條件',
    items: [
      ['age', '已評估:確認篩檢資格（年齡）'],
      ['done', '已評估:已執行過檢查'],
    ],
  },
  {
    step: '【步驟二】',
    title: '衛教後是否同意執行大腸癌篩檢（確認篩檢意願）',
    items: [
      ['purpose', '已說明:目的'],
      ['method', '已說明:方法'],
      ['body', '已說明:身體狀況:（排除條件）'],
      ['report', '已說明:結果、寄發報告時間'],
    ],
  },
  {
    step: '【步驟三】',
    title: '依各醫院提示篩檢方式加強提示提醒（建議定期追蹤）危險因子告知',
    items: [
      ['risk', ':已說明危險因子'],
      ['na', ':不適用'],
    ],
    exclusive: ['risk', 'na'],
  },
  {
    step: '【步驟四】',
    title: '提供採檢衛教及採檢管',
    items: [
      ['chart', '已執行:衛教說明示意圖'],
      ['demo', '已執行:回覆示教'],
    ],
  },
  { step: '【步驟五】', title: '追蹤提醒（促進繳回方法）', items: [['1', '已說明:電話、信件、其他方式']] },
  { step: '【步驟六】', title: '寄發報告陰性/陽性報告寄發建議事項結果', items: [['1', '已說明:諮詢窗口/諮詢專線']] },
];

const O = FIT_OPTIONS;
const choice = (part: FieldSpec['part'], options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({
  part,
  kind: 'choice',
  options: optionValues(options),
  showIf,
});
const text = (part: FieldSpec['part'], maxLength: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  part,
  kind: 'text',
  maxLength,
  ...extra,
});
const staffDate = (prefix: string, showIf?: FieldSpec['showIf']): Record<string, FieldSpec> => ({
  [`${prefix}Y`]: text('staff', 3, { digits: true, showIf }),
  [`${prefix}M`]: text('staff', 2, { digits: true, showIf }),
  [`${prefix}D`]: text('staff', 2, { digits: true, showIf }),
});
const dateKeys = (prefix: string) => [`${prefix}Y`, `${prefix}M`, `${prefix}D`] as const;

/** 家族罹癌表：勾選家人，再填癌別、罹癌人數、罹癌年紀（皆選填） */
function annexTableFields(table: (typeof FIT_ANNEX_TABLES)[number]): Record<string, FieldSpec> {
  const shown = [...ANNEX_AGREED, table.when];
  const out: Record<string, FieldSpec> = {
    [`${table.key}Rel`]: {
      part: 'public',
      kind: 'multi',
      options: FIT_RELATIVES.map((r) => r.value),
      showIf: shown,
    },
  };
  for (const r of FIT_RELATIVES) {
    const showIf = [...shown, `${table.key}Rel=${r.value}`];
    const k = `${table.key}${r.value}`;
    if (table.withType) out[`${k}Type`] = text('public', 12, { showIf });
    if (r.max > 1) out[`${k}N`] = text('public', 2, { digits: true, showIf });
    for (let i = 1; i <= r.max; i++) out[`${k}Age${i}`] = text('public', 3, { digits: true, showIf });
  }
  return out;
}

/** 衛教指引檢核表的一欄評值 */
function checklistFields(n: 1 | 2): Record<string, FieldSpec> {
  const k = `fit.edu${n}`;
  return {
    ...staffDate(k),
    [`${k}Name`]: text('staff', 20),
    [`${k}Pid`]: text('staff', 20),
    ...Object.fromEntries(
      FIT_CHECKLIST.map((s, i) => [
        `${k}S${i + 1}`,
        { part: 'staff', kind: 'multi', options: s.items.map(([v]) => v), exclusive: s.exclusive } satisfies FieldSpec,
      ]),
    ),
  };
}

/** 陽性個案才填確診結果 */
const POSITIVE = 'fit.result=1';
const FOLLOWED = [POSITIVE, 'fit.followed=1'];

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  'profile.sex': SEX_ABORIGINAL_FIELDS['profile.sex'],
  ...MOBILE_FIELDS,
  'fit.smoke': choice('public', O.smoke),
  'fit.smokeAge': text('public', 3, { digits: true, showIf: 'fit.smoke=1' }),
  'fit.famCrc': choice('public', O.family),
  'fit.famCa': choice('public', O.family),
  'fit.symptom': choice('public', O.noYes),
  // 附表五之六
  'fit.annexConsent': choice('public', O.consent, FIT_ANNEX),
  'fit.smokeHabit': choice('public', O.smokeHabit, [...ANNEX_AGREED, 'fit.smoke=1']),
  'fit.quitAge': text('public', 3, { digits: true, showIf: [...ANNEX_AGREED, 'fit.smoke=1', 'fit.smokeHabit=1'] }),
  ...annexTableFields(FIT_ANNEX_TABLES[0]),
  ...annexTableFields(FIT_ANNEX_TABLES[1]),
  'fit.sigAnnex': { part: 'public', kind: 'image', showIf: FIT_ANNEX },
  'fit.sigConsent': { part: 'public', kind: 'image' },

  'fit.pay': choice('staff', O.pay),
  'fit.site': choice('staff', O.site),
  // 個案檢查情形（檢查醫療院所）
  'fit.clinic': text('staff', 40),
  ...staffDate('fit.visit'),
  // 糞便潛血檢查結果（檢驗機構）
  'fit.lab': text('staff', 40),
  ...staffDate('fit.lab'),
  'fit.result': choice('staff', O.result),
  'fit.value': text('staff', 10),
  'fit.reagent': choice('staff', O.reagent),
  'fit.reagentOther': text('staff', 30, { showIf: 'fit.reagent=2' }),
  // 個案確診結果（陽性個案）
  'fit.followed': choice('staff', O.followed, POSITIVE),
  'fit.noReason': choice('staff', O.noReason, [POSITIVE, 'fit.followed=0']),
  'fit.noReasonOther': text('staff', 30, { showIf: [POSITIVE, 'fit.followed=0', 'fit.noReason=6'] }),
  'fit.confirmHospital': text('staff', 40, { showIf: FOLLOWED }),
  ...staffDate('fit.confirm', FOLLOWED),
  'fit.method': choice('staff', O.method, FOLLOWED),
  'fit.methodOther': text('staff', 30, { showIf: [...FOLLOWED, 'fit.method=9'] }),
  'fit.dx': { part: 'staff', kind: 'multi', options: optionValues(O.dx), exclusive: ['0'], showIf: FOLLOWED },
  'fit.dxOther': text('staff', 30, { showIf: [...FOLLOWED, 'fit.dx=9'] }),
  'fit.polypCut': choice('staff', O.polypCut, [...FOLLOWED, 'fit.dx=3']),
  // 衛教指引檢核表
  ...checklistFields(1),
  ...checklistFields(2),
  // 附表五之六的訪問人員（附表適用時）
  'fit.sigInterviewer': { part: 'staff', kind: 'image', showIf: FIT_ANNEX },
  ...staffDate('fit.iv', FIT_ANNEX),
};

const required = (key: string, showIf?: Rule['showIf'], msg?: string): Rule => ({
  id: key,
  type: 'choice',
  keys: [key],
  required: true,
  msg,
  showIf,
});

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  SEX_ABORIGINAL_RULES[0],
  MOBILE_RULE,
  required('fit.smoke'),
  required('fit.famCrc'),
  required('fit.famCa'),
  required('fit.symptom'),
  required('fit.annexConsent', FIT_ANNEX),
  required('fit.smokeHabit', [...ANNEX_AGREED, 'fit.smoke=1']),
  ...FIT_ANNEX_TABLES.map(
    (t): Rule => ({
      id: `${t.key}Rel`,
      type: 'multi',
      keys: [`${t.key}Rel`],
      required: true,
      msg: '請勾選是哪些家人',
      showIf: [...ANNEX_AGREED, t.when],
    }),
  ),
  { id: 'fit.sigAnnex', type: 'signature', keys: ['fit.sigAnnex'], required: true, showIf: FIT_ANNEX },
  { id: 'fit.sigConsent', type: 'signature', keys: ['fit.sigConsent'], required: true },
];

// 院所區的日期只檢查格式；附表的訪問日期取決於民眾的答案，不適用時已被清空，不需條件
const staffRules: Rule[] = [
  ...['fit.visit', 'fit.lab', 'fit.edu1', 'fit.edu2', 'fit.iv'].map(
    (prefix): Rule => ({ id: prefix, type: 'rocdate', keys: dateKeys(prefix) }),
  ),
  { id: 'fit.confirm', type: 'rocdate', keys: dateKeys('fit.confirm'), showIf: FOLLOWED },
];

export const fitDef: FormDef = {
  id: 'fit',
  fields,
  publicRules,
  staffRules,
  // 原表單沒有＊必填標記
  starred: [],
  staffDefaults(publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    const text = (key: string) => (typeof publicValues[key] === 'string' ? (publicValues[key] as string) : '');
    return {
      'fit.pay': '1',
      'fit.site': '2',
      'fit.clinic': `${HOSPITAL_NAME} ${HOSPITAL_CODE}`,
      'fit.visitY': today.y,
      'fit.visitM': today.m,
      'fit.visitD': today.d,
      'fit.edu1Y': today.y,
      'fit.edu1M': today.m,
      'fit.edu1D': today.d,
      'fit.edu1Name': text('profile.name'),
      'fit.edu1Pid': text('profile.idNo'),
      // 附表不適用時，送出前清理會清掉
      'fit.ivY': today.y,
      'fit.ivM': today.m,
      'fit.ivD': today.d,
    };
  },
};
