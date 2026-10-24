import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { FORMS, isFormId } from '@/lib/forms/catalog';
import { formUrl, renderFormQrSvg } from '@/lib/forms/qr';
import { describePeriod, getFormSetting } from '@/lib/forms/settings';
import adminStyles from '../../../admin.module.css';
import styles from './poster.module.css';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: '列印海報' };

type Params = PageProps<'/admin/forms/[formId]/poster'>['params'];

export default function PosterPage({ params }: PageProps<'/admin/forms/[formId]/poster'>) {
  return (
    <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
      <Poster params={params} />
    </Suspense>
  );
}

async function Poster({ params }: { params: Params }) {
  const { formId } = await params;
  if (!isFormId(formId)) notFound();
  await requireUser();

  const form = FORMS[formId];
  const setting = await getFormSetting(formId);
  const period = describePeriod(setting);
  const url = formUrl(formId);

  return (
    <>
      <div className={styles.toolbar}>
        <Link className="btn btn--ghost btn--sm" href={`/admin/forms/${formId}`}>
          ← 回表單設定
        </Link>
        <PrintButton />
        <p>列印時紙張選 A4、邊界選「無」，並勾選「背景圖形」。</p>
      </div>

      <div className={styles.frame}>
        <article
          className={styles.poster}
          style={{ '--form-color': form.color, '--form-tint': form.tint } as React.CSSProperties}
        >
          <header className={styles.top}>
            <img src="/brand/logo.svg" alt="烏日澄清醫院" width={240} height={45} />
            <span>預防保健服務</span>
          </header>

          <div className={styles.body}>
            <p className={styles.eyebrow}>手機掃描・線上填寫</p>
            <h1 className={styles.title}>{form.name}</h1>
            <p className={styles.official}>{form.officialTitle}</p>

            <div className={styles.qr} dangerouslySetInnerHTML={{ __html: renderFormQrSvg(formId, url) }} />

            <ol className={styles.steps}>
              <li>手機相機掃描 QR code</li>
              <li>填寫基本資料並簽名</li>
              <li>送出後出示畫面給櫃台</li>
            </ol>

            {period && <p className={styles.period}>開放填寫：{period}</p>}
            <p className={styles.url}>無法掃描時，請輸入網址：{url}</p>
          </div>

          <footer className={styles.foot}>烏日澄清醫院｜預防保健服務</footer>
        </article>
      </div>
    </>
  );
}
