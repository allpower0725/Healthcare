// 協同完成列表的篩選、排序、分頁條件，與網址參數互轉（篩選結果可重新整理、分享）
import { SUBMISSION_STATUSES, type SubmissionStatus } from '@/db/schema';
import { FORM_IDS, type FormId } from '@/lib/forms/catalog';

export const LIST_PATH = '/admin/submissions';
export const PAGE_SIZE = 50;
export const SORT_KEYS = ['form', 'status', 'name', 'idNo', 'submitted', 'completed'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';

export type SubmissionQuery = {
  /** 身分證號（部分比對） */
  idNo: string;
  /** 勾選的表單；全不勾時沒有資料 */
  forms: FormId[];
  /** 勾選的狀態；全不勾時沒有資料 */
  statuses: SubmissionStatus[];
  sort: SortKey;
  dir: SortDir;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
/** 時間欄位預設新到舊，其他欄位預設小到大 */
const defaultDir = (sort: SortKey): SortDir => (sort === 'submitted' || sort === 'completed' ? 'desc' : 'asc');

export function parseQuery(raw: Raw): SubmissionQuery {
  const forms = FORM_IDS.filter((id) => list(raw.form).includes(id));
  const statuses = SUBMISSION_STATUSES.filter((s) => list(raw.status).includes(s));
  const sortRaw = list(raw.sort)[0];
  const sort = (SORT_KEYS as readonly string[]).includes(sortRaw ?? '') ? (sortRaw as SortKey) : 'submitted';
  const dirRaw = list(raw.dir)[0];
  const page = Math.floor(Number(list(raw.page)[0]));

  return {
    idNo: (list(raw.id)[0] ?? '').toUpperCase().replace(/\s+/g, '').slice(0, 20),
    forms,
    statuses,
    sort,
    dir: dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : defaultDir(sort),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** 組回網址參數，省略預設值 */
export function queryString(q: SubmissionQuery, patch: Partial<SubmissionQuery> = {}) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  if (next.idNo) params.set('id', next.idNo);
  next.forms.forEach((f) => params.append('form', f));
  next.statuses.forEach((s) => params.append('status', s));
  if (next.sort !== 'submitted' || next.dir !== 'desc') {
    params.set('sort', next.sort);
    params.set('dir', next.dir);
  }
  if (next.page > 1) params.set('page', String(next.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** 點欄位排序：同一欄切換方向，換欄位用該欄的預設方向；都回到第 1 頁 */
export function sortHref(q: SubmissionQuery, sort: SortKey) {
  const dir = q.sort === sort ? (q.dir === 'asc' ? 'desc' : 'asc') : defaultDir(sort);
  return `${LIST_PATH}${queryString(q, { sort, dir, page: 1 })}`;
}

export function pageHref(q: SubmissionQuery, page: number) {
  return `${LIST_PATH}${queryString(q, { page })}`;
}

/** 從其他頁連到列表：沒指定的表單、狀態全選（全不勾時沒有資料） */
export function listHref(patch: Partial<SubmissionQuery> = {}) {
  const all = parseQuery({ form: [...FORM_IDS], status: [...SUBMISSION_STATUSES] });
  return `${LIST_PATH}${queryString(all, patch)}`;
}
