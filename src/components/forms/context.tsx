'use client';

import { createContext, useContext } from 'react';
import type { FormValues } from '@/db/schema';
import type { Condition, FormDef } from '@/lib/forms/engine';

export type FormContextValue = {
  def: FormDef;
  values: FormValues;
  set: (key: string, value: string | string[]) => void;
  /** 依規則 id 的錯誤訊息 */
  errors: Record<string, string>;
  /** 離開欄位時驗證單一規則 */
  validate: (ruleId: string) => void;
  readOnly: boolean;
  holds: (condition: Condition | undefined) => boolean;
};

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('表單元件必須放在 FormContext 之內');
  return ctx;
}

/** 讀取文字欄位的值 */
export function useText(name: string) {
  const { values } = useFormContext();
  const v = values[name];
  return typeof v === 'string' ? v : '';
}
