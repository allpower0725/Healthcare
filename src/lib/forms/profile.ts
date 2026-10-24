// 6 張表單共用的基本資料欄位（名稱以 profile. 開頭，同一裝置填過會自動帶入其他表單）
import type { FormValues } from '@/db/schema';
import type { FieldSpec, Rule } from './engine';
import { splitPhone, splitSuffix } from './format';
import { TW_COUNTIES } from './tw-districts';

export type Option = readonly [value: string, label: string];
export const optionValues = (options: readonly Option[]) => options.map(([value]) => value);

export const EDUCATION: readonly Option[] = [
  ['1', '無'],
  ['2', '小學'],
  ['3', '國（初）中'],
  ['4', '高中（職）'],
  ['5', '專科、大學'],
  ['6', '研究所以上'],
  ['7', '拒答'],
];

export const SEX: readonly Option[] = [
  ['M', '男'],
  ['F', '女'],
];

export const ABORIGINAL: readonly Option[] = [
  ['Y', '是'],
  ['N', '否'],
];

const text = (maxLength: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  part: 'public',
  kind: 'text',
  maxLength,
  ...extra,
});

export const PROFILE_FIELDS: Record<string, FieldSpec> = {
  'profile.idNo': text(12, { uppercase: true }),
  'profile.name': text(40),
  'profile.birthY': text(3, { digits: true }),
  'profile.birthM': text(2, { digits: true }),
  'profile.birthD': text(2, { digits: true }),
  'profile.phone': text(20),
  /** 選填 */
  'profile.email': text(100),
  'profile.edu': { part: 'public', kind: 'choice', options: optionValues(EDUCATION) },
  'profile.addrCounty': { part: 'public', kind: 'choice', options: TW_COUNTIES },
  'profile.addrTown': { part: 'public', kind: 'town', countyKey: 'profile.addrCounty' },
  'profile.addrVillage': text(12),
  'profile.addrLin': text(4),
  'profile.addrRoad': text(16),
  'profile.addrSec': text(4),
  'profile.addrLane': text(6),
  'profile.addrAlley': text(6),
  'profile.addrNo': text(10),
  'profile.addrFloor': text(8),
};

export const PROFILE_RULES: readonly Rule[] = [
  { id: 'profile.idNo', type: 'twid', keys: ['profile.idNo'], required: true },
  { id: 'profile.name', type: 'text', keys: ['profile.name'], required: true, msg: '請填寫姓名' },
  {
    id: 'profile.birth',
    type: 'rocdate',
    keys: ['profile.birthY', 'profile.birthM', 'profile.birthD'],
    required: true,
    range: 'birth',
    msg: '請填寫出生日期',
  },
  { id: 'profile.phone', type: 'phone', keys: ['profile.phone'], required: true },
  { id: 'profile.email', type: 'email', keys: ['profile.email'] },
  { id: 'profile.edu', type: 'choice', keys: ['profile.edu'], required: true },
  {
    id: 'profile.addr',
    type: 'address',
    keys: ['profile.addrCounty', 'profile.addrTown', 'profile.addrVillage', 'profile.addrRoad', 'profile.addrNo'],
    required: true,
  },
];

/** 戶籍地址（只需縣市與鄉鎮市區；HPV、子宮頸抹片使用） */
export const REGISTERED_REGION_FIELDS: Record<string, FieldSpec> = {
  'profile.regSame': { part: 'public', kind: 'flag' },
  'profile.regCounty': { part: 'public', kind: 'choice', options: TW_COUNTIES, showIf: 'profile.regSame!=1' },
  'profile.regTown': {
    part: 'public',
    kind: 'town',
    countyKey: 'profile.regCounty',
    showIf: 'profile.regSame!=1',
  },
};

export const REGISTERED_REGION_RULE: Rule = {
  id: 'profile.reg',
  type: 'region',
  keys: ['profile.regCounty', 'profile.regTown'],
  required: true,
  showIf: 'profile.regSame!=1',
};

/** 性別、是否為原住民（成人預防保健等表單使用） */
export const SEX_ABORIGINAL_FIELDS: Record<string, FieldSpec> = {
  'profile.sex': { part: 'public', kind: 'choice', options: optionValues(SEX) },
  'profile.aboriginal': { part: 'public', kind: 'choice', options: optionValues(ABORIGINAL) },
};

