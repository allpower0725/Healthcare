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

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'hpv'));
});

describe('前台送出動作', () => {
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
