import type { Metadata } from 'next';
import { Suspense } from 'react';
import { APPOINTMENT_ADMIN_PATH, APPOINTMENT_ICON_PATH, APPOINTMENT_NAME } from '@/lib/appointments/catalog';
import { appointmentMailConfigured } from '@/lib/appointments/gmail';
import { readAppointmentNoticeSummary } from '@/lib/appointments/notifications';
import { appointmentQrUrl, renderAppointmentQrSvg } from '@/lib/appointments/qr';
import { getAppointmentSetting } from '@/lib/appointments/settings';
import { requireUser } from '@/lib/auth/dal';
import { formatDateTime } from '@/lib/time';
import { getUserName } from '@/lib/users/service';
import adminStyles from '../../admin.module.css';
import { LoadingOverlay } from '../../loading-overlay';
import { AdminLink } from '../../pending-ui';
import { FormStatusBadge } from '../../ui';
import { FillingQrCard } from '../filling-qr-card';
import styles from '../forms.module.css';
import { AppointmentSettingsForm } from './settings-form';

export const metadata: Metadata = { title: '預約健檢設定' };

export default function AppointmentSettingsPage() {
  return (
    <>
      <AdminLink className={`btn btn--ghost btn--sm ${styles.back}`} href="/admin/forms">
        ← 表單管理
      </AdminLink>
      <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
        <AppointmentSettings />
      </Suspense>
    </>
  );
}

async function AppointmentSettings() {
  const user = await requireUser();
  const setting = await getAppointmentSetting();
  const isManager = user.role !== 'staff';
  const editorName = setting.updatedBy ? await getUserName(setting.updatedBy) : null;
  const qrUrl = appointmentQrUrl();

  return (
    <>
      <header className={styles.head}>
        <div className={styles.headArt} aria-hidden="true">
          <img src={APPOINTMENT_ICON_PATH} alt="" width={72} height={72} />
        </div>
        <div>
          <h1>
            {APPOINTMENT_NAME}
            <FormStatusBadge status={setting.isOpen ? 'open' : 'closed'} />
          </h1>
          <p>預約開放與院所通知設定</p>
        </div>
      </header>
      <div className={styles.detailGrid}>
        <FillingQrCard
          url={qrUrl}
          svg={renderAppointmentQrSvg(qrUrl, { size: 1024 })}
          formName={APPOINTMENT_NAME}
          posterHref={`${APPOINTMENT_ADMIN_PATH}/poster`}
        >
          <p className={styles.hint}>請在預約前台上線後再對外提供這個 QR code。</p>
        </FillingQrCard>
        <div className={styles.detailStack}>
          <section className={adminStyles.card} aria-labelledby="appointment-settings-title">
            <h2 className={styles.cardTitle} id="appointment-settings-title">開放與收件人設定</h2>
            {isManager ? (
              <AppointmentSettingsForm isOpen={setting.isOpen} recipients={setting.recipients} />
            ) : (
              <>
                <dl className={styles.summary}>
                  <dt>開放開關</dt>
                  <dd>{setting.isOpen ? '開啟' : '關閉'}</dd>
                </dl>
                <p className={styles.hint}>只有管理者可以修改預約開放與通知設定。</p>
              </>
            )}
            {editorName && <p className={styles.updated}>最後修改 {editorName}・{formatDateTime(setting.updatedAt)}</p>}
          </section>
          {isManager && <AppointmentNoticeStatus recipients={setting.recipients} />}
        </div>
      </div>
    </>
  );
}

async function AppointmentNoticeStatus({ recipients }: { recipients: string[] }) {
  const notice = await readAppointmentNoticeSummary(recipients);
  return (
    <section className={adminStyles.card} aria-labelledby="appointment-notices-title">
      <h2 className={styles.cardTitle} id="appointment-notices-title">Gmail 通知紀錄</h2>
      {!appointmentMailConfigured() && <p className="notice notice--warn">Gmail 寄件設定尚未完成。</p>}
      <dl className={styles.summary}>
        <dt>收件人</dt>
        <dd>{recipients.length > 0 ? `${recipients.length} 個信箱` : '尚未設定'}</dd>
        <dt>最近嘗試</dt>
        <dd>{formatDateTime(notice.latestAttemptAt)}</dd>
        <dt>最近成功</dt>
        <dd>{formatDateTime(notice.latestSentAt)}</dd>
        <dt>待重試</dt>
        <dd>{notice.failed} 筆</dd>
        <dt>待核對</dt>
        <dd>{notice.uncertain} 筆</dd>
      </dl>
      {notice.uncertain > 0 && <p className={styles.hint}>請從寄件帳號的寄件備份確認寄送結果。</p>}
    </section>
  );
}
