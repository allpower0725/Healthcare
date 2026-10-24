import '@/components/forms/forms.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { SubmissionAction } from '@/db/schema';
import { requireUser } from '@/lib/auth/dal';
import { artSvg } from '@/lib/forms/art';
import { FORMS } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { sanitize } from '@/lib/forms/engine';
import { findDuplicates, getSubmission, listEvents } from '@/lib/submissions/service';
import { formatDateTime } from '@/lib/time';
import adminStyles from '../../admin.module.css';
import formStyles from '../../forms/forms.module.css';
import { SubmissionStatusBadge } from '../../ui';
import styles from '../submissions.module.css';
import { SubmissionEditor } from './submission-editor';

export const metadata: Metadata = { title: '協同完成' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_LABELS: Record<SubmissionAction, string> = {
  submitted: '民眾送出',
  returned: '民眾退回修改',
  resubmitted: '民眾修改後再次送出',
  completed: '確認送出（鎖定）',
  reopened: '取消送出',
  voided: '作廢',
  restored: '復原作廢',
};

type Params = PageProps<'/admin/submissions/[id]'>['params'];

export default function SubmissionPage({ params }: PageProps<'/admin/submissions/[id]'>) {
  return (
    <>
      <Link className={`btn btn--ghost btn--sm ${formStyles.back}`} href="/admin/submissions">
        ← 協同完成
      </Link>
      <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
        <SubmissionDetail params={params} />
      </Suspense>
    </>
  );
}

async function SubmissionDetail({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireUser();

  const submission = await getSubmission(id);
  if (!submission) notFound();
  const def = getFormDef(submission.formId);
  const form = FORMS[submission.formId];
  if (!def) notFound();

  const [duplicates, events] = await Promise.all([findDuplicates(id), listEvents(id)]);

  // 院所區第一次開啟時帶入預設值（之後以已暫存的內容為準）
  const hasStaffData = Object.keys(submission.staffData).length > 0;
  const staffData = hasStaffData
    ? submission.staffData
    : sanitize(def, 'staff', def.staffDefaults(submission.publicData, new Date()), submission.publicData);

  // 操作紀錄與「院所區最後修改」依時間排在一起
  const history = [
    ...events.map((event) => ({
      at: event.createdAt,
      text: `${EVENT_LABELS[event.action]}${event.actorName ? `（${event.actorName}）` : ''}`,
    })),
    ...(submission.staffUpdatedAt
      ? [
          {
            at: submission.staffUpdatedAt,
            text: `院所區最後修改（${submission.staffUpdatedByName ?? '—'}）`,
          },
        ]
      : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const completedNote =
    submission.status === 'completed' && submission.completedAt
      ? `已完成，資料已鎖定（${submission.completedByName ?? '—'}・${formatDateTime(submission.completedAt)} 確認送出）。`
      : null;

  return (
    <>
      <header className={styles.head}>
        <div
          className={styles.headArt}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: artSvg(submission.formId) }}
        />
        <div>
          <h1>
            {submission.name}
            <SubmissionStatusBadge status={submission.status} />
          </h1>
          <p className={styles.headMeta}>
            <span>
              <b>{form.name}</b>
            </span>
            <span className={styles.mono}>{submission.idNo}</span>
            <span>民眾送出：{formatDateTime(submission.publicSubmittedAt)}</span>
          </p>
        </div>
      </header>

      {duplicates.length > 0 && (
        <div className={`notice notice--warn ${styles.dups}`} role="status">
          <p>這個人還有 {duplicates.length} 筆「{form.name}」尚未完成，可能是重複送出；確認後可以把多的那筆作廢。</p>
          <div className={styles.dupLinks}>
            {duplicates.map((d) => (
              <Link key={d.id} className="btn btn--ghost btn--sm" href={`/admin/submissions/${d.id}`}>
                開啟 {formatDateTime(d.publicSubmittedAt)} 送出的資料
              </Link>
            ))}
          </div>
        </div>
      )}

      <SubmissionEditor
        key={`${submission.id}-${submission.status}-${submission.version}`}
        id={submission.id}
        formId={submission.formId}
        status={submission.status}
        version={submission.version}
        publicData={submission.publicData}
        staffData={staffData}
        printHref={`/admin/submissions/${submission.id}/print`}
        completedNote={completedNote}
      />

      <section className={styles.history} aria-labelledby="history-title">
        <h2 id="history-title">操作紀錄</h2>
        <ol>
          {history.map((item, i) => (
            <li key={i}>
              {formatDateTime(item.at)}　{item.text}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
