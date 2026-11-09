import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { formSettings, submissions, submissionEvents } from '@/db/schema';
import { submitForm, resubmitForm, returnForm } from '@/app/f/[formId]/actions';
import { FORM_IDS } from '@/lib/forms/catalog';
import { hpvPublicSample } from './fixtures';
import { resetDb } from './helpers';
import { ensureDeviceToken } from '@/lib/submissions/device';

vi.mock('@/lib/submissions/device', () => ({ ensureDeviceToken: vi.fn(async () => 'protected-device'), readDeviceToken: vi.fn(async () => 'protected-device'), clearDeviceToken: vi.fn(async () => {}) }));
beforeEach(async () => {
  await resetDb(); await db.update(formSettings).set({ isOpen: true }); vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('RECAPTCHA_DEV_BYPASS', 'false');
  vi.stubEnv('RECAPTCHA_SITE_KEY', 'public-key'); vi.stubEnv('RECAPTCHA_PROJECT_ID', 'test-project');
  vi.stubEnv('RECAPTCHA_API_KEY', 'test-api-key'); vi.stubEnv('RECAPTCHA_ALLOWED_HOSTNAMES', 'wjcch-healthcare.vercel.app'); vi.stubEnv('RECAPTCHA_MIN_SCORE', '.5');
  const seen = new Set<string>();
  vi.stubGlobal('fetch', vi.fn(async (_url, request) => {
    const event = JSON.parse(request.body).event; const token = event.token as string;
    const valid = !seen.has(token); seen.add(token);
    return new Response(JSON.stringify({ tokenProperties: { valid, invalidReason: valid ? undefined : 'DUPE', hostname: 'wjcch-healthcare.vercel.app', action: token.split(':')[0], createTime: new Date().toISOString() }, riskAnalysis: { score: .9 } }));
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('所有公開異動入口必須通過真實共用 guard', () => {
  it('七種表單直接呼叫都不能省略 token，且不建立裝置憑證或資料', async () => {
    for (const formId of FORM_IDS) expect(await submitForm(formId, {}, randomUUID())).toEqual({ ok: false, reason: 'verification_failed' });
    expect(ensureDeviceToken).not.toHaveBeenCalled();
    expect(await db.select().from(submissions)).toHaveLength(0);
    expect(await db.select().from(submissionEvents)).toHaveLength(0);
  });
  it('有效驗證可送出；重用 token 被拒絕，換新 token 重試仍沿用同一份問卷', async () => {
    const id = randomUUID();
    const first = await submitForm('hpv', hpvPublicSample(), id, 'public_submit:1');
    expect(first).toMatchObject({ ok: true, id });
    expect(await submitForm('hpv', hpvPublicSample(), id, 'public_submit:1')).toMatchObject({ ok: false, reason: 'verification_failed' });
    expect(await submitForm('hpv', hpvPublicSample(), id, 'public_submit:2')).toEqual(first);
    expect(await db.select().from(submissions)).toHaveLength(1);
    expect(await db.select().from(submissionEvents)).toHaveLength(1);
  });
  it('退回及重送也會驗證：缺少或用錯動作不異動原資料，有效 token 才更新', async () => {
    const first = await submitForm('hpv', hpvPublicSample(), randomUUID(), 'public_submit:1');
    if (!first.ok) throw new Error('initial submit failed');
    expect(await returnForm(first.id)).toMatchObject({ ok: false, reason: 'verification_failed' });
    expect(await returnForm(first.id, 'public_submit:wrong-action')).toMatchObject({ ok: false, reason: 'verification_failed' });
    expect((await db.select().from(submissions))[0].status).toBe('submitted');
    expect(await returnForm(first.id, 'public_return:1')).toMatchObject({ ok: true });
    const updated = { ...hpvPublicSample(), 'profile.name': '受保護的更正內容' };
    expect(await resubmitForm(first.id, updated, first.submittedAt)).toMatchObject({ ok: false, reason: 'verification_failed' });
    expect((await db.select().from(submissions))[0]).toMatchObject({ status: 'returned', publicData: { 'profile.name': hpvPublicSample()['profile.name'] } });
    expect(await resubmitForm(first.id, updated, first.submittedAt, 'public_resubmit:1')).toMatchObject({ ok: true, id: first.id });
    expect((await db.select().from(submissions))[0]).toMatchObject({ status: 'submitted', publicData: { 'profile.name': updated['profile.name'] } });
  });
  it('正式環境未設定或 Google 不可用時，不建立問卷', async () => {
    vi.stubEnv('RECAPTCHA_API_KEY', '');
    expect(await submitForm('hpv', hpvPublicSample(), randomUUID(), 'public_submit:1')).toMatchObject({ ok: false, reason: 'verification_unavailable' });
    vi.stubEnv('RECAPTCHA_API_KEY', 'test-api-key'); vi.mocked(fetch).mockRejectedValueOnce(new Error('remote private details'));
    expect(await submitForm('hpv', hpvPublicSample(), randomUUID(), 'public_submit:2')).toEqual({ ok: false, reason: 'verification_unavailable' });
    expect(await db.select().from(submissions)).toHaveLength(0);
  });
});
