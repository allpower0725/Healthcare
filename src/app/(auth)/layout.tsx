import type { Metadata } from 'next';
import { ADMIN_APP_METADATA } from '@/lib/admin-app';
import styles from './auth.module.css';

export const metadata: Metadata = ADMIN_APP_METADATA;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <main className={styles.card}>
        <img className={styles.logo} src="/brand/logo.svg" alt="烏日澄清醫院" width={182} height={34} />
        {children}
        <p className={styles.foot}>烏日澄清醫院｜預防保健服務</p>
      </main>
    </div>
  );
}
