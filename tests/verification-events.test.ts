import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { securityVerificationEvents, submissions } from '@/db/schema';
import { verifyRecaptcha } from '@/lib/security/recaptcha';
import { recordVerificationEvent, purgeVerificationEvents } from '@/lib/security/verification-events';
import { withCaptchaRequest } from '@/lib/security/recaptcha-client';
import { submitAppointmentIntake } from '@/app/f/labor-appointment/actions';
import * as appointmentAccess from '@/lib/appointments/access';
import { verificationMessage, captchaReferenceInMessage } from '@/lib/security/public-protection';
import { resetDb } from './helpers';

const bookingId = 'b06d8f72-66a4-4476-935a-73a78f4ecacf';
vi.mock('@/lib/appointments/access', () => ({
  appointmentAccessConfigured: () => true, allowAppointmentAttempt: async () => true,
  readAppointmentAccess: async () => ({ device: 'test-device', gate: { appointmentId: bookingId, idNo: 'TEST-ID' } }),
  clearAppointmentAccess: async () => {}, writeAppointmentAccess: async () => {},
}));
const env = () => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('RECAPTCHA_DEV_BYPASS', 'false');
  vi.stubEnv('RECAPTCHA_SITE_KEY', 'public-key'); vi.stubEnv('RECAPTCHA_PROJECT_ID', 'test-project');
  vi.stubEnv('RECAPTCHA_API_KEY', 'private-test-api-key');
  vi.stubEnv('RECAPTCHA_ALLOWED_HOSTNAMES', 'wjcch-healthcare.vercel.app'); vi.stubEnv('RECAPTCHA_MIN_SCORE', '.5');
};
beforeEach(async () => {
  await resetDb(); env();
  vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('安全驗證持久診斷與預約入口', () => {
  it('預約必要設定缺漏也保留參考碼與持久原因，不誤記為 Google 低分', async () => {
    vi.spyOn(appointmentAccess, 'appointmentAccessConfigured').mockReturnValue(false);
    const result = await submitAppointmentIntake(bookingId, null, {}, 'unused-token');
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining('RC-S01-') });
    expect(await db.select().from(securityVerificationEvents)).toEqual([expect.objectContaining({ code: 'configuration_missing', source: 'server', outcome: 'unavailable', details: {} })]);
  });
  it('空白權杖從預約送出路徑存為 client 失敗，參考碼一致，且不新增問卷', async () => {
    vi.stubGlobal('window', { setTimeout, grecaptcha: { enterprise: { ready: (fn: () => void) => fn(), execute: async () => '' } } });
    const remote = vi.fn(); vi.stubGlobal('fetch', remote);
    const result = await withCaptchaRequest({ mode: 'required', siteKey: 'public-key' }, 'public_submit',
      proof => submitAppointmentIntake(bookingId, null, {}, proof));
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining('尚未完成安全驗證') });
    const rows = await db.select().from(securityVerificationEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'public_submit', source: 'client', outcome: 'unavailable', code: 'token_empty', details: {} });
    if (!result.ok) expect(result.message).toContain(`RC-C07-${rows[0].id}`);
    expect(remote).not.toHaveBeenCalled();
    expect(await db.select().from(submissions)).toHaveLength(0);
  });

  it('低分與 1.0 的非分數拒絕各自保存真實判斷，前台不取得分數', async () => {
    for (const [score, action, code] of [[.3, 'public_submit', 'score_below_threshold'], [1, 'public_return', 'action_mismatch']] as const) {
      vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
        tokenProperties: { valid: true, hostname: 'wjcch-healthcare.vercel.app', action, createTime: new Date().toISOString() },
        riskAnalysis: { score, reasons: ['LOW_CONFIDENCE_SCORE', 'private-data'] },
        event: { token: 'private-token', extra: 'private-data' },
      })));
      const result = await verifyRecaptcha('public_submit', 'private-token');
      expect(result).toMatchObject({ ok: false, diagnosticRecorded: true });
      if (result.ok) throw new Error('Expected rejection');
      const [row] = await db.select().from(securityVerificationEvents).where(eq(securityVerificationEvents.id, result.reference.slice(7)));
      expect(row).toMatchObject({ source: 'server', code, details: { score, minScore: .5, tokenValid: true } });
      const message = verificationMessage(result.reason, result.reference, result.diagnosticRecorded);
      expect(captchaReferenceInMessage(message)).toBe(result.reference);
      expect(Object.keys(result).sort()).toEqual(['diagnosticRecorded', 'ok', 'reason', 'reference']);
      expect(JSON.stringify(row)).not.toMatch(/private-token|private-data|private-test-api-key/);
    }
  });

  it('有效的 1.0 評估在 0.5 通過並保留基準紀錄', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ tokenProperties: {
      valid: true, hostname: 'wjcch-healthcare.vercel.app', action: 'appointment_create', createTime: new Date().toISOString(),
    }, riskAnalysis: { score: 1 } })));
    expect(await verifyRecaptcha('appointment_create', 'private-token')).toEqual({ ok: true });
    expect(await db.select().from(securityVerificationEvents)).toEqual([expect.objectContaining({ code: 'accepted', outcome: 'accepted', details: expect.objectContaining({ score: 1, minScore: .5 }) })]);
  });

  it('30 天清理保留有效期內紀錄；不涉及既有問卷', async () => {
    const expired = randomUUID(); const recent = randomUUID();
    await db.insert(securityVerificationEvents).values([
      { id: expired, occurredAt: new Date(Date.now() - 31 * 86400000), action: 'public_submit', source: 'server', outcome: 'rejected', code: 'token_invalid' },
      { id: recent, occurredAt: new Date(Date.now() - 29 * 86400000), action: 'public_submit', source: 'server', outcome: 'rejected', code: 'token_invalid' },
    ]);
    await purgeVerificationEvents();
    expect((await db.select().from(securityVerificationEvents)).map(row => row.id)).toEqual([recent]);
  });

  it('再次白名單化診斷 JSON、重複參考碼不可覆寫原始紀錄，RLS 已啟用', async () => {
    const event = { id: randomUUID(), action: 'public_submit', source: 'server', outcome: 'rejected', code: 'token_invalid',
      details: { score: .3, minScore: .5, riskReasons: ['LOW_CONFIDENCE_SCORE', 'private-name'], token: 'private-token' } } as const;
    expect(await recordVerificationEvent(event as unknown as Parameters<typeof recordVerificationEvent>[0])).toBe(true);
    expect(await recordVerificationEvent({ ...event, details: { score: 1 } })).toBe(true);
    const [row] = await db.select().from(securityVerificationEvents);
    expect(row.details).toEqual({ score: .3, minScore: .5, riskReasons: ['LOW_CONFIDENCE_SCORE'] });
    const [table] = await db.execute<{ enabled: boolean }>(sql`select relrowsecurity as enabled from pg_class where oid = 'heal_care.security_verification_events'::regclass`);
    expect(table.enabled).toBe(true);
  });
});
