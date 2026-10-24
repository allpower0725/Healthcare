import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { artSvg } from '@/lib/forms/art';
import { FORMS } from '@/lib/forms/catalog';
import { describePeriod, formStatus, listFormSettings } from '@/lib/forms/settings';
import { listHref } from '@/lib/submissions/query';
import { countSubmissionsByStatus } from '@/lib/submissions/service';
import { countPendingUsers } from '@/lib/users/service';
import adminStyles from '../admin.module.css';
import { FormStatusBadge } from '../ui';
import styles from './forms.module.css';

export const metadata: Metadata = { title: '表單管理' };

export default function FormsPage() {
  return (
    <>
      <div className={adminStyles.pageHead}>
        <h1>表單管理</h1>
        <p>每張表單有固定的填寫 QR code。點選表單可設定開放時間、下載 QR code 與列印海報。</p>
      </div>
      <Suspense fallback={null}>
        <Reminders />
      </Suspense>
      <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
        <FormCards />
      </Suspense>
    </>
  );
}

/** 後台首頁的待辦提醒：待院所填寫的表單、待審核的使用申請（管理者才看得到） */
async function Reminders() {
  const user = await requireUser();
  const [counts, pendingUsers] = await Promise.all([
    countSubmissionsByStatus(),
    user.role === 'staff' ? Promise.resolve(0) : countPendingUsers(),
  ]);
  if (counts.submitted === 0 && pendingUsers === 0) return null;

  return (
    <div className={styles.reminders}>
      {counts.submitted > 0 && (
        <p className={`notice notice--warn ${styles.reminder}`} role="status">
          <span>有 {counts.submitted} 份民眾已送出的表單等待院所填寫。</span>
          <Link className="btn btn--ghost btn--sm" href={listHref({ statuses: ['submitted'] })}>
            前往協同完成
          </Link>
        </p>
      )}
      {pendingUsers > 0 && (
        <p className={`notice notice--warn ${styles.reminder}`} role="status">
          <span>有 {pendingUsers} 位人員的使用申請等待審核。</span>
          <Link className="btn btn--ghost btn--sm" href="/admin/users">
            前往使用者管理
          </Link>
        </p>
      )}
    </div>
  );
}

async function FormCards() {
  await requireUser();
  const settings = await listFormSettings();
  const now = new Date();

  return (
    <div className={styles.grid}>
      {settings.map((setting) => {
        const form = FORMS[setting.formId];
        const period = describePeriod(setting);
        return (
          <Link
            key={form.id}
            href={`/admin/forms/${form.id}`}
            className={styles.formCard}
          >
            <div
              className={styles.cardArt}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: artSvg(form.id) }}
            />
            <div className={styles.cardBody}>
              <h2>{form.name}</h2>
              <div className={styles.cardMeta}>
                <FormStatusBadge status={formStatus(setting, now)} />
                <span>{period ? `開放期間：${period}` : '未設定開放期間'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
