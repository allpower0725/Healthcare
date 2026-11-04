import { LoadingOverlay } from '@/app/admin/loading-overlay';
import type { Metadata } from 'next';
import Form from 'next/form';
import { AdminLink as Link } from '@/app/admin/pending-ui';
import { type ReactNode, Suspense } from 'react';
import { SUBMISSION_STATUSES } from '@/db/schema';
import { PrintDocumentButton } from '@/components/forms/print-document-button';
import { requireUser } from '@/lib/auth/dal';
import { FORM_IDS, FORMS } from '@/lib/forms/catalog';
import {
  LIST_PATH,
  pageHref,
  parseQuery,
  queryString,
  type SortKey,
  type SubmissionQuery,
  sortHref,
} from '@/lib/submissions/query';
import { searchSubmissions } from '@/lib/submissions/service';
import { formatDateTime } from '@/lib/time';
import adminStyles from '../admin.module.css';
import { SUBMISSION_STATUS_LABELS, SubmissionStatusBadge } from '../ui';
import { FilterToggle } from './filter-toggle';
import { FormPending } from '../pending-ui';
import { SubmissionDetail } from './submission-detail';
import { SubmissionModal } from './submission-modal';
import styles from './submissions.module.css';

export const metadata: Metadata = { title: '協同完成' };

