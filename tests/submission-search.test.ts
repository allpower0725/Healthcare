import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { type SubmissionStatus, submissions } from '@/db/schema';
import { FORM_IDS, type FormId } from '@/lib/forms/catalog';
import { DEFAULT_STATUSES, PAGE_SIZE, parseQuery, queryString, sortHref } from '@/lib/submissions/query';
import { searchSubmissions } from '@/lib/submissions/service';
import { resetDb } from './helpers';

describe('網址參數', () => {
  it('沒有參數時用預設值：全部表單、未作廢、依送出時間新到舊、第 1 頁', () => {
    expect(parseQuery({})).toEqual({
      idNo: '',
      forms: [...FORM_IDS],
      statuses: DEFAULT_STATUSES,
      sort: 'submitted',
      dir: 'desc',
      page: 1,
    });
  });

  it('身分證號轉大寫去空白；不合法的值忽略', () => {
    const q = parseQuery({
      id: ' a12 3 ',
      form: ['pap', 'evil'],
      status: ['voided', 'nope'],
      sort: 'drop table',
      dir: 'sideways',
      page: '-3',
    });
    expect(q).toMatchObject({ idNo: 'A123', forms: ['pap'], statuses: ['voided'], sort: 'submitted', dir: 'desc', page: 1 });
  });

  it('勾選框全部不勾等於不限制', () => {
    expect(parseQuery({ form: [], status: [] })).toMatchObject({ forms: [...FORM_IDS], statuses: DEFAULT_STATUSES });
  });

  it('組回網址時省略預設值；換排序回到第 1 頁', () => {
    expect(queryString(parseQuery({}))).toBe('');
    const q = parseQuery({ id: 'a1', form: 'hpv', sort: 'name', dir: 'asc', page: '3' });
    expect(queryString(q)).toBe('?id=A1&form=hpv&sort=name&dir=asc&page=3');
    expect(sortHref(q, 'name')).toBe('/admin/submissions?id=A1&form=hpv&sort=name&dir=desc');
    expect(sortHref(q, 'submitted')).toBe('/admin/submissions?id=A1&form=hpv');
  });
});

let seq = 0;
async function insert(fields: {
  formId?: FormId;
  idNo?: string;
  name?: string;
  status?: SubmissionStatus;
  submittedAt?: Date;
  completedAt?: Date | null;
}) {
  seq += 1;
  const [row] = await db
    .insert(submissions)
    .values({
      formId: fields.formId ?? 'hpv',
      status: fields.status ?? 'submitted',
      idNo: fields.idNo ?? `B${String(100000000 + seq)}`,
      name: fields.name ?? `民眾${seq}`,
      publicData: {},
      publicSubmittedAt: fields.submittedAt ?? new Date(Date.UTC(2026, 9, 1, 0, seq)),
      completedAt: fields.completedAt ?? null,
    })
    .returning({ id: submissions.id });
  return row.id;
}

describe('篩選、排序、分頁', () => {
  beforeEach(resetDb);

  it('身分證號部分比對，不分大小寫', async () => {
    const a = await insert({ idNo: 'A123456789' });
    await insert({ idNo: 'B987654321' });
    const result = await searchSubmissions(parseQuery({ id: 'a123' }));
    expect(result.rows.map((r) => r.id)).toEqual([a]);
    expect((await searchSubmissions(parseQuery({ id: '6789' }))).rows.map((r) => r.id)).toEqual([a]);
  });

  it('身分證號中的 % 與 _ 當一般字元', async () => {
    await insert({ idNo: 'A123456789' });
    expect((await searchSubmissions(parseQuery({ id: '%' }))).total).toBe(0);
    expect((await searchSubmissions(parseQuery({ id: 'A_2' }))).total).toBe(0);
  });

  it('只勾表單種類也能篩選；多個條件須同時符合', async () => {
    const pap = await insert({ formId: 'pap', idNo: 'A100000001' });
    await insert({ formId: 'hpv', idNo: 'A100000002' });
    await insert({ formId: 'fit', idNo: 'C100000003' });
    expect((await searchSubmissions(parseQuery({ form: 'pap' }))).rows.map((r) => r.id)).toEqual([pap]);
    expect((await searchSubmissions(parseQuery({ form: ['pap', 'hpv'], id: 'A' }))).total).toBe(2);
    expect((await searchSubmissions(parseQuery({ form: 'fit', id: 'A' }))).total).toBe(0);
  });

  it('預設不含已作廢；勾選已作廢才列出', async () => {
    await insert({});
    const voided = await insert({ status: 'voided' });
    expect((await searchSubmissions(parseQuery({}))).rows.map((r) => r.id)).not.toContain(voided);
    expect((await searchSubmissions(parseQuery({ status: 'voided' }))).rows.map((r) => r.id)).toEqual([voided]);
  });

  it('依姓名、狀態、表單、完成時間排序', async () => {
    const b = await insert({ name: 'B', status: 'completed', formId: 'adult', completedAt: new Date('2026-10-02') });
    const a = await insert({ name: 'A', status: 'returned', formId: 'pap' });
    const c = await insert({ name: 'C', status: 'submitted', formId: 'hpv' });
    const ids = async (raw: Record<string, string>) => (await searchSubmissions(parseQuery(raw))).rows.map((r) => r.id);

    expect(await ids({ sort: 'name', dir: 'asc' })).toEqual([a, b, c]);
    expect(await ids({ sort: 'status', dir: 'asc' })).toEqual([c, a, b]);
    expect(await ids({ sort: 'form', dir: 'asc' })).toEqual([c, a, b]);
    expect(await ids({ sort: 'form', dir: 'desc' })).toEqual([b, a, c]);
    // 沒有完成時間的排在最後（不論方向）
    expect((await ids({ sort: 'completed', dir: 'desc' }))[0]).toBe(b);
    expect((await ids({ sort: 'completed', dir: 'asc' }))[0]).toBe(b);
    // 預設：送出時間新到舊
    expect(await ids({})).toEqual([c, a, b]);
  });

  it('分頁與總筆數', async () => {
    for (let i = 0; i < PAGE_SIZE + 5; i++) await insert({});
    const first = await searchSubmissions(parseQuery({}));
    const second = await searchSubmissions(parseQuery({ page: '2' }));
    expect(first).toMatchObject({ total: PAGE_SIZE + 5, pages: 2 });
    expect(first.rows).toHaveLength(PAGE_SIZE);
    expect(second.rows).toHaveLength(5);
    expect(new Set([...first.rows, ...second.rows].map((r) => r.id)).size).toBe(PAGE_SIZE + 5);
  });

  it('同一人同表單有兩筆以上未完成時標示重複', async () => {
    await insert({ idNo: 'D100000001' });
    await insert({ idNo: 'D100000001' });
    await insert({ idNo: 'D100000001', status: 'completed' });
    const rows = (await searchSubmissions(parseQuery({ id: 'D1' }))).rows;
    expect(rows.map((r) => r.duplicates).sort()).toEqual([0, 1, 1]);
  });
});
