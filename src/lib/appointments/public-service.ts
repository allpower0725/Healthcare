import 'server-only';
import { createHash } from 'node:crypto';
import { and, count, desc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { type Appointment, appointmentSettings, appointments, type FormValues, submissions } from '@/db/schema';
import { getFormDef } from '@/lib/forms/defs';
import { sanitize, validateRules } from '@/lib/forms/engine';
import { rocToIso, todayIsoTaipei } from '@/lib/forms/format';
import { identityError, isIdentityType, type IdentityType, normalizeIdentityNumber } from '@/lib/forms/identity';
import { lockRow, logEvent, samePublicData, updateReturned } from '@/lib/submissions/service';
import { type AppointmentGate, type AppointmentIdentity, appointmentDeviceHash, matchesAppointmentDevice } from './access';
import type { AppointmentPackage } from './catalog';
import { bookingCalendar, isBookableDate } from './dates';
import { matchesAppointmentSubmission } from './service';
import { getAppointmentSetting } from './settings';

const active = inArray(appointments.status, ['pending', 'confirmed']);
const labor = getFormDef('labor')!;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type BookingInput = { date: string; name: string; packageCode: AppointmentPackage };

export function parseAppointmentIdentity(raw: unknown, now = new Date()): AppointmentIdentity | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  if (typeof input.idNo !== 'string' || input.idNo.length > 32
    || typeof input.y !== 'string' || typeof input.m !== 'string' || typeof input.d !== 'string') return null;
  const idNo = normalizeIdentityNumber(input.idNo);
  if (!isIdentityType(input.idType) || identityError(input.idType, idNo)) return null;
  const birthDate = rocToIso(input.y, input.m, input.d);
  const rules = labor.publicRules.filter(({ id }) => id === 'profile.idNo' || id === 'profile.birth');
  const errors = validateRules(rules, {
    'profile.idType': input.idType, 'profile.idNo': idNo, 'profile.birthY': input.y, 'profile.birthM': input.m, 'profile.birthD': input.d,
  }, now);
  return birthDate && !Object.keys(errors).length ? { idType: input.idType, idNo, birthDate } : null;
}

function identityWhere(identity: AppointmentIdentity) {
  return and(eq(appointments.idNo, identity.idNo), eq(appointments.birthDate, identity.birthDate));
}

function appointmentWhere(gate: AppointmentGate, id: string) {
  return and(eq(appointments.id, id), identityWhere(gate));
}

export async function latestAppointment(identity: AppointmentIdentity, now = new Date()) {
  const [row] = await db.select().from(appointments).where(and(
    identityWhere(identity), active, gt(appointments.appointmentDate, todayIsoTaipei(now)),
  )).orderBy(desc(appointments.createdAt), desc(appointments.id)).limit(1);
  return row ?? null;
}

export async function loadPublicAppointment(gate: AppointmentGate, now = new Date()) {
  if (!gate.appointmentId) return null;
  const [row] = await db.select().from(appointments).where(and(
    appointmentWhere(gate, gate.appointmentId), gte(appointments.appointmentDate, todayIsoTaipei(now)),
  ));
  return row ?? null;
}

export async function publicBookingCalendar(now = new Date()) {
  const setting = await getAppointmentSetting();
  return { open: setting.isOpen, calendar: bookingCalendar(setting, now) };
}

export async function publicBookingCount(date: unknown, now = new Date()) {
  const { open, calendar } = await publicBookingCalendar(now);
  if (!open || !isBookableDate(date, calendar)) return null;
  const [row] = await db.select({ total: count() }).from(appointments).where(and(eq(appointments.appointmentDate, date), active));
  return row.total;
}

