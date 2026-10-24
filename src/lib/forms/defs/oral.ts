// 口腔黏膜檢查：衛生福利部口腔黏膜檢查服務檢查紀錄結果表單（113 年 11 月修訂）
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

/** 部位圖底圖（寬 366、高 356） */
export const ORAL_MAP = { src: '/forms/oral-map.jpg', aspect: 366 / 356 };

/** 部位圖代碼說明 */
export const ORAL_MAP_LEGEND: readonly Option[] = [
  ['AU/AD', '口唇'],
  ['BR/BL', '頰黏膜'],
  ['CR/CL', '臼齒後三角區'],
  ['DR/DL', '上牙齦／齒槽黏膜'],
  ['ER/EL', '下牙齦／齒槽黏膜'],
  ['FR/FL', '舌'],
  ['GR/GL', '口底黏膜'],
  ['HR/HL', '硬腭'],
  ['IR/IL', '軟腭'],
  ['JR/JL', '扁桃體'],
  ['KR/KL', '口咽後壁黏膜'],
  ['L', '其他'],
  ['MR/ML', '頸部腫塊'],
];

export const ORAL_OPTIONS = {
  betel: [
    ['0', '無'],
    ['1', '已戒'],
    ['2', '嚼 10 年以下，每天少於 20 顆'],
    ['3', '嚼 10 年以下，每天 20 顆及以上'],
    ['4', '嚼超過 10 年，每天少於 20 顆'],
    ['5', '嚼超過 10 年，每天 20 顆及以上'],
  ],
  smoke: [
    ['0', '無'],
    ['1', '已戒'],
    ['2', '吸 10 年以下，每天少於 20 支'],
    ['3', '吸 10 年以下，每天 20 支及以上'],
    ['4', '吸超過 10 年，每天少於 20 支'],
    ['5', '吸超過 10 年，每天 20 支及以上'],
  ],
  noYes: [
    ['0', '無'],
    ['1', '有'],
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
    ['2', '醫療院所'],
  ],
  dept: [
    ['1', '牙科'],
    ['2', '耳鼻喉科'],
    ['3', '經衛生福利部核可之其他科別專科醫師／專案許可之西醫師'],
  ],
  /** 檢查結果：⓿ 未發現異常；其餘為轉介原因 */
  result: [
    ['0', '未發現以下需轉介之異常'],
    ['1', '疑似口腔癌'],
    ['2', '口腔內外不明原因之持續性腫塊'],
    ['3', '紅斑'],
    ['4', '紅白斑'],
    ['5', '疣狀增生'],
    ['71', '非均質性白斑'],
    ['72', '均質性厚白斑'],
    ['73', '均質性薄白斑'],
    ['76', '口腔黏膜下纖維化症（張口不易或舌頭活動困難）'],
    ['8', '約兩星期仍不癒之口腔潰瘍／糜爛'],
    ['9', '扁平苔癬'],
    ['10', '口腔黏膜不正常，但診斷未明'],
    ['99', '其他'],
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
  clinDx: [
    ['00', '無明顯異常'],
    ['20', '疑似口腔癌'],
    ['12', '紅斑'],
    ['13', '紅白斑'],
    ['08', '非均質性白斑'],
    ['09', '均質性厚白斑'],
    ['10', '均質性薄白斑'],
    ['14', '疣狀增生'],
    ['15', '口腔黏膜下纖維化症'],
    ['16', '扁平苔癬或類扁平苔癬反應'],
    ['99', '其他'],
  ],
  pathDx: [
    ['21', '口腔癌'],
    ['22', '上皮變異'],
    ['99', '其他'],
  ],
  pathGrade: [
    ['23', '輕度'],
    ['24', '中度'],
    ['25', '重度'],
  ],
  treat: [
    ['0', '無，個案僅需定期追蹤，目前無需治療，已給予衛教介入'],
    ['1', '有做手術、放療、化療或其他治療'],
    ['2', '個案拒絕治療'],
    ['99', '其他'],
  ],
} satisfies Record<string, readonly Option[]>;

const O = ORAL_OPTIONS;
/** 需轉介（檢查結果不是 ⓿）：顯示部位圖、轉診單與複檢結果 */
export const ORAL_REFER = `oral.result=${O.result
  .slice(1)
  .map(([v]) => v)
  .join('|')}`;

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
const staffDate = (prefix: string, showIf?: FieldSpec['showIf']): Record<string, FieldSpec> => ({
  [`${prefix}Y`]: staffText(3, { digits: true, showIf }),
  [`${prefix}M`]: staffText(2, { digits: true, showIf }),
  [`${prefix}D`]: staffText(2, { digits: true, showIf }),
});
const dateKeys = (prefix: string) => [`${prefix}Y`, `${prefix}M`, `${prefix}D`] as const;

const FOLLOWED = [ORAL_REFER, 'oral.followed=1'];

const fields: Record<string, FieldSpec> = {
  ...PROFILE_FIELDS,
  ...SEX_ABORIGINAL_FIELDS,
  ...MOBILE_FIELDS,
  'oral.betel': choice('public', O.betel),
  'oral.smoke': choice('public', O.smoke),
  'oral.symptom': choice('public', O.noYes),
  'oral.sigConsent': { part: 'public', kind: 'image' },

  'oral.pay': choice('staff', O.pay),
  'oral.site': choice('staff', O.site),
  'oral.dept': choice('staff', O.dept),
  // 口腔黏膜檢查情形（初檢醫師填寫）
  'oral.clinic': staffText(40),
  ...staffDate('oral.visit'),
  'oral.result': choice('staff', O.result),
  'oral.resultOther': staffText(30, { showIf: 'oral.result=99' }),
  'oral.mapMarks': { part: 'staff', kind: 'image', showIf: ORAL_REFER },
  'oral.sigDoctor': { part: 'staff', kind: 'image' },
  'oral.license': staffText(20),
  // 初篩疑似異常個案轉診單
  'oral.referHospital': staffText(30, { showIf: ORAL_REFER }),
  'oral.referDoctor': staffText(20, { showIf: ORAL_REFER }),
  'oral.referPhone': staffText(20, { showIf: ORAL_REFER }),
  // 個案複檢（確診）結果
  'oral.followed': choice('staff', O.followed, ORAL_REFER),
  'oral.noReason': choice('staff', O.noReason, [ORAL_REFER, 'oral.followed=0']),
  'oral.noReasonOther': staffText(30, { showIf: [ORAL_REFER, 'oral.followed=0', 'oral.noReason=6'] }),
  'oral.confirmHospital': staffText(40, { showIf: FOLLOWED }),
  ...staffDate('oral.confirm', FOLLOWED),
  'oral.biopsy': choice('staff', O.noYes, ORAL_REFER),
  'oral.clinDx': choice('staff', O.clinDx, ORAL_REFER),
  'oral.clinDxOther': staffText(30, { showIf: [ORAL_REFER, 'oral.clinDx=99'] }),
  'oral.pathDx': choice('staff', O.pathDx, ORAL_REFER),
  'oral.pathGrade': choice('staff', O.pathGrade, [ORAL_REFER, 'oral.pathDx=22']),
  'oral.pathDxOther': staffText(30, { showIf: [ORAL_REFER, 'oral.pathDx=99'] }),
  'oral.treat': choice('staff', O.treat, ORAL_REFER),
  'oral.treatHospital': staffText(40, { showIf: [ORAL_REFER, 'oral.treat=1'] }),
  'oral.refuseReason': staffText(40, { showIf: [ORAL_REFER, 'oral.treat=2'] }),
  'oral.treatOther': staffText(40, { showIf: [ORAL_REFER, 'oral.treat=99'] }),
};

const publicRules: Rule[] = [
  ...PROFILE_RULES,
  ...SEX_ABORIGINAL_RULES,
  MOBILE_RULE,
  { id: 'oral.betel', type: 'choice', keys: ['oral.betel'], required: true },
  { id: 'oral.smoke', type: 'choice', keys: ['oral.smoke'], required: true },
  { id: 'oral.symptom', type: 'choice', keys: ['oral.symptom'], required: true },
  { id: 'oral.sigConsent', type: 'signature', keys: ['oral.sigConsent'], required: true },
];

const staffRules: Rule[] = [
  { id: 'oral.visit', type: 'rocdate', keys: dateKeys('oral.visit') },
  { id: 'oral.confirm', type: 'rocdate', keys: dateKeys('oral.confirm'), showIf: FOLLOWED },
];

export const oralDef: FormDef = {
  id: 'oral',
  fields,
  publicRules,
  staffRules,
  // 原表單沒有＊必填標記
  starred: [],
  staffDefaults(_publicValues: FormValues, now: Date) {
    const today = todayRoc(now);
    return {
      'oral.pay': '1',
      'oral.site': '2',
      'oral.clinic': `${HOSPITAL_NAME} ${HOSPITAL_CODE}`,
      'oral.visitY': today.y,
      'oral.visitM': today.m,
      'oral.visitD': today.d,
    };
  },
};
