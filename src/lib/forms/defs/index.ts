import type { FormId } from '../catalog';
import type { FormDef } from '../engine';
import { adultDef } from './adult';
import { fitDef } from './fit';
import { hpDef } from './hp';
import { hpvDef } from './hpv';
import { oralDef } from './oral';
import { papDef } from './pap';

/** 已完成電子化的表單（6 張） */
const FORM_DEFS: Partial<Record<FormId, FormDef>> = {
  hpv: hpvDef,
  pap: papDef,
  oral: oralDef,
  hp: hpDef,
  fit: fitDef,
  adult: adultDef,
};

export function getFormDef(formId: FormId) {
  return FORM_DEFS[formId] ?? null;
}
