import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookAppointment, cancelPublicAppointment, editAppointmentIntake, lookupAppointment,
  refreshAppointment, submitAppointmentIntake } from '@/app/f/labor-appointment/actions';
import { db } from '@/db';
import { appointments, appointmentSettings, formSettings, submissions } from '@/db/schema';
import { allowAppointmentAttempt, type AppointmentGate, readAppointmentAccess, writeAppointmentAccess } from '@/lib/appointments/access';
import { addDays, bookingCalendar, calendarLink, DEFAULT_BOOKING_DATES, weekday } from '@/lib/appointments/dates';
import { cancelAppointment, createAppointment, latestAppointment, parseAppointmentIdentity, publicBookingCount,
  readAppointmentIntake, returnAppointmentIntake, saveAppointmentIntake } from '@/lib/appointments/public-service';
import { confirmAppointment } from '@/lib/appointments/service';
import { verifyRecaptcha } from '@/lib/security/recaptcha';
import { createPublicSubmission, getDeviceSubmission, listEvents, restoreSubmission, searchSubmissions } from '@/lib/submissions/service';
import { parseQuery } from '@/lib/submissions/query';
import { laborPublicSample } from './fixtures';
import { createUser, resetDb } from './helpers';

const jar = vi.hoisted(() => new Map<string, { value: string }>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) => jar.get(key),
    set: (key: string, value: string, options: { maxAge: number }) => {
      if (options.maxAge) jar.set(key, { value });
      else jar.delete(key);
    },
  }),
}));
vi.mock('@/lib/security/recaptcha', () => ({
  verifyRecaptcha: vi.fn(async (_action: string, token: unknown) => token === 'valid'
    ? { ok: true } : { ok: false, reason: 'verification_failed' }),
}));

const now = new Date('2026-11-09T16:00:00Z');
const identity = { idNo: 'A234567893', birthDate: '1983-05-18' };
const input = { idNo: 'a234567893', y: '72', m: '5', d: '18' };
const device = 'a'.repeat(43);
const date = '2026-11-25';
const data = { date, name: '預約測試', packageCode: 'in_service' } as const;
const gate = (): AppointmentGate => ({ ...identity, requestId: randomUUID(), expiresAt: Date.now() + 3600000 });

beforeEach(async () => {
  vi.stubEnv('APPOINTMENT_SESSION_SECRET', 'appointment-test-key-unique-to-vitest-only');
  vi.stubEnv('VERCEL', '');
  vi.clearAllMocks();
  jar.clear();
  await resetDb();
  await db.update(appointmentSettings).set({ isOpen: true });
});
afterEach(() => vi.unstubAllEnvs());

