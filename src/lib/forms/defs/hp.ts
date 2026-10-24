// 胃幽門螺旋桿菌檢測：健康署「糞便抗原檢測胃幽門螺旋桿菌服務」管理紀錄表（附表八之四）
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
  TRIBE_FIELDS,
  TRIBE_RULE,
} from '../profile';

const NO_YES: readonly Option[] = [
  ['N', '無'],
  ['Y', '有'],
];
const NEVER_QUIT_NOW_OTHER = (verb: string): readonly Option[] => [
  ['0', '從不'],
  ['1', '已戒'],
  ['2', `目前有${verb}`],
  ['3', '其他'],
];

export const HP_OPTIONS = {
  /** 原表單的原住民選項為「否、是」 */
  aboriginal: [
    ['N', '否'],
    ['Y', '是'],
  ],
  religion: [
    ['0', '無'],
    ['1', '天主教'],
    ['2', '基督教'],
    ['3', '佛教'],
    ['4', '道教'],
    ['5', '一貫道'],
    ['9', '其他'],
  ],
  job: [
    ['Y', '有'],
    ['N', '無'],
    ['R', '拒答'],
  ],
  marital: [
    ['1', '未婚'],
    ['2', '已婚'],
    ['9', '其他'],
  ],
  pmh: [
    ['none', '無'],
    ['gastritis', '胃炎'],
    ['gu', '胃潰瘍'],
    ['du', '十二指腸潰瘍'],
    ['gerd', '胃食道逆流'],
    ['tumor', '胃腫瘤'],
    ['gc', '胃癌'],
    ['hp', '胃幽門桿菌感染'],
    ['other', '其他'],
  ],
  noYes: NO_YES,
  family: [
    ['U', '不詳'],
    ['N', '無'],
    ['Y', '有'],
  ],
  relatives: [
    ['father', '父'],
    ['mother', '母'],
    ['spouse', '夫妻'],
    ['sibling', '兄弟姊妹'],
    ['child', '子女'],
    ['other', '其他'],
  ],
  medList: [
    ['1', '止痛藥'],
    ['2', '類固醇'],
    ['3', '抗血小板藥物'],
    ['4', '抗凝血劑'],
    ['5', '糖尿病用藥'],
    ['6', '使用鐵劑治療貧血'],
  ],
  antiplatelet: [
    ['1', '阿斯匹靈（Aspirin）'],
    ['2', '保栓通（Plavix）'],
    ['3', '其他'],
  ],
  anticoag: [
    ['1', '可邁丁（Coumadin）'],
    ['2', '其他'],
  ],
  dm: [
    ['1', '口服型控制血糖'],
    ['2', '注射型胰島素'],
  ],
  smoke: NEVER_QUIT_NOW_OTHER('吸'),
  drink: NEVER_QUIT_NOW_OTHER('喝'),
  betel: NEVER_QUIT_NOW_OTHER('嚼'),
  zeroOne: [
    ['0', '無'],
    ['1', '有'],
  ],
  pay: [
    ['1', '預防保健'],
    ['2', '健保醫療給付'],
    ['3', '其他公務預算補助'],
    ['4', '自費健康檢查'],
    ['5', '其他'],
  ],
} satisfies Record<string, readonly Option[]>;

/** 家族病史三題：題目、欄位代號；胃癌家族史的人數可勾「不詳」 */
export const HP_FAMILY: readonly { key: 'famHp' | 'famPu' | 'famGc'; title: string; unknownCount?: boolean }[] = [
  { key: 'famHp', title: '幽門桿菌家族史' },
  { key: 'famPu', title: '消化性潰瘍家族史（胃或十二指腸）' },
  { key: 'famGc', title: '胃癌家族史', unknownCount: true },
];

