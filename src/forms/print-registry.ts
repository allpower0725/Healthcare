import type { ComponentType } from 'react';
import type { PrintData } from '@/components/forms/print-kit';
import type { FormId } from '@/lib/forms/catalog';
import { AdultPrint } from './adult/print';
import { HpvPrint } from './hpv/print';

/** 原樣紙本；其餘表單在第 5b 階段加入 */
const FORM_PRINTS: Partial<Record<FormId, ComponentType<{ data: PrintData }>>> = {
  hpv: HpvPrint,
  adult: AdultPrint,
};

export function getFormPrint(formId: FormId) {
  return FORM_PRINTS[formId] ?? null;
}
