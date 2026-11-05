import type { FieldSpec, Rule } from '../engine';
import { todayRoc } from '../format';
import { type Option, optionValues } from '../profile';

export const LABOR_UPLOAD_CONSENT: readonly Option[] = [['Y', '同意'], ['N', '不同意']];
export const LABOR_UPLOAD_YEARS: readonly Option[] = [['seven', '7 年'], ['custom', '自訂年數']];
export const LABOR_UPLOAD_USE: readonly Option[] = [['permanent', '自簽署日起永久'], ['custom', '自簽署日起自訂年數']];
export const LABOR_UPLOAD_REPRESENTATIVE: readonly Option[] = [['N', '無'], ['Y', '有法定代理人']];
const agreed = 'labor.uploadConsent=Y';
const representative = [agreed, 'labor.uploadHasRepresentative=Y'];
const choice = (options: readonly Option[], showIf?: FieldSpec['showIf']): FieldSpec => ({ part: 'public', kind: 'choice', options: optionValues(options), showIf });
const text = (maxLength: number, showIf: FieldSpec['showIf'] = agreed): FieldSpec => ({ part: 'public', kind: 'text', maxLength, showIf });

export const laborUploadFields: Record<string, FieldSpec> = {
  'labor.uploadConsent': choice(LABOR_UPLOAD_CONSENT),
  'labor.uploadYearsMode': choice(LABOR_UPLOAD_YEARS, agreed),
  'labor.uploadYears': text(3, [agreed, 'labor.uploadYearsMode=custom']),
  'labor.uploadUseMode': choice(LABOR_UPLOAD_USE, agreed),
  'labor.uploadUseYears': text(3, [agreed, 'labor.uploadUseMode=custom']),
  'labor.uploadCloud': { part: 'public', kind: 'flag', showIf: agreed },
  'labor.uploadSignature': { part: 'public', kind: 'image', showIf: agreed },
  'labor.uploadHasRepresentative': choice(LABOR_UPLOAD_REPRESENTATIVE, agreed),
  'labor.uploadRepresentativeName': text(40, representative),
  'labor.uploadRepresentativeIdNo': { ...text(20, representative), uppercase: true },
  'labor.uploadRepresentativeSignature': { part: 'public', kind: 'image', showIf: representative },
};
for (const prefix of ['labor.uploadFrom', 'labor.uploadSigned']) {
  for (const suffix of ['Y', 'M', 'D']) laborUploadFields[prefix + suffix] = text(suffix === 'Y' ? 3 : 2);
}
export const laborUploadRules: Rule[] = [
  { id: 'labor.uploadConsent', type: 'choice', keys: ['labor.uploadConsent'], required: true },
  { id: 'labor.uploadFrom', type: 'rocdate', keys: ['Y', 'M', 'D'].map(s => 'labor.uploadFrom' + s), required: true, showIf: agreed },
  { id: 'labor.uploadYearsMode', type: 'choice', keys: ['labor.uploadYearsMode'], required: true, showIf: agreed },
  { id: 'labor.uploadYears', type: 'number', keys: ['labor.uploadYears'], required: true, integer: true, min: 1, max: 999, showIf: [agreed, 'labor.uploadYearsMode=custom'] },
  { id: 'labor.uploadUseMode', type: 'choice', keys: ['labor.uploadUseMode'], required: true, showIf: agreed },
  { id: 'labor.uploadUseYears', type: 'number', keys: ['labor.uploadUseYears'], required: true, integer: true, min: 1, max: 999, showIf: [agreed, 'labor.uploadUseMode=custom'] },
  { id: 'labor.uploadHasRepresentative', type: 'choice', keys: ['labor.uploadHasRepresentative'], required: true, showIf: agreed },
  { id: 'labor.uploadRepresentativeName', type: 'text', keys: ['labor.uploadRepresentativeName'], required: true, showIf: representative },
  { id: 'labor.uploadRepresentativeIdNo', type: 'twid', keys: ['labor.uploadRepresentativeIdNo'], required: true, showIf: representative },
  { id: 'labor.uploadSignature', type: 'signature', keys: ['labor.uploadSignature'], required: true, showIf: agreed },
  { id: 'labor.uploadRepresentativeSignature', type: 'signature', keys: ['labor.uploadRepresentativeSignature'], required: true, showIf: representative },
  { id: 'labor.uploadSigned', type: 'rocdate', keys: ['Y', 'M', 'D'].map(s => 'labor.uploadSigned' + s), required: true, range: 'past', showIf: agreed },
];

/** 同意範圍或身分異動後，簽名須重新確認；不影響其他健檢答案。 */
export function laborUploadOnSet(key: string, value: string | string[], set: (key: string, value: string | string[]) => void) {
  if (key === 'labor.uploadConsent') {
    for (const field of Object.keys(laborUploadFields)) if (field !== key) set(field, '');
    if (value === 'Y') {
      const today = todayRoc();
      for (const suffix of ['Y', 'M', 'D'] as const) set('labor.uploadSigned' + suffix, today[suffix.toLowerCase() as 'y' | 'm' | 'd']);
    }
  } else {
    if (key === 'labor.uploadYearsMode') set('labor.uploadYears', '');
    if (key === 'labor.uploadUseMode') set('labor.uploadUseYears', '');
    if (key === 'labor.uploadHasRepresentative' && value !== 'Y') {
      for (const suffix of ['Name', 'IdNo', 'Signature']) set('labor.uploadRepresentative' + suffix, '');
    }
    if ((key.startsWith('labor.upload') && !key.endsWith('Signature')) || ['profile.name', 'profile.idNo', 'profile.sex', 'profile.birthY', 'profile.birthM', 'profile.birthD'].includes(key)) {
      set('labor.uploadSignature', '');
      set('labor.uploadRepresentativeSignature', '');
    }
  }
}

