import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../auth.module.css';
import { GoogleIcon } from '../google-icon';
import { Notice, type NoticeMessages } from '../notice';
import { PasswordForm } from './password-form';

export const metadata: Metadata = { title: '登入' };

const NOTICES: NoticeMessages = {
  applied: { tone: 'info', text: '已送出使用申請。管理者核准後，用同一個 Google 帳號登入即可使用。' },
  pending: { tone: 'warn', text: '你的申請還在等待管理者審核，核准後即可登入。' },
  rejected: { tone: 'error', text: '你的申請未通過審核，如有疑問請洽管理者。' },
  disabled: { tone: 'error', text: '這個帳號已停用，如有疑問請洽管理者。' },
  signed_out: { tone: 'info', text: '已登出。' },
  cancelled: { tone: 'warn', text: '已取消 Google 登入。' },
  google_failed: { tone: 'error', text: 'Google 登入沒有完成，請再試一次。' },
  google_not_configured: {
    tone: 'error',
    text: '尚未設定 Google 登入（.env 的 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET）。',
  },
};

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <p className={styles.eyebrow}>預防保健表單後台</p>
      <h1 className={styles.title}>院所人員登入</h1>
      <p className={styles.sub}>請使用 Google 帳號登入。</p>

      <div className={styles.stack}>
        <Suspense fallback={null}>
          <Notice searchParams={searchParams} param="notice" messages={NOTICES} />
        </Suspense>

        <a className={styles.google} href="/api/auth/google">
          <GoogleIcon />
          使用 Google 登入
        </a>
        <p className={styles.hint}>第一次使用時，用 Google 登入即送出申請；管理者核准後就能使用後台。</p>

        <div className={styles.divider} />

        <details className={styles.admin}>
          <summary>最高管理者首次設定</summary>
          <PasswordForm />
        </details>
      </div>
    </>
  );
}