export async function createAppointment(gate: AppointmentGate, device: string, input: BookingInput, now = new Date()) {
  const hash = appointmentDeviceHash(device, gate.requestId);
  if (!hash || gate.appointmentId || identityError(gate.idType, gate.idNo)) return { ok: false, reason: 'conflict' } as const;
  const today = todayIsoTaipei(now);
  return db.transaction(async (tx) => {
    // 同一證件的新預約需序列化，包含不同裝置同時送出。
    const lock = createHash('sha256').update(JSON.stringify(['appointment-create', gate.idNo]))
      .digest().readBigInt64BE(0).toString();
    await tx.execute(sql`select pg_advisory_xact_lock(${lock}::bigint)`);
    const [known] = await tx.select().from(appointments).where(appointmentWhere(gate, gate.requestId)).for('update');
    if (known) {
      return known.status !== 'cancelled' && known.appointmentDate > today && matchesAppointmentDevice(device, known.id, known.deviceAccessHash)
        ? { ok: true, row: known } as const : { ok: false, reason: 'conflict' } as const;
    }
    const [setting] = await tx.select().from(appointmentSettings).where(eq(appointmentSettings.id, 1)).for('share');
    if (!setting?.isOpen) return { ok: false, reason: 'not_open' } as const;
    if (!isBookableDate(input.date, bookingCalendar(setting, now))) return { ok: false, reason: 'date_unavailable' } as const;
    const [existing] = await tx.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.idNo, gate.idNo), active, gte(appointments.appointmentDate, today),
    )).limit(1);
    if (existing) return { ok: false, reason: 'conflict' } as const;
    const [row] = await tx.insert(appointments).values({
      id: gate.requestId, idNo: gate.idNo, birthDate: gate.birthDate, name: input.name,
      appointmentDate: input.date, packageCode: input.packageCode, deviceAccessHash: hash, createdAt: now, updatedAt: now,
    }).onConflictDoNothing({ target: appointments.id }).returning();
    return row ? { ok: true, row } as const : { ok: false, reason: 'conflict' } as const;
  });
}

// 證件號與生日的查詢工作階段只允許查閱預約摘要；異動與健檢表仍需原裝置。
function ownedAppointmentWhere(gate: AppointmentGate, device: string | null, id: string) {
  const hash = appointmentDeviceHash(device, id);
  if (gate.appointmentId !== id || !hash) return null;
  return and(appointmentWhere(gate, id), eq(appointments.deviceAccessHash, hash));
}

async function lockAppointment(tx: Tx, gate: AppointmentGate, device: string | null, id: string) {
  const where = ownedAppointmentWhere(gate, device, id);
  if (!where) return null;
  const [row] = await tx.select().from(appointments).where(where).for('update');
  return row ?? null;
}

function matchesIntake(booking: Appointment, row: Awaited<ReturnType<typeof lockRow>>) {
  return !!row && row.formId === 'labor' && row.idNo === booking.idNo && row.birthDate === booking.birthDate;
}

export async function cancelAppointment(gate: AppointmentGate, device: string | null, id: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const booking = await lockAppointment(tx, gate, device, id);
    if (!booking) return { ok: false, reason: 'not_found' } as const;
    if (booking.status === 'cancelled') return { ok: true, row: booking } as const;
    if (booking.appointmentDate <= todayIsoTaipei(now)) return { ok: false, reason: 'locked' } as const;
    if (booking.submissionId) {
      const row = await lockRow(tx, booking.submissionId);
      if (!row || !matchesIntake(booking, row) || row.status === 'completed') {
        return { ok: false, reason: 'locked' } as const;
      }
      if (row.status !== 'voided') {
        await tx.update(submissions).set({ status: 'voided', version: row.version + 1 }).where(eq(submissions.id, row.id));
        await logEvent(tx, row.id, 'voided');
      }
    }
    const [row] = await tx.update(appointments).set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(eq(appointments.id, booking.id)).returning();
    return { ok: true, row } as const;
  });
}

export function intakeIdentity(booking: Appointment, idType: IdentityType): FormValues {
  const [y, m, d] = booking.birthDate.split('-').map(Number);
  return {
    'profile.idType': idType, 'profile.idNo': booking.idNo, 'profile.name': booking.name,
    'profile.birthY': String(y - 1911), 'profile.birthM': String(m), 'profile.birthD': String(d),
  };
}

function canEditIntake(booking: Appointment, now: Date) {
  return booking.status !== 'cancelled' && booking.appointmentDate > todayIsoTaipei(now)
    && (booking.packageCode !== 'in_service' || booking.status !== 'confirmed');
}

export async function readAppointmentIntake(gate: AppointmentGate, device: string | null, now = new Date()) {
  if (!gate.appointmentId) return null;
  const where = ownedAppointmentWhere(gate, device, gate.appointmentId);
  if (!where) return null;
  const [record] = await db.select({ booking: appointments, intake: submissions }).from(appointments)
    .leftJoin(submissions, matchesAppointmentSubmission())
    .where(and(
      where, active, gte(appointments.appointmentDate, todayIsoTaipei(now)),
    ));
  if (!record || (record.booking.submissionId && (!record.intake || record.intake.status === 'voided'))) return null;
  return { ...record, editable: canEditIntake(record.booking, now) && record.intake?.status !== 'completed' };
}