/** 生活型態：常常＝每週三次或以上 */
export const HP_LIFESTYLE: readonly { key: string; title: string; options: readonly Option[]; other?: string }[] = [
  { key: 'hp.smoke', title: '您有無吸菸習慣？', options: HP_OPTIONS.smoke, other: '其他吸菸情形' },
  { key: 'hp.drink', title: '您有無喝酒習慣？', options: HP_OPTIONS.drink, other: '其他喝酒情形' },
  { key: 'hp.betel', title: '您有無嚼檳榔習慣？', options: HP_OPTIONS.betel, other: '其他嚼檳榔情形' },
  { key: 'hp.pickled', title: '您是否常常食用醃漬食物，如鹹魚、醬瓜、豆瓣醬、酸菜等？', options: HP_OPTIONS.zeroOne },
  { key: 'hp.smoked', title: '您是否常常食用煙燻、燒烤、高香料的肉類，如香腸、烤肉等？', options: HP_OPTIONS.zeroOne },
  { key: 'hp.raw', title: '您是否常常食用生食，如生肉、生魚等？', options: HP_OPTIONS.zeroOne },
];

const O = HP_OPTIONS;
const choice = (options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({
  part: 'public',
  kind: 'choice',
  options: optionValues(options),
  showIf,
});
const multi = (options: readonly Option[], showIf?: FieldSpec['showIf'], exclusive?: string[]): FieldSpec => ({
  part: 'public',
  kind: 'multi',
  options: optionValues(options),
  exclusive,
  showIf,
});
const text = (maxLength: number, showIf?: FieldSpec['showIf'], digits?: boolean): FieldSpec => ({
  part: 'public',
  kind: 'text',
  maxLength,
  digits,
  showIf,
});
const flag = (showIf: FieldSpec['showIf']): FieldSpec => ({ part: 'public', kind: 'flag', showIf });
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

/** 曾罹患「無」以外的疾病時才問發生年份 */
export const PMH_DISEASE = `hp.pmh=${O.pmh
  .slice(1)
  .map(([v]) => v)
  .join('|')}`;

/** 家族病史：選「有」後勾選家人，並填人數或稱謂 */
function familyFields(key: string, unknownCount?: boolean): Record<string, FieldSpec> {
  const k = `hp.${key}`;
  const rel = (v: string) => `${k}Rel=${v}`;
  return {
    [k]: choice(O.family),
    [`${k}Rel`]: multi(O.relatives, `${k}=Y`),
    [`${k}Sib`]: text(2, rel('sibling'), true),
    [`${k}Child`]: text(2, rel('child'), true),
    [`${k}Other`]: text(10, rel('other')),
    [`${k}OtherN`]: text(2, rel('other'), true),
    ...(unknownCount
      ? {
          [`${k}SibU`]: flag(rel('sibling')),
          [`${k}ChildU`]: flag(rel('child')),
          [`${k}OtherU`]: flag(rel('other')),
        }
      : {}),
  };
}

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  ...SEX_ABORIGINAL_FIELDS,
  ...TRIBE_FIELDS,
  ...MOBILE_FIELDS,
  'hp.religion': choice(O.religion),
  'hp.religionOther': text(20, 'hp.religion=9'),
  'hp.job': choice(O.job),
  'hp.jobName': text(20, 'hp.job=Y'),
  'hp.marital': choice(O.marital),
  // 個人病史
  'hp.pmh': multi(O.pmh, undefined, ['none']),
  'hp.pmhOther': text(20, 'hp.pmh=other'),
  'hp.pmhYear': text(3, PMH_DISEASE, true),
  'hp.pmhYearU': flag(PMH_DISEASE),
  'hp.eradicate': choice(NO_YES),
  'hp.endoscopy': choice(NO_YES),
  'hp.endoYear': text(3, 'hp.endoscopy=Y', true),
  'hp.endoYearU': flag('hp.endoscopy=Y'),
  'hp.ppi': choice(NO_YES),
  'hp.allergy': choice(NO_YES),
  'hp.allergyDrug': text(30, 'hp.allergy=Y'),
  // 家族病史
  ...Object.assign({}, ...HP_FAMILY.map((f) => familyFields(f.key, f.unknownCount))),
  // 用藥史
  'hp.meds': choice(NO_YES),
  'hp.medList': multi(O.medList, 'hp.meds=Y'),
  'hp.antiplatelet': multi(O.antiplatelet, 'hp.medList=3'),
  'hp.antiplateletOther': text(20, 'hp.antiplatelet=3'),
  'hp.anticoag': multi(O.anticoag, 'hp.medList=4'),
  'hp.anticoagOther': text(20, 'hp.anticoag=2'),
  'hp.dm': multi(O.dm, 'hp.medList=5'),
  // 生活型態
  ...Object.fromEntries(
    HP_LIFESTYLE.flatMap((q) => [
      [q.key, choice(q.options)],
      ...(q.other ? [[`${q.key}Other`, text(20, `${q.key}=3`)]] : []),
    ]),
  ),
  'hp.sigConsent': { part: 'public', kind: 'image' },

  'hp.pay': { part: 'staff', kind: 'choice', options: optionValues(O.pay) },
  'hp.unit': staffText(30),
  'hp.unitCode': staffText(10, { digits: true }),
  ...staffDate('hp.visit'),
  ...staffDate('hp.visit2'),
};