describe('預約前台', () => {
  it('以台灣日期計算範圍、星期與休診日，行事曆連結只包含日期及院所', async () => {
    expect(parseAppointmentIdentity(input, now)).toEqual(identity);
    expect(parseAppointmentIdentity({ ...input, m: '2', d: '31' }, now)).toBeNull();
    expect(bookingCalendar(DEFAULT_BOOKING_DATES, now)).toMatchObject({ firstDate: date, lastDate: '2027-02-08' });
    expect(await publicBookingCount('2026-11-24', now)).toBeNull();
    expect(await publicBookingCount('2026-11-29', now)).toBeNull();
    expect(await publicBookingCount(date, now)).toBe(0);
    await db.update(appointmentSettings).set({ closedDates: [date] });
    expect(await createAppointment(gate(), device, data, now)).toMatchObject({ ok: false, reason: 'date_unavailable' });
    expect(await publicBookingCount(date, now)).toBeNull();
    expect(Object.fromEntries(new URL(calendarLink(date)).searchParams)).toEqual({
      action: 'TEMPLATE', text: '健檢預約', dates: '20261125/20261126', location: '烏日澄清醫院',
    });
  });

  it('同一請求並行及遺失回應只建立一筆，其他裝置及同證件不同生日不能重複預約', async () => {
    const first = gate();
    const results = await Promise.all([
      createAppointment(first, device, data, now),
      createAppointment(first, device, data, now),
      createAppointment({ ...gate(), birthDate: '1980-01-01' }, 'b'.repeat(43), data, now),
    ]);
    expect(results.filter((result) => result.ok).length).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(appointments)).toHaveLength(1);
    const [row] = await db.select().from(appointments);
    if (row.id === first.requestId) expect(results.slice(0, 2)).toMatchObject([{ ok: true }, { ok: true }]);
    expect(await publicBookingCount(date, now)).toBe(1);
  });

  it('以證件號與生日取得最新建立且日期晚於今天的有效預約', async () => {
    const first = gate();
    const result = await createAppointment(first, device, data, now);
    if (!result.ok) throw new Error(result.reason);
    await db.insert(appointments).values([
      { ...identity, name: '今日', appointmentDate: '2026-11-10', packageCode: 'new_worker', createdAt: new Date(+now + 1000) },
      { ...identity, name: '取消', appointmentDate: date, packageCode: 'new_worker', status: 'cancelled', createdAt: new Date(+now + 1000) },
    ]);
    await db.update(appointmentSettings).set({ isOpen: false });
    expect(await latestAppointment(identity, now)).toMatchObject({ id: first.requestId });
    expect(await latestAppointment({ ...identity, birthDate: '1983-05-19' }, now)).toBeNull();
    const [latest] = await db.insert(appointments).values({
      ...identity, name: '較新', appointmentDate: date, packageCode: 'new_worker', createdAt: new Date(+now + 2000),
    }).returning({ id: appointments.id });
    expect(await latestAppointment(identity, now)).toMatchObject({ id: latest.id });
  });

  it('填表、修改重送與確認使用同一筆預約表，取消同步作廢並拒絕一般表單入口讀取或復原', async () => {
    await db.update(formSettings).set({ isOpen: true }).where(eq(formSettings.formId, 'labor'));
    const normal = await createPublicSubmission('labor', laborPublicSample(), 'standalone-device', now);
    expect(normal.ok).toBe(true);
    const session = gate();
    await createAppointment(session, device, data, now);
    const scoped = { ...session, appointmentId: session.requestId };
    const actor = await createUser();
    expect(await confirmAppointment(session.requestId, actor.id, now)).toEqual({ ok: false, reason: 'form_required' });
    const values = { ...laborPublicSample(), 'profile.idNo': 'OTHER', 'profile.name': '錯誤姓名', 'profile.birthY': '99' };
    expect(await saveAppointmentIntake(scoped, device, session.requestId, null, values, now)).toEqual({ ok: true });
    expect(await saveAppointmentIntake(scoped, device, session.requestId, null, values, now)).toEqual({ ok: true });
    const record = await readAppointmentIntake(scoped, device, now);
    expect(record?.intake).toMatchObject({ idNo: identity.idNo, birthDate: identity.birthDate, name: data.name, version: 1 });
    const intakeId = record!.intake!.id;
    expect(await returnAppointmentIntake(scoped, device, session.requestId, 1, now)).toEqual({ ok: true });
    expect(await confirmAppointment(session.requestId, actor.id, now)).toEqual({ ok: false, reason: 'form_required' });
    const changed = { ...values, 'labor.company': '變更公司' };
    expect(await saveAppointmentIntake(scoped, device, session.requestId, 2, changed, now)).toEqual({ ok: true });
    expect(await confirmAppointment(session.requestId, actor.id, now)).toEqual({ ok: true });
    expect(await readAppointmentIntake(scoped, device, now)).toMatchObject({ editable: false, intake: { id: intakeId, version: 3 } });
    expect(await returnAppointmentIntake(scoped, device, session.requestId, 3, now)).toEqual({ ok: false, reason: 'locked' });
    expect(await getDeviceSubmission(intakeId, 'standalone-device', now)).toBeNull();
    expect(await db.select().from(submissions)).toHaveLength(2);
    expect(await cancelAppointment(scoped, device, session.requestId, now)).toMatchObject({ ok: true, row: { status: 'cancelled' } });
    expect(await cancelAppointment(scoped, device, session.requestId, now)).toMatchObject({ ok: true });
    expect(await readAppointmentIntake(scoped, device, now)).toBeNull();
    expect(await saveAppointmentIntake(scoped, device, session.requestId, 2, changed, now)).toMatchObject({ ok: false });
    expect(await restoreSubmission(actor.id, intakeId)).toEqual({ ok: false, reason: 'invalid_status' });
    expect((await listEvents(intakeId)).map(({ action }) => action).sort()).toEqual(['resubmitted', 'returned', 'submitted', 'voided']);
    expect((await searchSubmissions(parseQuery({ form: 'appointment', status: 'voided' }))).rows)
      .toEqual([expect.objectContaining({ id: session.requestId, printSubmissionId: null })]);
    expect(await publicBookingCount(date, now)).toBe(0);
    expect(await createAppointment(gate(), device, data, now)).toMatchObject({ ok: true });
  });

  it('已完成的關聯表單及健檢當日不可由民眾取消', async () => {
    const session = gate();
    await createAppointment(session, device, data, now);
    const scoped = { ...session, appointmentId: session.requestId };
    await saveAppointmentIntake(scoped, device, session.requestId, null, laborPublicSample(), now);
    const record = await readAppointmentIntake(scoped, device, now);
    const visitDay = new Date(date + 'T02:00:00Z');
    expect(await cancelAppointment(scoped, device, session.requestId, visitDay)).toEqual({ ok: false, reason: 'locked' });
    await db.update(submissions).set({ status: 'completed' }).where(eq(submissions.id, record!.intake!.id));
    expect(await cancelAppointment(scoped, device, session.requestId, now)).toEqual({ ok: false, reason: 'locked' });
    expect(await publicBookingCount(date, now)).toBe(1);
  });
});