export async function publicAppointmentView(booking: Appointment, device: string | null, now = new Date()) {
  const canManage = matchesAppointmentDevice(device, booking.id, booking.deviceAccessHash);
  const [intake] = !canManage || booking.status === 'cancelled' || !booking.submissionId ? [] : await db.select({
    status: submissions.status,
  }).from(appointments).innerJoin(submissions, matchesAppointmentSubmission()).where(eq(appointments.id, booking.id));
  return {
    id: booking.id, status: booking.status, name: canManage ? booking.name : null, date: booking.appointmentDate,
    packageCode: booking.packageCode, canManage,
    hasIntake: intake?.status === 'submitted' || intake?.status === 'completed',
    canCancel: canManage && booking.status !== 'cancelled' && booking.appointmentDate > todayIsoTaipei(now) && intake?.status !== 'completed',
    canOpenIntake: canManage && booking.status !== 'cancelled' && intake?.status !== 'voided'
      && (!!intake || (!booking.submissionId && canEditIntake(booking, now))),
  };
}

export async function saveAppointmentIntake(
  gate: AppointmentGate, device: string | null, id: string, expectedVersion: number | null, raw: unknown, now = new Date(),
) {
  return db.transaction(async (tx) => {
    const booking = await lockAppointment(tx, gate, device, id);
    if (!booking || booking.status === 'cancelled') return { ok: false, reason: 'not_found' } as const;
    const current = booking.submissionId ? await lockRow(tx, booking.submissionId) : null;
    if (booking.submissionId && (!current || !matchesIntake(booking, current) || current.status === 'voided')) {
      return { ok: false, reason: 'locked' } as const;
    }
    const values = { ...sanitize(labor, 'public', raw), ...intakeIdentity(booking, gate.idType),
      'profile.idType': current ? current.publicData['profile.idType'] ?? '' : gate.idType };
    const errors = validateRules(labor.publicRules, values, now);
    if (Object.keys(errors).length) return { ok: false, reason: 'invalid', errors } as const;
    if (current) {
      const row = current;
      const writtenVersion = expectedVersion === null ? 1 : expectedVersion + 1;
      if ((row.status === 'submitted' || row.status === 'completed')
        && row.version === writtenVersion && samePublicData(row, values)) return { ok: true } as const;
      if (!canEditIntake(booking, now) || row.status !== 'returned') return { ok: false, reason: 'locked' } as const;
      if (row.version !== expectedVersion) return { ok: false, reason: 'conflict' } as const;
      await updateReturned(tx, row, values, now);
      return { ok: true } as const;
    }
    if (!canEditIntake(booking, now) || expectedVersion !== null) return { ok: false, reason: 'locked' } as const;
    const [row] = await tx.insert(submissions).values({
      formId: 'labor', status: 'submitted', idNo: booking.idNo, name: booking.name, birthDate: booking.birthDate,
      publicData: values, publicSubmittedAt: now,
    }).returning({ id: submissions.id });
    await tx.update(appointments).set({ submissionId: row.id, updatedAt: now }).where(eq(appointments.id, booking.id));
    await logEvent(tx, row.id, 'submitted');
    return { ok: true } as const;
  });
}

export async function returnAppointmentIntake(gate: AppointmentGate, device: string | null, id: string, version: number, now = new Date()) {
  return db.transaction(async (tx) => {
    const booking = await lockAppointment(tx, gate, device, id);
    if (!booking?.submissionId || !canEditIntake(booking, now)) return { ok: false, reason: 'locked' } as const;
    const row = await lockRow(tx, booking.submissionId);
    if (!row || !matchesIntake(booking, row)) return { ok: false, reason: 'not_found' } as const;
    if (row.status === 'returned' && row.version === version + 1) return { ok: true } as const;
    if (row.status !== 'submitted' || row.version !== version) return { ok: false, reason: 'conflict' } as const;
    await tx.update(submissions).set({ status: 'returned', version: row.version + 1 }).where(eq(submissions.id, row.id));
    await logEvent(tx, row.id, 'returned');
    return { ok: true } as const;
  });
}