const required = (key: string, msg?: string, showIf?: Rule['showIf']): Rule => ({
  id: key,
  type: 'choice',
  keys: [key],
  required: true,
  msg,
  showIf,
});

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  ...SEX_ABORIGINAL_RULES,
  TRIBE_RULE,
  MOBILE_RULE,
  required('hp.religion'),
  required('hp.job'),
  required('hp.marital'),
  { id: 'hp.pmh', type: 'multi', keys: ['hp.pmh'], required: true, msg: '請至少選擇一項；沒有請選「無」' },
  required('hp.eradicate'),
  required('hp.endoscopy'),
  required('hp.ppi'),
  required('hp.allergy'),
  ...HP_FAMILY.flatMap((f) => [
    required(`hp.${f.key}`),
    {
      id: `hp.${f.key}Rel`,
      type: 'multi',
      keys: [`hp.${f.key}Rel`],
      required: true,
      msg: '請勾選是哪些家人',
      showIf: `hp.${f.key}=Y`,
    } satisfies Rule,
  ]),
  required('hp.meds'),
  { id: 'hp.medList', type: 'multi', keys: ['hp.medList'], required: true, msg: '請勾選服用的藥物', showIf: 'hp.meds=Y' },
  ...HP_LIFESTYLE.map((q) => required(q.key)),
  { id: 'hp.sigConsent', type: 'signature', keys: ['hp.sigConsent'], required: true },
];

export const hpDef: FormDef = {
  id: 'hp',
  fields,
  publicRules,
  staffRules: [
    { id: 'hp.visit', type: 'rocdate', keys: dateKeys('hp.visit') },
    { id: 'hp.visit2', type: 'rocdate', keys: dateKeys('hp.visit2') },
  ],
  // 原表單沒有＊必填標記
  starred: [],
  staffDefaults(_publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    return {
      'hp.pay': '1',
      'hp.unit': HOSPITAL_NAME,
      'hp.unitCode': HOSPITAL_CODE,
      'hp.visitY': today.y,
      'hp.visitM': today.m,
      'hp.visitD': today.d,
    };
  },
};

/** 年份與「不詳」擇一：填了年份就取消不詳，勾了不詳就清空年份 */
const YEAR_UNKNOWN: Record<string, string> = {
  'hp.pmhYear': 'hp.pmhYearU',
  'hp.endoYear': 'hp.endoYearU',
  'hp.famGcSib': 'hp.famGcSibU',
  'hp.famGcChild': 'hp.famGcChildU',
  'hp.famGcOtherN': 'hp.famGcOtherU',
};
const UNKNOWN_YEAR = Object.fromEntries(Object.entries(YEAR_UNKNOWN).map(([a, b]) => [b, a]));

export function hpOnSet(key: string, value: string | string[], set: (key: string, value: string | string[]) => void) {
  if (YEAR_UNKNOWN[key] && value) set(YEAR_UNKNOWN[key], '');
  if (UNKNOWN_YEAR[key] && value) set(UNKNOWN_YEAR[key], '');
}
