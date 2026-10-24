import type { UserRole } from '@/db/schema';
import type { FormStatus } from '@/lib/forms/settings';
import styles from './admin.module.css';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: '最高管理者',
  admin: '管理者',
  staff: '一般人員',
};

const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  closed: '關閉',
  scheduled: '尚未開始',
  open: '開放中',
  ended: '已結束',
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return <span className={`badge badge--${status}`}>{FORM_STATUS_LABELS[status]}</span>;
}

export function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // Google 頭像帶 referrer 時有機率被拒，所以不送 referrer
    return <img className={styles.avatar} src={src} alt="" width={36} height={36} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={styles.avatar} aria-hidden="true">
      {Array.from(name)[0] ?? '?'}
    </span>
  );
}
