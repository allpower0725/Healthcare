import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { formSettings, submissions } from '@/db/schema';
import {
  completeSubmission, createPublicSubmission, findRecoverableSubmission, getSubmission,
  listEvents, resubmitPublic, returnToPublic, saveStaffData, voidSubmission,
} from '@/lib/submissions/service';
import { fitPublicSample, hpvPublicSample, papPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

const DEVICE = 'public-submit-retry-device';

beforeEach(async () => {
  await resetDb();
  await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'hpv'));
});

describe('民眾送出重試防護', () => {
  it('退回修改後遺失原編號，新增入口仍更新原案件', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    await returnToPublic(first.id, DEVICE);
    await db.update(formSettings).set({ isOpen: false }).where(eq(formSettings.formId, 'hpv'));
    const retry = await createPublicSubmission('hpv', { ...hpvPublicSample(), 'profile.name': '修改後姓名' }, DEVICE);
    expect(retry).toEqual(first);
    expect(await db.select().from(submissions)).toHaveLength(1);
    expect((await getSubmission(first.id))?.name).toBe('修改後姓名');
    expect((await listEvents(first.id)).map(e => e.action)).toEqual(['submitted', 'returned', 'resubmitted']);
  });

  it('同一裝置的並行重送只建立一筆、一次送出紀錄', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      createPublicSubmission('hpv', hpvPublicSample(), DEVICE),
    ));
    expect(results.every(result => result.ok)).toBe(true);
    expect(new Set(results.map(result => result.ok && result.id)).size).toBe(1);
    const rows = await db.select().from(submissions);
    expect(rows).toHaveLength(1);
    expect(await listEvents(rows[0].id)).toHaveLength(1);
  });

  it('固定首次請求編號：回應遺失後仍回傳原筆，表單關閉也不新增', async () => {
    const requestId = randomUUID();
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    expect(first).toEqual({ ok: true, id: requestId });
    await db.update(formSettings).set({ isOpen: false });
    const before = await getSubmission(requestId);
    expect(await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId)).toEqual(first);
    expect(await getSubmission(requestId)).toEqual(before);
    expect(await listEvents(requestId)).toHaveLength(1);
  });

  it('同一請求在院所完成後重試仍沿用原筆；新一次服務建立新筆且保留歷史', async () => {
    const requestId = randomUUID();
    await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    const staff = await createUser();
    await completeSubmission(staff.id, requestId, 1, { 'hpv.specimenNo': 'PREVIOUS-VISIT' });
    const completed = await getSubmission(requestId);
    expect(await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId))
      .toEqual({ ok: true, id: requestId });
    const next = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), randomUUID());
    expect(next.ok && next.id !== requestId).toBe(true);
    expect(await db.select().from(submissions)).toHaveLength(2);
    expect(await getSubmission(requestId)).toEqual(completed);
  });

  it('相同身分證號的另一個裝置不可覆蓋原案件或接管請求編號', async () => {
    const requestId = randomUUID();
    await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    await returnToPublic(requestId, DEVICE);
    const original = await getSubmission(requestId);
    expect(await createPublicSubmission('hpv', hpvPublicSample(), 'other-device', new Date(), requestId))
      .toEqual({ ok: false, reason: 'not_found' });
    const separate = await createPublicSubmission('hpv', hpvPublicSample(), 'other-device', new Date(), randomUUID());
    expect(separate.ok && separate.id !== requestId).toBe(true);
    expect(await getSubmission(requestId)).toEqual(original);
    expect(await findRecoverableSubmission('hpv', hpvPublicSample()['profile.idNo'], 'other-unrelated-device')).toBeNull();
  });

  it('表單種類不同時不能以同一請求編號覆蓋', async () => {
    const requestId = randomUUID();
    await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'pap'));
    expect(await createPublicSubmission('pap', papPublicSample(), DEVICE, new Date(), requestId))
      .toEqual({ ok: false, reason: 'not_found' });
    expect(await db.select().from(submissions)).toHaveLength(1);
    expect((await getSubmission(requestId))?.formId).toBe('hpv');
  });

  it('過期憑證不得恢復或覆蓋舊案件', async () => {
    const requestId = randomUUID();
    await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    await returnToPublic(requestId, DEVICE);
    await db.update(submissions).set({ deviceExpiresAt: new Date(Date.now() - 1000) });
    const original = await getSubmission(requestId);
    expect(await findRecoverableSubmission('hpv', hpvPublicSample()['profile.idNo'], DEVICE)).toBeNull();
    expect(await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId))
      .toEqual({ ok: false, reason: 'not_found' });
    expect(await getSubmission(requestId)).toEqual(original);
  });

  it('已送出的內容不同時，必須先退回修改；不暗中覆蓋也不新增', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    expect(await createPublicSubmission('hpv', { ...hpvPublicSample(), 'profile.name': '尚未退回的修改' }, DEVICE))
      .toEqual({ ok: false, reason: 'not_returned' });
    expect(await db.select().from(submissions)).toHaveLength(1);
    if (first.ok) expect((await getSubmission(first.id))?.name).toBe('王小美');
  });

  it('既有多份未完成資料保留原狀，回報須人工確認', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const [row] = await db.select().from(submissions).where(eq(submissions.id, first.id));
    await db.insert(submissions).values({ ...row, id: randomUUID(), status: 'returned' });
    const before = await db.select().from(submissions).orderBy(submissions.id);
    expect(await findRecoverableSubmission('hpv', row.idNo, DEVICE)).toBeNull();
    expect(await createPublicSubmission('hpv', { ...hpvPublicSample(), 'profile.name': '不應覆蓋' }, DEVICE))
      .toEqual({ ok: false, reason: 'ambiguous' });
    expect(await db.select().from(submissions).orderBy(submissions.id)).toEqual(before);
  });

  it('再次送出的並行重試只更新一次，保留院所最新內容及填寫人', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const staff = await createUser();
    await returnToPublic(first.id, DEVICE);
    await saveStaffData(staff.id, first.id, 2, { 'hpv.specimenNo': 'CLINIC-LATEST' });
    const original = (await getSubmission(first.id))!;
    const changed = { ...hpvPublicSample(), 'profile.name': '再次送出姓名' };
    const retries = await Promise.all(Array.from({ length: 4 }, () =>
      resubmitPublic(first.id, DEVICE, changed, new Date(), original.publicSubmittedAt.toISOString()),
    ));
    expect(retries).toEqual(Array.from({ length: 4 }, () => ({ ok: true })));
    const updated = (await getSubmission(first.id))!;
    expect(updated).toMatchObject({ name: '再次送出姓名', status: 'submitted', staffData: { 'hpv.specimenNo': 'CLINIC-LATEST' }, staffUpdatedBy: staff.id });
    expect(updated.staffUpdatedAt).toEqual(original.staffUpdatedAt);
    expect(updated.version).toBe(original.version + 1);
    expect((await listEvents(first.id)).map(event => event.action)).toEqual(['submitted', 'returned', 'resubmitted']);
    expect(await db.select().from(submissions)).toHaveLength(1);
  });

  it('上一輪送出的晚到請求，不可覆蓋下一輪正在修改的內容', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const initial = (await getSubmission(first.id))!;
    await returnToPublic(first.id, DEVICE);
    const changed = { ...hpvPublicSample(), 'profile.name': '第一輪更新' };
    await resubmitPublic(first.id, DEVICE, changed, new Date(), initial.publicSubmittedAt.toISOString());
    await returnToPublic(first.id, DEVICE);
    const editing = await getSubmission(first.id);
    expect(await resubmitPublic(first.id, DEVICE, changed, new Date(), initial.publicSubmittedAt.toISOString()))
      .toEqual({ ok: false, reason: 'conflict' });
    expect(await getSubmission(first.id)).toEqual(editing);
  });

  it('已完成資料不接受修改；相同再次送出請求可安全重試', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const initial = (await getSubmission(first.id))!;
    await returnToPublic(first.id, DEVICE);
    const changed = { ...hpvPublicSample(), 'profile.name': '完成前的更新' };
    await resubmitPublic(first.id, DEVICE, changed, new Date(), initial.publicSubmittedAt.toISOString());
    const updated = (await getSubmission(first.id))!;
    const staff = await createUser();
    await completeSubmission(staff.id, first.id, updated.version, {});
    const completed = await getSubmission(first.id);
    expect(await resubmitPublic(first.id, DEVICE, changed, new Date(), initial.publicSubmittedAt.toISOString())).toEqual({ ok: true });
    expect(await resubmitPublic(first.id, DEVICE, hpvPublicSample(), new Date(), initial.publicSubmittedAt.toISOString()))
      .toEqual({ ok: false, reason: 'not_returned' });
    expect(await getSubmission(first.id)).toEqual(completed);
  });

  it('作廢的請求不得重送覆蓋；新填寫使用新編號', async () => {
    const requestId = randomUUID();
    await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId);
    const staff = await createUser();
    await voidSubmission(staff.id, requestId);
    expect(await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), requestId))
      .toEqual({ ok: false, reason: 'not_found' });
    const fresh = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE, new Date(), randomUUID());
    expect(fresh.ok && fresh.id !== requestId).toBe(true);
    expect((await getSubmission(requestId))?.status).toBe('voided');
  });

  it('修改答案時，院所欄位保留適用內容、立即清除不適用附表簽名', async () => {
    await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'fit'));
    const first = await createPublicSubmission('fit', fitPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const staff = await createUser();
    await saveStaffData(staff.id, first.id, 1, { 'fit.sigInterviewer': 'data:image/png;base64,iVBORw0KGgo=', 'fit.ivY': '115', 'fit.result': '0' });
    await returnToPublic(first.id, DEVICE);
    expect(await resubmitPublic(first.id, DEVICE, { ...fitPublicSample(), 'fit.smoke': '0', 'fit.famCrc': '0' })).toEqual({ ok: true });
    expect((await getSubmission(first.id))?.staffData).toMatchObject({ 'fit.sigInterviewer': '', 'fit.ivY': '', 'fit.result': '0' });
  });

  it('恢復原案件需要有效裝置、相符身分和相符表單，且不恢復已完成資料', async () => {
    const first = await createPublicSubmission('hpv', hpvPublicSample(), DEVICE);
    if (!first.ok) throw new Error(first.reason);
    const idNo = hpvPublicSample()['profile.idNo'];
    expect((await findRecoverableSubmission('hpv', idNo.toLowerCase(), DEVICE))?.id).toBe(first.id);
    expect(await findRecoverableSubmission('hpv', 'B123456789', DEVICE)).toBeNull();
    expect(await findRecoverableSubmission('pap', idNo, DEVICE)).toBeNull();
    expect(await findRecoverableSubmission('hpv', idNo, 'another-device')).toBeNull();
    const staff = await createUser();
    await completeSubmission(staff.id, first.id, 1, {});
    expect(await findRecoverableSubmission('hpv', idNo, DEVICE)).toBeNull();
  });
});
