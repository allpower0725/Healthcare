import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { artSvg } from '@/lib/forms/art';
import { FORMS } from '@/lib/forms/catalog';
import { describePeriod, formStatus, listFormSettings } from '@/lib/forms/settings';
import adminStyles from '../admin.module.css';
import { FormStatusBadge } from '../ui';
import styles from './forms.module.css';

export const metadata: Metadata = { title: '表單管理' };

export default function FormsPage() {
  return (
    <>
      <div className={adminStyles.pageHead}>
        <h1>表單管理</h1>
        <p>每張表單有固定的填寫 QR code。點選表單可設定開放時間、下載 QR code 與列印海報。</p>
      </div>
      <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
        <FormCards />
      </Suspense>
    </>
  );
}

async function FormCards() {
  await requireUser();
  const settings = await listFormSettings();
  const now = new Date();

  return (
    <div className={styles.grid}>
      {settings.map((setting) => {
        const form = FORMS[setting.formId];
        const period = describePeriod(setting);
        return (
          <Link
            key={form.id}
            href={`/admin/forms/${form.id}`}
            className={styles.formCard}
            style={{ '--form-tint': form.tint } as React.CSSProperties}
          >
            <div
              className={styles.cardArt}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: artSvg(form.id) }}
            />
            <div className={styles.cardBody}>
              <h2>{form.name}</h2>
              <div className={styles.cardMeta}>
                <FormStatusBadge status={formStatus(setting, now)} />
                <span>{period ? `開放期間：${period}` : '未設定開放期間'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
