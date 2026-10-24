import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { formSettings } from '@/db/schema';
import { FORM_IDS } from '@/lib/forms/catalog';
import {
  describePeriod,
  formStatus,
  getFormSetting,
  listFormSettings,
  updateFormSetting,
} from '@/lib/forms/settings';
import { createUser, resetDb } from './helpers';

const at = (iso: string) => new Date(iso);

describe('開放狀態', () => {
  const now = at('2026-11-15T04:00:00Z');

  it('開關關閉時一律為關閉', () => {
    expect(formStatus({ isOpen: false, opensAt: null, closesAt: null }, now)).toBe('closed');
    expect(
      formStatus({ isOpen: false, opensAt: at('2026-11-01T00:00:00Z'), closesAt: at('2026-12-01T00:00:00Z') }, now),
    ).toBe('closed');
  });

  it('依開放期間判斷', () => {
    expect(formStatus({ isOpen: true, opensAt: null, closesAt: null }, now)).toBe('open');
    expect(formStatus({ isOpen: true, opensAt: at('2026-12-01T00:00:00Z'), closesAt: null }, now)).toBe('scheduled');
    expect(formStatus({ isOpen: true, opensAt: null, closesAt: at('2026-11-01T00:00:00Z') }, now)).toBe('ended');
    expect(
      formStatus({ isOpen: true, opensAt: at('2026-11-01T00:00:00Z'), closesAt: at('2026-12-01T00:00:00Z') }, now),
    ).toBe('open');
  });

  it('開始時間當下即開放，結束時間當下即結束', () => {
    expect(formStatus({ isOpen: true, opensAt: now, closesAt: null }, now)).toBe('open');
    expect(formStatus({ isOpen: true, opensAt: null, closesAt: now }, now)).toBe('ended');
  });

  it('開放期間的文字', () => {
    const opensAt = at('2026-11-01T00:00:00Z');
    const closesAt = at('2026-12-31T09:00:00Z');
    expect(describePeriod({ opensAt, closesAt })).toBe('2026/11/01 08:00 – 2026/12/31 17:00');
    expect(describePeriod({ opensAt, closesAt: null })).toBe('2026/11/01 08:00 起');
    expect(describePeriod({ opensAt: null, closesAt })).toBe('至 2026/12/31 17:00');
    expect(describePeriod({ opensAt: null, closesAt: null })).toBeNull();
  });
});

describe('開放設定', () => {
  beforeEach(resetDb);

  it('依表單順序列出 6 筆，預設關閉', async () => {
    const list = await listFormSettings();
    expect(list.map((s) => s.formId)).toEqual([...FORM_IDS]);
    expect(list.every((s) => !s.isOpen && s.opensAt === null && s.closesAt === null)).toBe(true);
  });

  it('資料列不見時視為關閉，更新時補回', async () => {
    const admin = await createUser({ role: 'admin' });
    await db.delete(formSettings).where(eq(formSettings.formId, 'fit'));
    expect(await getFormSetting('fit')).toMatchObject({ formId: 'fit', isOpen: false });

    const result = await updateFormSetting(admin.id, 'fit', { isOpen: true, opensAt: null, closesAt: null });
    expect(result).toEqual({ ok: true });
    expect(await getFormSetting('fit')).toMatchObject({ isOpen: true, updatedBy: admin.id });
  });

  it('管理者可更新開放設定', async () => {
    const admin = await createUser({ role: 'admin' });
    const input = { isOpen: true, opensAt: at('2026-11-01T00:00:00Z'), closesAt: at('2026-12-31T09:00:00Z') };
    expect(await updateFormSetting(admin.id, 'hpv', input)).toEqual({ ok: true });
    expect(await getFormSetting('hpv')).toMatchObject({ ...input, updatedBy: admin.id });
  });

  it('一般人員或停用的管理者不能更新', async () => {
    const staff = await createUser();
    const disabledAdmin = await createUser({ role: 'admin', status: 'disabled' });
    const input = { isOpen: true, opensAt: null, closesAt: null };

    expect(await updateFormSetting(staff.id, 'pap', input)).toEqual({ ok: false, reason: 'forbidden' });
    expect(await updateFormSetting(disabledAdmin.id, 'pap', input)).toEqual({ ok: false, reason: 'forbidden' });
    expect((await getFormSetting('pap')).isOpen).toBe(false);
  });

  it('結束時間不晚於開始時間時拒絕', async () => {
    const boss = await createUser({ role: 'superadmin' });
    const same = at('2026-11-01T00:00:00Z');
    expect(await updateFormSetting(boss.id, 'oral', { isOpen: true, opensAt: same, closesAt: same })).toEqual({
      ok: false,
      reason: 'invalid_period',
    });
  });
});
