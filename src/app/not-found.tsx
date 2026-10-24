import type { Metadata } from 'next';
import styles from './(auth)/auth.module.css';

export const metadata: Metadata = { title: { absolute: '找不到頁面｜烏日澄清醫院' } };

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <main className={styles.card}>
        <img className={styles.logo} src="/brand/logo.svg" alt="烏日澄清醫院" width={182} height={34} />
        <h1 className={styles.title} style={{ marginTop: 24 }}>
          找不到這個頁面
        </h1>
        <p className={styles.sub} style={{ margin: 0 }}>
          網址可能有誤，或表單已不再提供。請重新掃描櫃台的 QR code，或洽櫃台醫護人員。
        </p>
        <p className={styles.foot}>烏日澄清醫院｜預防保健服務</p>
      </main>
    </div>
  );
}
