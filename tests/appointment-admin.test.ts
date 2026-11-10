import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { appointments, submissions } from '@/db/schema';
import { confirmAppointment, getAppointment } from '@/lib/appointments/service';
import { PAGE_SIZE, parseQuery } from '@/lib/submissions/query';
import { searchSubmissions } from '@/lib/submissions/service';
import { createUser, resetDb } from './helpers';

const NOW = new Date('2026-11-09T16:00:00Z'); // 台灣 11/10 00:00
const identity = { idNo: 'A234567893', name: '預約測試民眾', birthDate: '1990-01-02' };

async function insertAppointment(fields: Partial<typeof appointments.$inferInsert> = {}) {
  const [row] = await db.insert(appointments).values({
    ...identity,
    appointmentDate: '2026-11-12',
    packageCode: 'new_worker',
    createdAt: NOW,
    ...fields,
  }).returning();
  return row;
}

async function insertForm(fields: Partial<typeof submissions.$inferInsert> = {}) {
  const [row] = await db.insert(submissions).values({
    ...identity,
    formId: 'labor',
    status: 'submitted',
    publicData: {},
    publicSubmittedAt: NOW,
    ...fields,
  }).returning();
  return row;
}

beforeEach(resetDb);

describe('協同完成的預約案件', () => {
  it('依原有條件合併查詢，關聯勞工表只在預約列出現一次', async () => {
    const linked = await insertForm();
    const normal = await insertForm();
    const pending = await insertAppointment({ submissionId: linked.id });
    const confirmed = await insertAppointment({ status: 'confirmed', confirmedAt: NOW });
    const cancelled = await insertAppointment({ status: 'cancelled', cancelledAt: NOW });

    const results = await searchSubmissions(parseQuery({ id: '測試民眾' }));
    expect(results.total).toBe(2);
    expect(results.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: pending.id, formId: 'appointment', status: 'submitted', printSubmissionId: linked.id }),
      expect.objectContaining({ id: normal.id, formId: 'labor', duplicates: 0, printSubmissionId: normal.id }),
    ]));

    const onlyLabor = await searchSubmissions(parseQuery({ form: 'labor', status: 'submitted' }));
    expect(onlyLabor.rows.map(row => row.id)).toEqual([normal.id]);
    const completed = await searchSubmissions(parseQuery({ form: 'appointment', status: 'completed', id: 'a234' }));
    expect(completed.rows).toEqual([expect.objectContaining({ id: confirmed.id, printSubmissionId: null })]);
    const voided = await searchSubmissions(parseQuery({ form: 'appointment', status: 'voided' }));
    expect(voided.rows.map(row => row.id)).toEqual([cancelled.id]);
    expect((await searchSubmissions(parseQuery({ form: 'appointment', status: 'returned' }))).total).toBe(0);
  });

  it('將預約和一般表單一起排序後再分頁', async () => {
    const records = Array.from({ length: PAGE_SIZE + 2 }, (_, index) => ({
      ...identity,
      name: `案${String(index).padStart(2, '0')}`,
    }));
    await db.insert(appointments).values(records.filter((_, index) => index % 2 === 0)
      .map(person => ({ ...person, appointmentDate: '2026-11-12', packageCode: 'food_service' as const })));
    await db.insert(submissions).values(records.filter((_, index) => index % 2 === 1)
      .map(person => ({ ...person, formId: 'hpv' as const, status: 'submitted' as const, publicData: {}, publicSubmittedAt: NOW })));

    const first = await searchSubmissions(parseQuery({ sort: 'name', dir: 'asc' }));
    const last = await searchSubmissions(parseQuery({ sort: 'name', dir: 'asc', page: '2' }));
    expect(first).toMatchObject({ total: PAGE_SIZE + 2, pages: 2 });
    expect(first.rows).toHaveLength(PAGE_SIZE);
    expect(last.rows).toHaveLength(2);
    expect([...first.rows, ...last.rows].map(row => row.name)).toEqual(records.map(person => person.name));
  });

  it('一般套餐可直接確認，並行確認只記錄一次', async () => {
    const pending = await insertAppointment();
    const actor = await createUser();
    const other = await createUser();

    const results = await Promise.all([
      confirmAppointment(pending.id, actor.id, NOW),
      confirmAppointment(pending.id, other.id, NOW),
    ]);
    expect(results).toEqual(expect.arrayContaining([{ ok: true }, { ok: false, reason: 'not_pending' }]));
    expect(await getAppointment(pending.id, NOW)).toMatchObject({
      status: 'confirmed', confirmedBy: results[0].ok ? actor.id : other.id, confirmedAt: NOW, submission: null,
    });
  });

  it('在職套餐須有本人有效送出的勞工表，確認不改寫問卷狀態', async () => {
    const actor = await createUser();
    const pending = await insertAppointment({ packageCode: 'in_service' });
    expect(await getAppointment(pending.id, NOW)).toMatchObject({ confirmationBlock: 'form_required' });
    expect(await confirmAppointment(pending.id, actor.id, NOW)).toEqual({ ok: false, reason: 'form_required' });

    const wrongPerson = await insertForm({ birthDate: '1991-01-02' });
    await db.update(appointments).set({ submissionId: wrongPerson.id }).where(eq(appointments.id, pending.id));
    expect(await getAppointment(pending.id, NOW)).toMatchObject({ confirmationBlock: 'form_required', submission: null });
    expect(await confirmAppointment(pending.id, actor.id, NOW)).toEqual({ ok: false, reason: 'form_required' });

    const own = await insertForm({ status: 'returned' });
    await db.update(appointments).set({ submissionId: own.id }).where(eq(appointments.id, pending.id));
    expect(await confirmAppointment(pending.id, actor.id, NOW)).toEqual({ ok: false, reason: 'form_required' });
    await db.update(submissions).set({ status: 'submitted' }).where(eq(submissions.id, own.id));
    expect(await confirmAppointment(pending.id, actor.id, NOW)).toEqual({ ok: true });
    expect(await getAppointment(pending.id, NOW)).toMatchObject({
      status: 'confirmed', confirmedByName: actor.name, submission: { id: own.id, status: 'submitted' },
    });
  });

  it('拒絕過期預約與停用人員，台灣當日仍可確認', async () => {
    const actor = await createUser();
    const disabled = await createUser({ status: 'disabled' });
    const expired = await insertAppointment({ appointmentDate: '2026-11-09' });
    const today = await insertAppointment({ appointmentDate: '2026-11-10' });
    expect(await confirmAppointment(expired.id, actor.id, NOW)).toEqual({ ok: false, reason: 'date_passed' });
    expect(await confirmAppointment(today.id, disabled.id, NOW)).toEqual({ ok: false, reason: 'forbidden' });
    expect(await confirmAppointment(today.id, actor.id, NOW)).toEqual({ ok: true });
  });
});