export const SEX_ABORIGINAL_RULES: readonly Rule[] = [
  { id: 'profile.sex', type: 'choice', keys: ['profile.sex'], required: true },
  { id: 'profile.aboriginal', type: 'choice', keys: ['profile.aboriginal'], required: true },
];

/** 原住民族別（胃幽門螺旋桿菌使用；選「是」原住民才填） */
export const TRIBE_FIELDS: Record<string, FieldSpec> = {
  'profile.tribe': text(12, { showIf: 'profile.aboriginal=Y' }),
};

export const TRIBE_RULE: Rule = {
  id: 'profile.tribe',
  type: 'text',
  keys: ['profile.tribe'],
  required: true,
  msg: '請填寫族別',
  showIf: 'profile.aboriginal=Y',
};

/** 手機（選填；口腔黏膜、胃幽門螺旋桿菌、糞便潛血使用） */
export const MOBILE_FIELDS: Record<string, FieldSpec> = {
  'profile.mobile': text(20),
};

export const MOBILE_RULE: Rule = { id: 'profile.mobile', type: 'phone', keys: ['profile.mobile'] };

/** 戶籍地只需縣市（成人預防保健）；與現住址相同、縣市欄位和戶籍地址共用 */
export const REGISTERED_COUNTY_FIELDS: Record<string, FieldSpec> = {
  'profile.regSame': REGISTERED_REGION_FIELDS['profile.regSame'],
  'profile.regCounty': REGISTERED_REGION_FIELDS['profile.regCounty'],
};

export const REGISTERED_COUNTY_RULE: Rule = {
  id: 'profile.regCounty',
  type: 'choice',
  keys: ['profile.regCounty'],
  required: true,
  msg: '請選擇戶籍地縣市',
  showIf: 'profile.regSame!=1',
};

const TOWN_GROUP: Record<string, string> = { 鄉: '鄉鎮', 鎮: '鄉鎮', 市: '市區', 區: '市區' };

/**
 * 紙本格式需要的衍生值：地址拆成「臺中＿＿市」、電話拆成區碼與號碼、戶籍地址沿用現住址；
 * 手機欄未填而聯絡電話是手機號碼時，手機沿用聯絡電話
 */
export function deriveProfile(values: FormValues): Record<string, string> {
  const t = (key: string) => {
    const v = values[key];
    return typeof v === 'string' ? v : '';
  };
  const county = splitSuffix(t('profile.addrCounty'), ['縣', '市']);
  const town = splitSuffix(t('profile.addrTown'), ['鄉', '鎮', '市', '區']);
  const village = splitSuffix(t('profile.addrVillage'), ['村', '里']);
  const road = splitSuffix(t('profile.addrRoad'), ['路', '街']);
  const phone = splitPhone(t('profile.phone'));
  const regSame = t('profile.regSame') === '1';
  const regCounty = regSame ? county : splitSuffix(t('profile.regCounty'), ['縣', '市']);
  const regTown = regSame ? town : splitSuffix(t('profile.regTown'), ['鄉', '鎮', '市', '區']);
  return {
    'd.countyBase': county.base,
    'd.countySfx': county.sfx,
    'd.townBase': town.base,
    'd.townSfx': TOWN_GROUP[town.sfx] ?? '',
    // 部分原表單的鄉、鎮、市、區分開圈選
    'd.townSfxRaw': town.sfx,
    'd.villageBase': village.base,
    'd.villageSfx': village.sfx,
    'd.roadBase': road.base,
    'd.roadSfx': road.sfx,
    'd.phoneArea': phone.area,
    'd.phoneNum': phone.num,
    'd.mobile': t('profile.mobile') || (/^09\d{8}$/.test(t('profile.phone').replace(/\D/g, '')) ? t('profile.phone') : ''),
    'd.regCountyBase': regCounty.base,
    'd.regCountySfx': regCounty.sfx,
    'd.regTownBase': regTown.base,
    'd.regTownSfx': TOWN_GROUP[regTown.sfx] ?? '',
  };
}
