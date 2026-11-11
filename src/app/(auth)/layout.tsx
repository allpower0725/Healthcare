import type { Metadata } from 'next';
import { ADMIN_APP_METADATA } from '@/lib/admin-app';
import styles from './auth.module.css';

export const metadata: Metadata = ADMIN_APP_METADATA;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.scene}>
        <header className={styles.masthead}>
          <img className={styles.logo} src="/brand/logo.svg" alt="烏日澄清醫院" width={182} height={34} />
          <span>預防保健服務</span>
        </header>
        <div className={styles.content}>
          <aside className={styles.welcome}>
            <p className={styles.welcomeLabel}>預防保健工作區</p>
            <h2>讓照護更從容，<br />讓健康更靠近。</h2>
            <p>烏日澄清醫院<br />預防保健表單後台</p>
            <img src="/brand/care-document.svg" alt="" width={360} height={300} />
          </aside>
          <main className={styles.card}>
            {children}
            <p className={styles.foot}>烏日澄清醫院｜預防保健服務</p>
          </main>
        </div>
      </div>
    </div>
  );
}
