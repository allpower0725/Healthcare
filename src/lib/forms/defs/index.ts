import type { FormId } from '../catalog';
import type { FormDef } from '../engine';
import { adultDef } from './adult';
import { hpvDef } from './hpv';

/** 已完成電子化的表單；其餘表單在第 5b 階段加入 */
const FORM_DEFS: Partial<Record<FormId, FormDef>> = {
  hpv: hpvDef,
  adult: adultDef,
};

export function getFormDef(formId: FormId) {
  return FORM_DEFS[formId] ?? null;
}
