'use client';

import type { ComponentType } from 'react';
import type { FormValues } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { adultOnSet } from '@/lib/forms/defs/adult';
import { AdultPublic } from './adult/public';
import { AdultStaff } from './adult/staff';
import { HpvPublic, hpvOnSet } from './hpv/public';
import { HpvStaff } from './hpv/staff';

export type FormUi = {
  Public: ComponentType<{ prefilled: boolean }>;
  /** publicData：民眾填寫內容（唯讀，例：自動計算需要性別、出生日期） */
  Staff: ComponentType<{ publicData: FormValues }>;
  /** 民眾或院所修改某欄位時的連動（例：自動帶入其他題） */
  onSet?: (key: string, value: string | string[], set: (key: string, value: string | string[]) => void) => void;
};

/** 已完成電子化的表單畫面；其餘表單在第 5b 階段加入 */
const FORM_UI: Partial<Record<FormId, FormUi>> = {
  hpv: { Public: HpvPublic, Staff: HpvStaff, onSet: hpvOnSet },
  adult: { Public: AdultPublic, Staff: AdultStaff, onSet: adultOnSet },
};

export function getFormUi(formId: FormId) {
  return FORM_UI[formId] ?? null;
}