export default function SubmissionsPage({ searchParams }: PageProps<'/admin/submissions'>) {
  return (
    <>
      <div className={adminStyles.pageHead}>
        <h1>協同完成</h1>
        <p>
          民眾送出的表單由院所人員核對，並依表單填寫院所區，各狀態皆可列印。勾選表單種類與狀態後按「篩選」，兩組都至少要勾一項；可輸入姓名或部分身分證號查詢，輸入查詢內容時自動全選，清空後恢復原本勾選。點欄位標題排序。
        </p>
      </div>
      <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
        <SubmissionList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function Filters({ q }: { q: SubmissionQuery }) {
  const keepSort = q.sort !== 'submitted' || q.dir !== 'desc';
  return (
    // key：條件改變時重建，讓欄位顯示目前套用的條件
    <Form key={queryString(q)} action={LIST_PATH} className={styles.filters}>
      <input type="hidden" name="filtered" value="1" />
      <FormPending />
      <div className={styles.filterGroup}>
        <label className={styles.groupLabel} htmlFor="filter-id">
          姓名／身分證號
        </label>
        <input
          id="filter-id"
          className={`input ${styles.idInput}`}
          name="id"
          defaultValue={q.idNo}
          maxLength={80}
          placeholder="姓名或部分身分證號"
          autoComplete="off"
        />
      </div>

      <div className={styles.filterGroup} role="group" aria-labelledby="filter-forms">
        <span className={styles.groupLabel} id="filter-forms">
          表單種類
        </span>
        <div className={styles.checks}>
          {FORM_IDS.map((id) => (
            <label key={id} className={styles.check}>
              <input type="checkbox" name="form" value={id} defaultChecked={q.forms.includes(id)} />
              <span>{FORMS[id].shortName}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup} role="group" aria-labelledby="filter-status">
        <span className={styles.groupLabel} id="filter-status">
          狀態
        </span>
        <div className={styles.checks}>
          {SUBMISSION_STATUSES.map((status) => (
            <label key={status} className={styles.check}>
              <input type="checkbox" name="status" value={status} defaultChecked={q.statuses.includes(status)} />
              <span>{SUBMISSION_STATUS_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </div>

      {keepSort && (
        <>
          <input type="hidden" name="sort" value={q.sort} />
          <input type="hidden" name="dir" value={q.dir} />
        </>
      )}

      <div className={styles.filterActions}>
        <button type="submit" className="btn btn--primary">
          篩選
        </button>
        <FilterToggle initialActive={Boolean(q.idNo) || q.forms.length > 0 || q.statuses.length > 0} />
      </div>
    </Form>
  );
}

function SortButton({ q, sort, children }: { q: SubmissionQuery; sort: SortKey; children: ReactNode }) {
  const active = q.sort === sort;
  const arrow = active ? (q.dir === 'asc' ? '▲' : '▼') : '⇅';
  return (
    <Link
      className={`${styles.sortBtn}${active ? ` ${styles.sortActive}` : ''}`}
      href={sortHref(q, sort)}
      aria-label={`依${children}排序${active ? (q.dir === 'asc' ? '（目前由小到大）' : '（目前由大到小）') : ''}`}
    >
      {children}
      <span aria-hidden="true">{arrow}</span>
    </Link>
  );
}

async function SubmissionList({ searchParams }: { searchParams: PageProps<'/admin/submissions'>['searchParams'] }) {
  await requireUser();
  const raw = await searchParams;
  const q = parseQuery(raw);
  const openId = typeof raw.open === 'string' ? raw.open : null;
  const returnHref = `${LIST_PATH}${queryString(q)}`;
  const { rows, total, pages } = await searchSubmissions(q);
  // 任一組全不勾就沒有資料：提示要勾哪一組，免得誤以為查無此人
  const unchecked = [!q.forms.length && '表單種類', !q.statuses.length && '狀態'].filter(Boolean);

  return (
    <>
      <Filters q={q} />

      <div className={styles.toolbar}>
        <span className={styles.count}>
          共 {total} 筆{pages > 1 && `，第 ${q.page} / ${pages} 頁`}
        </span>
      </div>

      <div className={`${adminStyles.card} ${styles.tableCard}`}>
        {rows.length === 0 ? (
          <p className={styles.empty}>
            {unchecked.length
              ? `尚未勾選${unchecked.join('與')}。請勾選要查看的條件，或按「條件全選」後再按「篩選」。`
              : '沒有符合條件的資料。'}
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">
                  <SortButton q={q} sort="form">
                    表單
                  </SortButton>
                </th>
                <th scope="col">
                  <SortButton q={q} sort="status">
                    狀態
                  </SortButton>
                </th>
                <th scope="col">
                  <SortButton q={q} sort="name">
                    姓名
                  </SortButton>
                </th>
                <th scope="col">
                  <SortButton q={q} sort="idNo">
                    身分證號
                  </SortButton>
                </th>
                <th scope="col">
                  <SortButton q={q} sort="submitted">
                    民眾送出
                  </SortButton>
                </th>
                <th scope="col">
                  <SortButton q={q} sort="completed">
                    院所完成
                  </SortButton>
                </th>
                <th scope="col">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="表單">
                    <span className={styles.formCell}>
                      <span className={styles.formDot} style={{ background: FORMS[row.formId].color }} />
                      {FORMS[row.formId].shortName}
                    </span>
                  </td>
                  <td data-label="狀態">
                    <span className={styles.badges}>
                      <SubmissionStatusBadge status={row.status} />
                      {row.duplicates > 0 && (
                        <span className="badge badge--dup" title="同一人、同一表單還有其他未完成的資料">
                          可能重複
                        </span>
                      )}
                    </span>
                  </td>
                  <td data-label="姓名" className={styles.name}>
                    {row.name}
                  </td>
                  <td data-label="身分證號" className={styles.mono}>
                    {row.idNo}
                  </td>
                  <td data-label="民眾送出" className={styles.date}>
                    {formatDateTime(row.publicSubmittedAt)}
                  </td>
                  <td data-label="院所完成" className={styles.date}>
                    {formatDateTime(row.completedAt)}
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.rowActions}>
                      <Link className="btn btn--ghost btn--sm" href={`${returnHref}&open=${row.id}`} scroll={false}>
                        開啟
                      </Link>
                      <PrintDocumentButton className="btn btn--primary btn--sm" href={`/admin/submissions/${row.id}/print`}>
                        列印 / 另存原樣 PDF
                      </PrintDocumentButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId && (
        <SubmissionModal key={openId} returnHref={returnHref}>
          <Suspense fallback={<LoadingOverlay message="載入表單中…" />}>
            <SubmissionDetail params={Promise.resolve({ id: openId })} />
          </Suspense>
        </SubmissionModal>
      )}

      {pages > 1 && (
        <nav className={styles.pager} aria-label="分頁">
          {q.page > 1 ? (
            <Link className="btn btn--ghost btn--sm" href={pageHref(q, q.page - 1)}>
              ‹ 上一頁
            </Link>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" disabled>
              ‹ 上一頁
            </button>
          )}
          <span className={styles.count}>
            第 {q.page} / {pages} 頁
          </span>
          {q.page < pages ? (
            <Link className="btn btn--ghost btn--sm" href={pageHref(q, q.page + 1)}>
              下一頁 ›
            </Link>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" disabled>
              下一頁 ›
            </button>
          )}
        </nav>
      )}
    </>
  );
}
