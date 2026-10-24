import type { UserRole } from '@/db/schema';
import styles from './admin.module.css';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: '最高管理者',
  admin: '管理者',
  staff: '一般人員',
};

const dateTime = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(value: Date | null) {
  return value ? dateTime.format(value) : '—';
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
