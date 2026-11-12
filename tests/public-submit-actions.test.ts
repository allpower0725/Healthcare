import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { formSettings, submissions } from '@/db/schema';
import { loadDeviceSubmission, recoverDeviceSubmission, resubmitForm, returnForm, submitForm } from '@/app/f/[formId]/actions';
import { completeSubmission, getSubmission } from '@/lib/submissions/service';
import { readDeviceToken } from '@/lib/submissions/device';
import { hpvPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

vi.mock('@/lib/submissions/device', () => ({
  ensureDeviceToken: vi.fn(async () => 'action-test-device'),
  readDeviceToken: vi.fn(async () => 'action-test-device'),
  clearDeviceToken: vi.fn(async () => {}),
}));
// 本檔保留案件重試整合測試；實際驗證與拒絕異動另由 public-protection 測試覆蓋。
vi.mock('@/lib/security/recaptcha', () => ({ verifyRecaptcha: vi.fn(async () => ({ ok: true })) }));

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'hpv'));
});

describe('前台送出動作', () => {
  it.each([
    ['national_id', 'A123456788'], ['national_id', 'P12345'],
    ['resident_id', 'AB12345678'], ['resident_id', 'A123456789'],
    ['passport', 'P12-345'], ['passport', 'A123456789012345678901'], ['', 'A123456789'],
  ])('直接呼叫伺服器也拒絕錯誤證件 %s，不寫入資料', async (type, number) => {
    const result = await submitForm('hpv', { ...hpvPublicSample(), 'profile.idType': type, 'profile.idNo': number }, randomUUID());
    expect(result).toMatchObject({ ok: false, reason: 'invalid', errors: { 'profile.idNo': expect.any(String) } });
    expect(await db.select().from(submissions)).toHaveLength(0);
  });

  it('護照前導零與明確種類會一併儲存，修改重送不能改為其他種類', async () => {
    const sample = { ...hpvPublicSample(), 'profile.idType': 'passport', 'profile.idNo': '001234567' };
    const first = await submitForm('hpv', sample, randomUUID());
    if (!first.ok) throw new Error(first.reason);
    expect((await getSubmission(first.id))?.publicData).toMatchObject({ 'profile.idType': 'passport', 'profile.idNo': '001234567' });
    await returnForm(first.id);
    expect(await resubmitForm(first.id, { ...sample, 'profile.idType': 'national_id' }, first.submittedAt)).toMatchObject({ ok: true });
    expect((await getSubmission(first.id))?.publicData['profile.idType']).toBe('passport');
  });

  it('遺失請求編號而改用首次送出入口，也不能改掉既有問卷的證件種類', async () => {
    const first = await submitForm('hpv', hpvPublicSample(), randomUUID());
    if (!first.ok) throw new Error(first.reason);
    await returnForm(first.id);
    expect(await submitForm('hpv', { ...hpvPublicSample(), 'profile.idType': 'passport' }, randomUUID()))
      .toMatchObject({ ok: false, reason: 'invalid' });
    expect((await getSubmission(first.id))?.publicData['profile.idType']).toBe('national_id');
    expect(await db.select().from(submissions)).toHaveLength(1);
  });

  it('回應遺失重試仍回傳同一編號與原送出時間，包含院所最新鎖定狀態', async () => {
    const requestId = randomUUID();
    const first = await submitForm('hpv', hpvPublicSample(), requestId);
    expect(first).toMatchObject({ ok: true, id: requestId, status: 'submitted' });
    const row = (await getSubmission(requestId))!;
    expect(first.ok && first.submittedAt).toBe(row.publicSubmittedAt.toISOString());
    expect(await submitForm('hpv', hpvPublicSample(), requestId)).toEqual(first);
    const staff = await createUser();
    await completeSubmission(staff.id, requestId, row.version, {});
    expect(await submitForm('hpv', hpvPublicSample(), requestId)).toEqual({ ...first, status: 'completed' });
    expect(await db.select().from(submissions)).toHaveLength(1);
  });

  it('退回後再次送出及重試全程使用原編號與同一批次時間', async () => {
    const first = await submitForm('hpv', hpvPublicSample(), randomUUID());
    if (!first.ok) throw new Error(first.reason);
    await returnForm(first.id);
    const changed = { ...hpvPublicSample(), 'profile.name': '更正後姓名' };
    const updated = await resubmitForm(first.id, changed, first.submittedAt);
    expect(updated).toMatchObject({ ok: true, id: first.id, status: 'submitted' });
    expect(await resubmitForm(first.id, changed, first.submittedAt)).toEqual(updated);
    expect(await db.select().from(submissions)).toHaveLength(1);
  });

  it('遺失暫存編號可憑原裝置恢復；其他裝置及錯誤表單不能讀取', async () => {
    const first = await submitForm('hpv', hpvPublicSample(), randomUUID());
    if (!first.ok) throw new Error(first.reason);
    await returnForm(first.id);
    const recovered = await recoverDeviceSubmission('hpv', hpvPublicSample()['profile.idNo']);
    expect(recovered).toMatchObject({ id: first.id, status: 'returned' });
    expect(recovered).not.toHaveProperty('staffData');
    expect(await loadDeviceSubmission(first.id, 'pap')).toBeNull();
    vi.mocked(readDeviceToken).mockResolvedValueOnce('unrelated-device');
    expect(await recoverDeviceSubmission('hpv', hpvPublicSample()['profile.idNo'])).toBeNull();
  });

  it('非法請求編號不建立資料', async () => {
    expect(await submitForm('hpv', hpvPublicSample(), 'invalid-uuid')).toEqual({ ok: false, reason: 'not_found' });
    expect(await db.select().from(submissions)).toHaveLength(0);
  });
});
