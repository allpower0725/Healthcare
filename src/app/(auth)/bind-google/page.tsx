import type { Metadata } from 'next';
import { Suspense } from 'react';
import { logout } from '@/lib/auth/actions';
import { requireBindSession } from '@/lib/auth/dal';
import styles from '../auth.module.css';
import { GoogleIcon } from '../google-icon';
import { Notice, type NoticeMessages } from '../notice';

export const metadata: Metadata = { title: '綁定 Google 帳號' };

const ERRORS: NoticeMessages = {
  in_use: { tone: 'error', text: '這個 Google 帳號已經是其他人員的帳號，請改選另一個 Google 帳號。' },
  not_allowed: { tone: 'error', text: '綁定沒有完成，請重新以帳密登入。' },
  google_failed: { tone: 'error', text: 'Google 授權沒有完成，請再試一次。' },
  cancelled: { tone: 'warn', text: '已取消，請再選一次要綁定的 Google 帳號。' },
};

export default function BindGooglePage({ searchParams }: PageProps<'/bind-google'>) {
  return (
    <>
      <p className={styles.eyebrow}>最高管理者首次設定</p>
      <h1 className={styles.title}>綁定 Google 帳號</h1>
      <p className={styles.sub}>
        帳密驗證成功。請選擇要綁定的 Google 帳號，之後最高管理者一律用這個帳號登入，帳密登入將停用。
      </p>
      <Suspense fallback={<div className={styles.skeleton} />}>
        <BindActions searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BindActions({ searchParams }: { searchParams: PageProps<'/bind-google'>['searchParams'] }) {
  const session = await requireBindSession();
  const minutesLeft = Math.max(1, Math.ceil((session.expiresAt.getTime() - Date.now()) / 60_000));

  return (
    <div className={styles.stack}>
      <Notice searchParams={searchParams} param="error" messages={ERRORS} />
      <a className={styles.google} href="/api/auth/google">
        <GoogleIcon />
        選擇要綁定的 Google 帳號
      </a>
      <p className={styles.hint}>請在 {minutesLeft} 分鐘內完成，逾時須重新以帳密登入。</p>
      <form action={logout}>
        <button type="submit" className="btn btn--ghost btn--block">
          取消並登出
        </button>
      </form>
    </div>
  );
}
