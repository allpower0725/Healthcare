'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormValues } from '@/db/schema';
import { type Condition, conditionsHold, type FormDef, type Rule, validateRules } from '@/lib/forms/engine';
import type { FormContextValue } from './context';

type Options = {
  rules: readonly Rule[];
  readOnly?: boolean;
  onSet?: (key: string, value: string | string[], set: (key: string, value: string | string[]) => void) => void;
  /** 每次值改變後呼叫（例：自動暫存） */
  onChange?: (values: FormValues) => void;
};

/** 表單狀態：值、錯誤訊息（只顯示驗證過的欄位）、條件判斷 */
export function useFormState(def: FormDef, initial: FormValues, options: Options) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 同一次事件裡連續修改、離開欄位時驗證，都要讀到最新的值
  const latest = useRef(values);
  const opts = useRef(options);
  opts.current = options;

  const revalidateShown = useCallback((prev: Record<string, string>) => {
    const shown = Object.keys(prev);
    if (shown.length === 0) return prev;
    const rules = opts.current.rules.filter((r) => shown.includes(r.id));
    return validateRules(rules, latest.current);
  }, []);

  const set = useCallback(
    (key: string, value: string | string[]) => {
      const apply = (k: string, v: string | string[]) => {
        latest.current = { ...latest.current, [k]: v };
      };
      apply(key, value);
      opts.current.onSet?.(key, value, apply);
      setValues(latest.current);
      setErrors(revalidateShown);
      opts.current.onChange?.(latest.current);
    },
    [revalidateShown],
  );

  const validate = useCallback((ruleId: string) => {
    const rule = opts.current.rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const message = validateRules([rule], latest.current)[ruleId];
    setErrors((prev) => {
      if (message === prev[ruleId]) return prev;
      const next = { ...prev };
      if (message) next[ruleId] = message;
      else delete next[ruleId];
      return next;
    });
  }, []);

  /** 驗證全部規則並顯示錯誤，回傳錯誤（依規則順序） */
  const validateAll = useCallback(() => {
    const result = validateRules(opts.current.rules, latest.current);
    setErrors(result);
    return result;
  }, []);

  const replace = useCallback((next: FormValues) => {
    latest.current = next;
    setValues(next);
    setErrors({});
  }, []);

  const ctx = useMemo<FormContextValue>(
    () => ({
      def,
      values,
      set,
      errors,
      validate,
      readOnly: !!options.readOnly,
      holds: (condition: Condition | undefined) => conditionsHold(condition, values),
    }),
    [def, values, set, errors, validate, options.readOnly],
  );

  return { ctx, values, latest, errors, setErrors, validateAll, replace };
}
