import type { ReactNode } from 'react';
import adminStyles from '../admin.module.css';
import { QrTools } from './[formId]/qr-tools';
import styles from './forms.module.css';

type Props = {
  url: string;
  svg: string;
  formName: string;
  posterHref: string;
  children?: ReactNode;
};

export function FillingQrCard({ url, svg, formName, posterHref, children }: Props) {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/.test(url);

  return (
    <section className={adminStyles.card} aria-labelledby="qr-title">
      <h2 className={styles.cardTitle} id="qr-title">填寫 QR code</h2>
      <div className={styles.qrBox} dangerouslySetInnerHTML={{ __html: svg }} />
      <QrTools url={url} svg={svg} fileName={`${formName}-填寫QR`} posterHref={posterHref} />
      {children}
      {isLocal && (
        <p className="notice notice--warn" style={{ marginTop: 14 }}>
          目前的網址是本機開發用（localhost），手機掃描後打不開。正式列印前，請先部署並把 APP_URL 設為正式網域。
        </p>
      )}
    </section>
  );
}
