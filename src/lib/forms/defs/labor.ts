import type { FieldSpec, FormDef, Rule } from '../engine';
import { type Option, optionValues, PROFILE_FIELDS, PROFILE_RULES, SEX } from '../profile';

export const LABOR_DISEASES: readonly Option[] = [
  ['hypertension', '高血壓'], ['diabetes', '糖尿病'], ['heart', '心臟病'], ['cancer', '癌症'],
  ['cataract', '白內障'], ['stroke', '中風'], ['epilepsy', '癲癇'], ['asthma', '氣喘'],
  ['copd', '慢性氣管炎、肺氣腫'], ['tuberculosis', '肺結核'], ['kidney', '腎臟病'],
  ['liver', '肝病'], ['anemia', '貧血'], ['ear', '中耳炎'], ['hearing', '聽力障礙'],
  ['thyroid', '甲狀腺疾病'], ['ulcer', '消化性潰瘍、胃炎'], ['reflux', '逆流性食道炎'],
  ['fracture', '骨折'], ['surgery', '手術開刀'], ['other', '其他慢性病'], ['none', '以上皆無'],
];
export const LABOR_SYMPTOMS: readonly Option[] = [
  ['cough', '咳嗽'], ['sputum', '咳痰'], ['breath', '呼吸困難'], ['chest', '胸痛'],
  ['palpitations', '心悸'], ['dizziness', '頭暈'], ['headache', '頭痛'], ['tinnitus', '耳鳴'],
  ['fatigue', '倦怠'], ['nausea', '噁心'], ['abdomen', '腹痛'], ['constipation', '便秘'],
  ['diarrhea', '腹瀉'], ['bloodyStool', '血便'], ['upperBack', '上背痛'], ['lowerBack', '下背痛'],
  ['numbness', '手腳麻痛'], ['joint', '關節疼痛'], ['urinary', '排尿不適'], ['frequency', '多尿、頻尿'],
  ['weakness', '手腳肌肉無力'], ['weightLoss', '體重減輕 3 公斤以上'], ['other', '其他症狀'], ['none', '以上皆無'],
];
export const LABOR_HAS: readonly Option[] = [['Y', '有'], ['N', '無']];
export const LABOR_REASON: readonly Option[] = [['new', '新進員工（受僱時）'], ['periodic', '定期檢查']];
export const LABOR_SHIFT: readonly Option[] = [['two', '兩班制'], ['three', '三班制'], ['four', '四班制'], ['other', '其他']];
export const LABOR_HABITS = [
  { key: 'smoke', title: '吸菸', question: '請問您過去一個月內是否有吸菸？', never: '從未吸菸', daily: '（幾乎）每天吸', occasional: '偶爾吸（不是天天）', quit: '已經戒菸', amount: '平均每天吸幾支', unit: '支', years: '已吸菸幾年' },
  { key: 'betel', title: '嚼食檳榔', question: '請問您最近六個月內是否有嚼食檳榔？', never: '從未嚼食檳榔', daily: '（幾乎）每天嚼', occasional: '偶爾嚼（不是天天）', quit: '已經戒嚼', amount: '平均每天嚼幾顆', unit: '顆', years: '已嚼幾年' },
  { key: 'drink', title: '喝酒', question: '請問您過去一個月內是否有喝酒？', never: '從未喝酒', daily: '（幾乎）每天喝', occasional: '偶爾喝（不是天天）', quit: '已經戒酒', amount: '平均每週喝幾次', unit: '次／週' },
] as const;
export function habitOptions(habit: (typeof LABOR_HABITS)[number]): readonly Option[] {
  return [['never', habit.never], ['daily', habit.daily], ['occasional', habit.occasional], ['quit', habit.quit]];
}