describe('公開預約驗證', () => {
  it('限流原子累計，逾時可重試', async () => {
    const attempts = await Promise.all(Array.from({ length: 13 }, () => allowAppointmentAttempt('lookup', identity.idNo, now)));
    expect(attempts.filter(Boolean)).toHaveLength(12);
    expect(await allowAppointmentAttempt('lookup', identity.idNo, new Date(+now + 600001))).toBe(true);
  });

  it('查詢、建立、取消及健檢表異動都拒絕無效 CAPTCHA，新瀏覽器只能查看預約摘要', async () => {
    expect(await lookupAppointment(input, 'bad')).toMatchObject({ ok: false });
    expect(jar.size).toBe(0);
    const first = await lookupAppointment(input, 'valid');
    if (!first.ok) throw new Error(first.message);
    const date = weekday(first.calendar.firstDate) === 0 ? addDays(first.calendar.firstDate, 1) : first.calendar.firstDate;
    const form = { ...data, date };
    expect(await bookAppointment(first.requestId, form, 'bad')).toMatchObject({ ok: false });
    expect(await db.select().from(appointments)).toHaveLength(0);
    const booking = await bookAppointment(first.requestId, form, 'valid');
    if (!booking.ok) throw new Error(booking.message);
    const { id } = booking.booking;
    expect(booking.booking).toMatchObject({ canManage: true });
    expect(booking.booking).not.toHaveProperty('managementCode');
    expect(await bookAppointment(first.requestId, form, 'valid')).toEqual(booking);
    expect(await cancelPublicAppointment(id, 'bad')).toMatchObject({ ok: false });
    expect(await submitAppointmentIntake(id, null, laborPublicSample(), 'bad')).toMatchObject({ ok: false });
    expect(await db.select().from(submissions)).toHaveLength(0);
    expect(await submitAppointmentIntake(id, null, laborPublicSample(), 'valid')).toMatchObject({ ok: true, version: 1 });
    expect(await editAppointmentIntake(id, 1, 'bad')).toMatchObject({ ok: false });
    expect(await editAppointmentIntake(id, 1, 'valid')).toMatchObject({ ok: true, version: 2 });
    expect(await submitAppointmentIntake(id, 2, laborPublicSample(), 'bad')).toMatchObject({ ok: false });
    const ownerCookies = new Map(jar);
    jar.clear();
    expect(await refreshAppointment(id)).toMatchObject({ ok: false });
    expect(await lookupAppointment({ ...input, d: '19' }, 'valid')).toMatchObject({ ok: true, booking: null });
    jar.clear();
    const summary = { id, date, packageCode: data.packageCode, status: 'pending', name: null,
      canManage: false, canCancel: false, canOpenIntake: false, hasIntake: false };
    expect(await lookupAppointment(input, 'valid')).toMatchObject({ ok: true, booking: summary });
    expect(await refreshAppointment(id)).toMatchObject({ ok: true, booking: summary });
    const other = await readAppointmentAccess();
    expect(other.gate?.appointmentId).toBe(id);
    expect(await readAppointmentIntake(other.gate!, other.device)).toBeNull();
    expect(await cancelPublicAppointment(id, 'valid')).toMatchObject({ ok: false });
    expect(await editAppointmentIntake(id, 2, 'valid')).toMatchObject({ ok: false });
    expect(await submitAppointmentIntake(id, 2, laborPublicSample(), 'valid')).toMatchObject({ ok: false });
    jar.set('hc_appointment', ownerCookies.get('hc_appointment')!);
    expect((await readAppointmentAccess()).gate).toBeNull();
    jar.clear();
    for (const [key, cookie] of ownerCookies) jar.set(key, cookie);
    expect(await refreshAppointment(id)).toMatchObject({ ok: true, booking: { id, canManage: true, canOpenIntake: true } });
    expect(await cancelPublicAppointment(id, 'valid')).toMatchObject({ ok: true, booking: { status: 'cancelled' } });
    expect(vi.mocked(verifyRecaptcha)).toHaveBeenCalledWith('public_resubmit', 'bad');
  });

  it('沒有預約密鑰時，即使驗證服務回應成功也無法建立查詢工作階段', async () => {
    vi.stubEnv('APPOINTMENT_SESSION_SECRET', '');
    expect(await lookupAppointment(input, 'valid')).toMatchObject({ ok: false });
    expect(verifyRecaptcha).not.toHaveBeenCalled();
    expect(await readAppointmentAccess()).toEqual({ device: null, gate: null });
    await expect(writeAppointmentAccess(gate(), null)).rejects.toThrow();
  });
});
