import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { formSettings, submissionEvents, submissions } from '@/db/schema';
import {
  completeSubmission,
  createPublicSubmission,
  getDeviceSubmission,
  getSubmission,
  reopenSubmission,
  restoreSubmission,
  resubmitPublic,
  returnToPublic,
  saveStaffData,
  searchSubmissions,
  voidSubmission,
} from '@/lib/submissions/service';
import { parseQuery } from '@/lib/submissions/query';
import { adultPublicSample, hpvPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

const DEVICE = 'device-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_DEVICE = 'device-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

async function openForm(formId: 'hpv' | 'pap' | 'adult' = 'hpv') {
  await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, formId));
}

async function submitSample(patch: Record<string, string> = {}, device = DEVICE) {
  const result = await createPublicSubmission('hpv', { ...hpvPublicSample(), ...patch }, device);
  if (!result.ok) throw new Error(`submit failed: ${result.reason}`);
  return result.id;
}

async function events(id: string) {
  const rows = await db
    .select({ action: submissionEvents.action, actorId: submissionEvents.actorId })
    .from(submissionEvents)
    .where(eq(submissionEvents.submissionId, id))
    .orderBy(asc(submissionEvents.id));
  return rows;
}

beforeEach(resetDb);

describe('民眾送出', () => {
  it('表單未開放時不接受', async () => {
    expect(await createPublicSubmission('hpv', hpvPublicSample(), DEVICE)).toEqual({ ok: false, reason: 'not_open' });
  });

  it('尚未電子化的表單不接受', async () => {
    await openForm('pap');
    expect(await createPublicSubmission('pap', hpvPublicSample(), DEVICE)).toEqual({
      ok: false,
      reason: 'not_supported',
    });
  });

  it('驗證不通過時回傳錯誤欄位', async () => {
    await openForm();
    const result = await createPublicSubmission('hpv', { ...hpvPublicSample(), 'hpv.q9': '' }, DEVICE);
    expect(result).toEqual({ ok: false, reason: 'invalid', errors: { 'hpv.q9': '請選擇一個選項' } });
  });

  it('建立一筆資料：查詢欄位、只存憑證雜湊、記錄送出', async () => {
    await openForm();
    const id = await submitSample({ 'profile.idNo': 'a234567893' });
    const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
    expect(row).toMatchObject({
      formId: 'hpv',
      status: 'submitted',
      idNo: 'A234567893',
      name: '王小美',
      birthDate: '1983-05-18',
      staffData: {},
      version: 1,
    });
    expect(row.publicData['hpv.q15']).toBe('4');
    expect(row.deviceTokenHash).not.toContain(DEVICE);
    expect(row.deviceExpiresAt!.getTime() - row.publicSubmittedAt.getTime()).toBe(12 * 60 * 60 * 1000);
    expect(await events(id)).toEqual([{ action: 'submitted', actorId: null }]);
  });

  it('同一人可以送出多次，每次一筆', async () => {
    await openForm();
    await submitSample();
    await submitSample();
    expect(await db.select().from(submissions)).toHaveLength(2);
  });
});

describe('民眾裝置', () => {
  beforeEach(() => openForm());

  it('只有原裝置、12 小時內看得到', async () => {
    const id = await submitSample();
    expect((await getDeviceSubmission(id, DEVICE))?.status).toBe('submitted');
    expect(await getDeviceSubmission(id, OTHER_DEVICE)).toBeNull();

    await db.update(submissions).set({ deviceExpiresAt: new Date(Date.now() - 1000) });
    expect(await getDeviceSubmission(id, DEVICE)).toBeNull();
  });

  it('退回修改後再送出：更新內容，身分證號不變', async () => {
    const id = await submitSample();
    expect(await returnToPublic(id, OTHER_DEVICE)).toEqual({ ok: false, reason: 'not_found' });
    expect(await returnToPublic(id, DEVICE)).toEqual({ ok: true });
    expect((await getDeviceSubmission(id, DEVICE))?.status).toBe('returned');

    // 表單關閉後仍可更正已送出的資料
    await db.update(formSettings).set({ isOpen: false });
    const result = await resubmitPublic(id, DEVICE, {
      ...hpvPublicSample(),
      'profile.idNo': 'B123456780',
      'profile.name': '王小華',
    });
    expect(result).toEqual({ ok: true });
    const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
    expect(row).toMatchObject({ status: 'submitted', idNo: 'A234567893', name: '王小華' });
    expect(row.publicData['profile.idNo']).toBe('A234567893');
    expect((await events(id)).map((e) => e.action)).toEqual(['submitted', 'returned', 'resubmitted']);
  });

  it('沒有退回修改時不能再送出', async () => {
    const id = await submitSample();
    expect(await resubmitPublic(id, DEVICE, hpvPublicSample())).toEqual({ ok: false, reason: 'not_returned' });
  });
});

