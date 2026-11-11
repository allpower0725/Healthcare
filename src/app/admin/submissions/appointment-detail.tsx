import '@/components/forms/forms.css';
import { notFound } from 'next/navigation';
import { PrintDocumentButton } from '@/components/forms/print-document-button';
import { APPOINTMENT_NAME, APPOINTMENT_PACKAGES } from '@/lib/appointments/catalog';
import { FormIllustration } from '@/components/brand/form-illustration';
import { APPOINTMENT_LIST_STATUS, getAppointment } from '@/lib/appointments/service';
import { requireUser } from '@/lib/auth/dal';
import { formatDateTime } from '@/lib/time';
import adminStyles from '../admin.module.css';
import { SubmissionStatusBadge } from '../ui';
import { AppointmentConfirm } from './appointment-confirm';
import { PublicSubmissionContent } from './public-submission-content';
import styles from './submissions.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS = {
  pending: '待院所確認',
  confirmed: '預約已成立',
  cancelled: '預約已取消',
};

export async function AppointmentDetail({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  await requireUser();
  const appointment = await getAppointment(id);
  if (!appointment) notFound();

  const { submission, status, confirmationBlock } = appointment;
  const fields = [
    ['預約日期', appointment.appointmentDate.replaceAll('-', '/')],
    ['健檢套餐', APPOINTMENT_PACKAGES[appointment.packageCode]],
    ['出生日期', appointment.birthDate.replaceAll('-', '/')],
    ['預約送出', formatDateTime(appointment.createdAt)],
  ];

  return (
    <>
      <header className={styles.head}>
        <div className={styles.headArt} aria-hidden="true">
          <FormIllustration formId="appointment" />
        </div>
        <div>
          <h1>
            {appointment.name}
            <SubmissionStatusBadge status={APPOINTMENT_LIST_STATUS[status]} label={STATUS_LABELS[status]} />
          </h1>
          <p className={styles.headMeta}>
            <b>{APPOINTMENT_NAME}</b>
            <span className={styles.mono}>{appointment.idNo}</span>
          </p>
        </div>
      </header>

      <div className={`ppf ${styles.formArea}`}>
        <section className={`${adminStyles.card} ${styles.appointmentCard}`} aria-labelledby="appointment-summary">
          <h2 id="appointment-summary">預約資料</h2>
          <dl className={styles.appointmentFields}>
            {fields.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          {status === 'pending' && (
            <p className={`notice ${confirmationBlock ? 'notice--warn' : 'notice--info'}`} role="status">
              {confirmationBlock === 'date_passed' ? '預約日期已過，無法確認。'
                : confirmationBlock === 'form_required' ? '此套餐須先送出勞工健康檢查表，院所才能確認預約。'
                : '請核對預約日期與套餐，按「確認預約」後預約即成立。'}
            </p>
          )}
          {status === 'confirmed' && (
            <p className="notice notice--info" role="status">
              {formatDateTime(appointment.confirmedAt)} 由 {appointment.confirmedByName ?? '院所人員'} 確認成立。
            </p>
          )}
          {status === 'cancelled' && (
            <p className="notice notice--warn" role="status">此預約已取消（{formatDateTime(appointment.cancelledAt)}）。</p>
          )}
        </section>

        {submission ? (
          <>
            <section className={`${adminStyles.card} ${styles.appointmentCard}`} aria-labelledby="appointment-intake">
              <h2 id="appointment-intake">勞工健康檢查表</h2>
              <p className={styles.appointmentIntakeStatus}>
                <SubmissionStatusBadge status={submission.status} />
                <span>民眾送出 {formatDateTime(submission.publicSubmittedAt)}</span>
              </p>
            </section>
            <PublicSubmissionContent formId="labor" values={submission.publicData} />
          </>
        ) : (
          <section className={`${adminStyles.card} ${styles.appointmentCard}`} aria-labelledby="appointment-intake">
            <h2 id="appointment-intake">勞工健康檢查表</h2>
            <p>尚未收到勞工健康檢查表。</p>
          </section>
        )}

        {status !== 'cancelled' && (submission || status === 'pending') && (
          <div className={styles.appointmentActions}>
            {submission && submission.status !== 'voided' && (
              <PrintDocumentButton className="btn btn--ghost" href={`/admin/submissions/${submission.id}/print`}>
                列印 / 另存原樣 PDF
              </PrintDocumentButton>
            )}
            {status === 'pending' && <AppointmentConfirm id={id} blocked={confirmationBlock !== null} />}
          </div>
        )}
      </div>
    </>
  );
}
