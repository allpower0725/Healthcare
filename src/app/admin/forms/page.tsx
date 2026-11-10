import { LoadingOverlay } from '@/app/admin/loading-overlay';
import type { Metadata } from 'next';
import { AdminLink as Link } from '@/app/admin/pending-ui';
import { Suspense } from 'react';
import { APPOINTMENT_ADMIN_PATH, APPOINTMENT_ICON_PATH, APPOINTMENT_NAME } from '@/lib/appointments/catalog';
import { getAppointmentSetting } from '@/lib/appointments/settings';
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
        <p>可管理各表單的開放時間、填寫 QR code 與海報，以及預約健檢的開放開關與通知收件人。</p>
      </div>
      <Suspense fallback={null}>
        <Reminders />
      </Suspense>
      <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
        <FormCards />
      </Suspense>
    </>
  );
}

/** 後台首頁的待辦提醒：待院所確認的表單、待審核的使用申請（管理者才看得到） */
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
          <span>有 {counts.submitted} 筆案件等待院所確認。</span>
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
  const [settings, appointmentSetting] = await Promise.all([listFormSettings(), getAppointmentSetting()]);
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
      <Link href={APPOINTMENT_ADMIN_PATH} className={styles.formCard}>
        <div className={styles.cardArt} aria-hidden="true">
          <img src={APPOINTMENT_ICON_PATH} alt="" width={112} height={112} />
        </div>
        <div className={styles.cardBody}>
          <h2>{APPOINTMENT_NAME}</h2>
          <div className={styles.cardMeta}>
            <FormStatusBadge status={appointmentSetting.isOpen ? 'open' : 'closed'} />
            <span>預約開放與通知設定</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
