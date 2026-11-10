import 'server-only';

import { type AnyColumn, and, eq, exists, gte, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { appointments, submissions, type SubmissionStatus, users } from '@/db/schema';
import { toTaipeiInput } from '@/lib/time';
import type { AppointmentStatus } from './catalog';

/** 只有協同完成列表使用這組狀態對照。 */
export const APPOINTMENT_LIST_STATUS = {
  pending: 'submitted',
  confirmed: 'completed',
  cancelled: 'voided',
} as const satisfies Record<AppointmentStatus, SubmissionStatus>;

export const appointmentListStatus = sql<SubmissionStatus>`case ${appointments.status}
  when 'pending' then ${APPOINTMENT_LIST_STATUS.pending}::text
  when 'confirmed' then ${APPOINTMENT_LIST_STATUS.confirmed}::text
  else ${APPOINTMENT_LIST_STATUS.cancelled}::text
end`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_INTAKE_STATUSES = ['submitted', 'completed'] as const satisfies readonly SubmissionStatus[];
const taipeiDate = (now: Date) => toTaipeiInput(now).slice(0, 10);

export type SubmissionIdentityColumns = Record<'id' | 'formId' | 'idNo' | 'birthDate', AnyColumn>;

/** 關聯的表單須為同一人的勞工表，證件號及生日均須相符。 */
export function matchesAppointmentSubmission(form: SubmissionIdentityColumns = submissions) {
  return and(
    eq(form.id, appointments.submissionId),
    eq(form.formId, 'labor'),
    eq(form.idNo, appointments.idNo),
    eq(form.birthDate, appointments.birthDate),
  );
}

/** 排程只通知目前可由院所確認的預約。 */
export function appointmentReadyForConfirmation(now = new Date()) {
  const validIntake = db.select({ id: submissions.id }).from(submissions).where(and(
    matchesAppointmentSubmission(),
    inArray(submissions.status, VALID_INTAKE_STATUSES),
  ));
  return and(
    eq(appointments.status, 'pending'),
    gte(appointments.appointmentDate, taipeiDate(now)),
    or(ne(appointments.packageCode, 'in_service'), exists(validIntake)),
  );
}

type ConfirmationBlock = 'date_passed' | 'form_required';

export async function getAppointment(id: string, now = new Date()) {
  if (!UUID.test(id)) return null;
  const [row] = await db.select({
    appointment: appointments,
    confirmedByName: users.name,
    submission: {
      id: submissions.id,
      status: submissions.status,
      publicData: submissions.publicData,
      publicSubmittedAt: submissions.publicSubmittedAt,
    },
  })
    .from(appointments)
    .leftJoin(users, eq(appointments.confirmedBy, users.id))
    .leftJoin(submissions, matchesAppointmentSubmission())
    .where(eq(appointments.id, id));
  if (!row) return null;

  const { appointment, confirmedByName, submission } = row;
  let confirmationBlock: ConfirmationBlock | null = null;
  if (appointment.status === 'pending') {
    if (appointment.appointmentDate < taipeiDate(now)) {
      confirmationBlock = 'date_passed';
    } else if (appointment.packageCode === 'in_service' &&
      (!submission || !VALID_INTAKE_STATUSES.some((status) => status === submission.status))) {
      confirmationBlock = 'form_required';
    }
  }
  return { ...appointment, confirmedByName, submission, confirmationBlock };
}

export type ConfirmAppointmentResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'not_pending' | ConfirmationBlock };

/** 同一筆預約只能確認一次，並在鎖定關聯表單後檢查在職套餐的必填條件。 */
export async function confirmAppointment(id: string, actorId: string, now = new Date()): Promise<ConfirmAppointmentResult> {
  if (!UUID.test(actorId)) return { ok: false, reason: 'forbidden' };
  if (!UUID.test(id)) return { ok: false, reason: 'not_found' };
  return db.transaction(async (tx): Promise<ConfirmAppointmentResult> => {
    const [actor] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.id, actorId), eq(users.status, 'active'))).for('share');
    if (!actor) return { ok: false, reason: 'forbidden' };

    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id)).for('update');
    if (!appointment) return { ok: false, reason: 'not_found' };
    if (appointment.status !== 'pending') return { ok: false, reason: 'not_pending' };
    if (appointment.appointmentDate < taipeiDate(now)) return { ok: false, reason: 'date_passed' };

    if (appointment.packageCode === 'in_service') {
      const [intake] = await tx.select({ id: submissions.id })
        .from(appointments)
        .innerJoin(submissions, matchesAppointmentSubmission())
        .where(and(eq(appointments.id, id), inArray(submissions.status, VALID_INTAKE_STATUSES)))
        .for('share', { of: submissions });
      if (!intake) return { ok: false, reason: 'form_required' };
    }

    await tx.update(appointments).set({
      status: 'confirmed',
      confirmedBy: actorId,
      confirmedAt: now,
      updatedAt: now,
    }).where(eq(appointments.id, id));
    return { ok: true };
  });
}