const text = (maxLength: number, showIf?: FieldSpec['showIf']): FieldSpec => ({ part: 'public', kind: 'text', maxLength, showIf });
const choice = (options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({ part: 'public', kind: 'choice', options: optionValues(options), showIf });
const fields: Record<string, FieldSpec> = Object.fromEntries(
  ['profile.idNo', 'profile.name', 'profile.birthY', 'profile.birthM', 'profile.birthD', 'profile.email'].map((key) => [key, PROFILE_FIELDS[key]]),
);
fields['profile.sex'] = choice(SEX);
fields['labor.company'] = text(60);
fields['labor.reason'] = choice(LABOR_REASON);
const rules: Rule[] = [
  ...PROFILE_RULES.filter((rule) => ['profile.idNo', 'profile.name', 'profile.birth', 'profile.email'].includes(rule.id)),
  { id: 'profile.sex', type: 'choice', keys: ['profile.sex'], required: true },
  { id: 'labor.company', type: 'text', keys: ['labor.company'], required: true },
  { id: 'labor.reason', type: 'choice', keys: ['labor.reason'], required: true },
];
for (const prefix of ['labor.hired', 'labor.exam']) {
  for (const suffix of ['Y', 'M', 'D']) fields[prefix + suffix] = text(suffix === 'Y' ? 3 : 2);
  rules.push({ id: prefix, type: 'rocdate', keys: ['Y', 'M', 'D'].map((s) => prefix + s) });
}
for (const job of ['current', 'previous']) {
  const prefix = `labor.${job}`;
  const showIf = `${prefix}Has=Y`;
  fields[prefix + 'Has'] = choice(LABOR_HAS);
  fields[prefix + 'Title'] = text(40, showIf);
  rules.push({ id: prefix + 'Has', type: 'choice', keys: [prefix + 'Has'], required: true });
  rules.push({ id: prefix + 'Title', type: 'text', keys: [prefix + 'Title'], required: true, showIf });
  for (const suffix of ['StartY', 'StartM', 'EndY', 'EndM', 'Years', 'Months']) fields[prefix + suffix] = text(suffix.endsWith('M') || suffix === 'Months' ? 2 : 3, showIf);
  rules.push({ id: prefix + 'Dates', type: 'monthrange', keys: ['StartY', 'StartM', 'EndY', 'EndM'].map((s) => prefix + s), showIf });
  rules.push({ id: prefix + 'Duration', type: 'duration', keys: [prefix + 'Years', prefix + 'Months'], showIf });
}
fields['labor.shift'] = choice(LABOR_HAS, 'labor.currentHas=Y');
fields['labor.shiftType'] = choice(LABOR_SHIFT, ['labor.currentHas=Y', 'labor.shift=Y']);
fields['labor.shiftOther'] = text(30, ['labor.currentHas=Y', 'labor.shift=Y', 'labor.shiftType=other']);
rules.push(
  { id: 'labor.shift', type: 'choice', keys: ['labor.shift'], required: true, showIf: 'labor.currentHas=Y' },
  { id: 'labor.shiftType', type: 'choice', keys: ['labor.shiftType'], required: true, showIf: ['labor.currentHas=Y', 'labor.shift=Y'] },
  { id: 'labor.shiftOther', type: 'text', keys: ['labor.shiftOther'], required: true, showIf: ['labor.currentHas=Y', 'labor.shift=Y', 'labor.shiftType=other'] },
);
for (const [key, max] of [['labor.hours1m', 168], ['labor.hours6m', 168], ['labor.sleep', 24]] as const) {
  fields[key] = text(7);
  rules.push({ id: key, type: 'number', keys: [key], min: 0, max });
}
for (const [key, options] of [['labor.diseases', LABOR_DISEASES], ['labor.symptoms', LABOR_SYMPTOMS]] as const) {
  fields[key] = { part: 'public', kind: 'multi', options: optionValues(options), exclusive: ['none'] };
  rules.push({ id: key, type: 'multi', keys: [key], required: true });
}
for (const disease of ['cancer', 'fracture', 'surgery', 'other']) {
  const key = `labor.${disease}Detail`;
  const showIf = `labor.diseases=${disease}`;
  fields[key] = text(40, showIf);
  rules.push({ id: key, type: 'text', keys: [key], required: true, showIf });
}
fields['labor.symptomOther'] = text(40, 'labor.symptoms=other');
rules.push({ id: 'labor.symptomOther', type: 'text', keys: ['labor.symptomOther'], required: true, showIf: 'labor.symptoms=other' });
for (const habit of LABOR_HABITS) {
  const prefix = `labor.${habit.key}`;
  fields[prefix] = choice(habitOptions(habit));
  rules.push({ id: prefix, type: 'choice', keys: [prefix], required: true });
  fields[prefix + 'Amount'] = text(7, `${prefix}=daily`);
  rules.push({ id: prefix + 'Amount', type: 'number', keys: [prefix + 'Amount'], required: true, min: 0.01, showIf: `${prefix}=daily` });
  if (habit.key !== 'drink') {
    fields[prefix + 'Years'] = text(6, `${prefix}=daily`);
    rules.push({ id: prefix + 'Years', type: 'number', keys: [prefix + 'Years'], required: true, min: 0, max: 120, showIf: `${prefix}=daily` });
  }
  for (const suffix of ['QuitY', 'QuitM']) fields[prefix + suffix] = text(suffix === 'QuitY' ? 3 : 2, `${prefix}=quit`);
  rules.push({ id: prefix + 'Quit', type: 'duration', keys: [prefix + 'QuitY', prefix + 'QuitM'], required: true, showIf: `${prefix}=quit` });
}
fields['labor.drinkType'] = text(20, 'labor.drink=daily');
fields['labor.drinkBottles'] = text(7, 'labor.drink=daily');
rules.push(
  { id: 'labor.drinkType', type: 'text', keys: ['labor.drinkType'], required: true, showIf: 'labor.drink=daily' },
  { id: 'labor.drinkBottles', type: 'number', keys: ['labor.drinkBottles'], min: 0.01, required: true, showIf: 'labor.drink=daily' },
);

export const laborDef: FormDef = {
  id: 'labor', fields, publicRules: rules, staffRules: [], starred: [], staffDefaults: () => ({}),
};
