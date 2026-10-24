import type { ComponentType } from 'react';
import type { PrintData } from '@/components/forms/print-kit';
import type { FormId } from '@/lib/forms/catalog';
import { AdultPrint } from './adult/print';
import { FitPrint } from './fit/print';
import { HpPrint } from './hp/print';
import { HpvPrint } from './hpv/print';
import { OralPrint } from './oral/print';
import { PapPrint } from './pap/print';

/** 原樣紙本（6 張） */
const FORM_PRINTS: Partial<Record<FormId, ComponentType<{ data: PrintData }>>> = {
  hpv: HpvPrint,
  pap: PapPrint,
  oral: OralPrint,
  hp: HpPrint,
  fit: FitPrint,
  adult: AdultPrint,
};

export function getFormPrint(formId: FormId) {
  return FORM_PRINTS[formId] ?? null;
}