describe('院所填寫與鎖定', () => {
  beforeEach(() => openForm());

  it('暫存院所區：清理欄位、版本遞增、版本不符時擋下', async () => {
    const staff = await createUser();
    const id = await submitSample();

    const saved = await saveStaffData(staff.id, id, 1, { 'hpv.judge': '1', 'hpv.hr': '1', 'evil': 'x' });
    expect(saved).toEqual({ ok: true, version: 2 });
    const row = await getSubmission(id);
    expect(row?.staffData).toMatchObject({ 'hpv.judge': '1', 'hpv.hr': '1' });
    expect(row?.staffData).not.toHaveProperty('evil');
    expect(row?.staffUpdatedBy).toBe(staff.id);

    expect(await saveStaffData(staff.id, id, 1, { 'hpv.judge': '2' })).toEqual({ ok: false, reason: 'conflict' });
  });

  it('確認送出後鎖定：民眾不能退回修改、院所不能修改；取消送出後恢復', async () => {
    const staff = await createUser();
    const id = await submitSample();

    const done = await completeSubmission(staff.id, id, 1, { 'hpv.judge': '2' });
    expect(done).toEqual({ ok: true, version: 2 });
    expect(await getSubmission(id)).toMatchObject({ status: 'completed', completedBy: staff.id });
    expect(await returnToPublic(id, DEVICE)).toEqual({ ok: false, reason: 'locked' });
    expect(await saveStaffData(staff.id, id, 2, { 'hpv.judge': '1' })).toEqual({ ok: false, reason: 'locked' });

    expect(await reopenSubmission(staff.id, id)).toEqual({ ok: true, version: 3 });
    expect(await getSubmission(id)).toMatchObject({ status: 'submitted', completedBy: null, completedAt: null });
    expect(await returnToPublic(id, DEVICE)).toEqual({ ok: true });
    expect((await events(id)).map((e) => e.action)).toEqual(['submitted', 'completed', 'reopened', 'returned']);
  });

  it('民眾修改中不能確認送出', async () => {
    const staff = await createUser();
    const id = await submitSample();
    await returnToPublic(id, DEVICE);
    expect(await completeSubmission(staff.id, id, 2, {})).toEqual({ ok: false, reason: 'not_ready' });
  });

  it('作廢與復原；已完成的不能作廢', async () => {
    const staff = await createUser();
    const id = await submitSample();
    expect(await voidSubmission(staff.id, id)).toEqual({ ok: true, version: 2 });
    expect(await getDeviceSubmission(id, DEVICE)).toBeNull();
    expect(await restoreSubmission(staff.id, id)).toEqual({ ok: true, version: 3 });

    await completeSubmission(staff.id, id, 3, {});
    expect(await voidSubmission(staff.id, id)).toEqual({ ok: false, reason: 'invalid_status' });
    expect((await events(id)).map((e) => e.action)).toEqual(['submitted', 'voided', 'restored', 'completed']);
  });

  it('停用的人員不能操作', async () => {
    const disabled = await createUser({ status: 'disabled' });
    const id = await submitSample();
    expect(await saveStaffData(disabled.id, id, 1, {})).toEqual({ ok: false, reason: 'forbidden' });
    expect(await completeSubmission(disabled.id, id, 1, {})).toEqual({ ok: false, reason: 'forbidden' });
  });
});

describe('列表與重複提示', () => {
  beforeEach(() => openForm());

  const listSubmissions = async (options: { includeVoided?: boolean } = {}) =>
    (
      await searchSubmissions(
        parseQuery(options.includeVoided ? { status: ['submitted', 'returned', 'completed', 'voided'] } : {}),
      )
    ).rows;

  it('同一人同表單有兩筆以上未完成時標示重複；已完成、已作廢的不算', async () => {
    const staff = await createUser();
    const a = await submitSample();
    const b = await submitSample();
    const other = await submitSample({ 'profile.idNo': 'B123456780' });

    let list = await listSubmissions();
    expect(list.map((s) => s.id)).toEqual([other, b, a]);
    expect(list.find((s) => s.id === a)?.duplicates).toBe(1);
    expect(list.find((s) => s.id === other)?.duplicates).toBe(0);

    await completeSubmission(staff.id, a, 1, {});
    list = await listSubmissions();
    expect(list.find((s) => s.id === b)?.duplicates).toBe(0);

    const c = await submitSample();
    await voidSubmission(staff.id, c);
    list = await listSubmissions();
    expect(list.map((s) => s.id)).not.toContain(c);
    expect(list.find((s) => s.id === b)?.duplicates).toBe(0);
    expect((await listSubmissions({ includeVoided: true })).map((s) => s.id)).toContain(c);
  });
});

describe('成人預防保健', () => {
  // 約 250KB 的簽名：4 個簽名合計超過 Server Action 預設的 1MB，院所區仍能完整存入
  const signature = `data:image/png;base64,${'A'.repeat(250 * 1024)}`;

  it('民眾送出（不需簽名）→ 院所填寫同意與醫師簽名 → 確認送出', async () => {
    await openForm('adult');
    const staff = await createUser();
    const created = await createPublicSubmission('adult', adultPublicSample(), DEVICE);
    if (!created.ok) throw new Error(`submit failed: ${created.reason}`);

    const row = await getSubmission(created.id);
    expect(row).toMatchObject({ formId: 'adult', name: '王大明', birthDate: '1965-03-09' });
    expect(row?.publicData['adult.fam']).toEqual(['dm', 'cancer']);

    const staffData = {
      'adult.s1Y': '115',
      'adult.s1M': '10',
      'adult.s1D': '24',
      'adult.sigS1': signature,
      'adult.sigS2': signature,
      'adult.sigHep': signature,
      'adult.sigDoctor': signature,
      'adult.hbsag': '1',
      'adult.resHbv': ['neg'],
      'adult.cr': '1.0',
    };
    expect(await completeSubmission(staff.id, created.id, 1, staffData)).toEqual({ ok: true, version: 2 });
    const done = await getSubmission(created.id);
    expect(done?.status).toBe('completed');
    expect(done?.staffData).toMatchObject({ ...staffData, 'adult.sigDoctor': signature });
  });
});
