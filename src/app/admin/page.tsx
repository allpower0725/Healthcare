import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { countPendingUsers } from '@/lib/users/service';
import styles from './admin.module.css';
import { ROLE_LABELS } from './ui';

export const metadata: Metadata = { title: '首頁' };

export default function AdminHome() {
  return (
    <Suspense fallback={<div className={styles.skeleton} aria-label="載入中" />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await requireUser();
  const pending = user.role === 'staff' ? 0 : await countPendingUsers();

  return (
    <>
      <div className={styles.pageHead}>
        <h1>歡迎，{user.name}</h1>
        <p>你目前的身分是「{ROLE_LABELS[user.role]}」。</p>
      </div>

      {pending > 0 && (
        <div className="notice notice--warn" role="status">
          有 {pending} 位人員的使用申請等待審核。<Link href="/admin/users">前往使用者管理</Link>
        </div>
      )}
    </>
  );
}
