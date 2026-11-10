import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './notice-pages.module.css';

export const metadata: Metadata = {
  title: {
    default: '預約健檢通知｜烏日澄清醫院',
    template: '%s｜預約健檢通知｜烏日澄清醫院',
  },
};

export default function AppointmentNoticeLayout({ children }: { children: ReactNode }) {
  // 院方核准並補齊聯絡與資料保留資訊後，才開放這些頁面。
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/appointment-notices">烏日澄清醫院</Link>
        <nav className={styles.links} aria-label="預約健檢通知頁面">
          <Link href="/appointment-notices">首頁</Link>
          <Link href="/appointment-notices/privacy">隱私權政策</Link>
          <Link href="/appointment-notices/terms">服務條款</Link>
        </nav>
      </header>
      <main className={styles.content}>
        <p className={styles.draft}>院方審閱草稿</p>
        {children}
      </main>
    </div>
  );
}
