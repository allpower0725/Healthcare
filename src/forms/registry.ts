'use client';

import type { ComponentType } from 'react';
import type { FormValues } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { adultOnSet } from '@/lib/forms/defs/adult';
import { hpOnSet } from '@/lib/forms/defs/hp';
import { AdultPublic } from './adult/public';
import { AdultStaff } from './adult/staff';
import { FitPublic } from './fit/public';
import { FitStaff } from './fit/staff';
import { HpPublic } from './hp/public';
import { HpStaff } from './hp/staff';
import { HpvPublic, hpvOnSet } from './hpv/public';
import { HpvStaff } from './hpv/staff';
import { OralPublic } from './oral/public';
import { OralStaff } from './oral/staff';
import { PapPublic } from './pap/public';
import { PapStaff } from './pap/staff';

export type FormUi = {
  Public: ComponentType<{ prefilled: boolean }>;
  /** publicData：民眾填寫內容（唯讀，例：自動計算需要性別、出生日期） */
  Staff: ComponentType<{ publicData: FormValues }>;
  /** 民眾或院所修改某欄位時的連動（例：自動帶入其他題） */
  onSet?: (key: string, value: string | string[], set: (key: string, value: string | string[]) => void) => void;
};

/** 已完成電子化的表單畫面（6 張） */
const FORM_UI: Partial<Record<FormId, FormUi>> = {
  hpv: { Public: HpvPublic, Staff: HpvStaff, onSet: hpvOnSet },
  pap: { Public: PapPublic, Staff: PapStaff },
  oral: { Public: OralPublic, Staff: OralStaff },
  hp: { Public: HpPublic, Staff: HpStaff, onSet: hpOnSet },
  fit: { Public: FitPublic, Staff: FitStaff },
  adult: { Public: AdultPublic, Staff: AdultStaff, onSet: adultOnSet },
};

export function getFormUi(formId: FormId) {
  return FORM_UI[formId] ?? null;
}
