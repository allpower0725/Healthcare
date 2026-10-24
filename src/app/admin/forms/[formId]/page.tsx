import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { artSvg } from '@/lib/forms/art';
import { FORMS, isFormId } from '@/lib/forms/catalog';
import { formUrl, renderFormQrSvg } from '@/lib/forms/qr';
import { describePeriod, formStatus, getFormSetting } from '@/lib/forms/settings';
import { formatDateTime, toTaipeiInput } from '@/lib/time';
import { getUserName } from '@/lib/users/service';
import adminStyles from '../../admin.module.css';
import { FormStatusBadge } from '../../ui';
import styles from '../forms.module.css';
import { QrTools } from './qr-tools';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: '表單設定' };

export default function FormDetailPage({ params }: PageProps<'/admin/forms/[formId]'>) {
  return (
    <>
      <Link className={`btn btn--ghost btn--sm ${styles.back}`} href="/admin/forms">
        ← 表單管理
      </Link>
      <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
        <FormDetail params={params} />
      </Suspense>
    </>
  );
}

async function FormDetail({ params }: { params: PageProps<'/admin/forms/[formId]'>['params'] }) {
  const { formId } = await params;
  if (!isFormId(formId)) notFound();

  const user = await requireUser();
  const form = FORMS[formId];
  const setting = await getFormSetting(formId);
  const editorName = setting.updatedBy ? await getUserName(setting.updatedBy) : null;
  const url = formUrl(formId);
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url);
  const period = describePeriod(setting);

  return (
    <>
      <header className={styles.head}>
        <div className={styles.headArt} aria-hidden="true" dangerouslySetInnerHTML={{ __html: artSvg(formId) }} />
        <div>
          <h1>
            {form.name}
            <FormStatusBadge status={formStatus(setting)} />
          </h1>
          <p>{form.officialTitle}</p>
        </div>
      </header>

      <div className={styles.detailGrid}>
        <section className={adminStyles.card} aria-labelledby="qr-title">
          <h2 className={styles.cardTitle} id="qr-title">
            填寫 QR code
          </h2>
          <div className={styles.qrBox} dangerouslySetInnerHTML={{ __html: renderFormQrSvg(formId, url) }} />
          <QrTools
            url={url}
            svg={renderFormQrSvg(formId, url, { size: 1024 })}
            fileName={`${form.name}-填寫QR`}
            posterHref={`/admin/forms/${formId}/poster`}
          />
          {isLocal && (
            <p className="notice notice--warn" style={{ marginTop: 14 }}>
              目前的網址是本機開發用（localhost），手機掃描後打不開。正式列印前，請先部署並把 APP_URL 設為正式網域。
            </p>
          )}
        </section>

        <section className={adminStyles.card} aria-labelledby="settings-title">
          <h2 className={styles.cardTitle} id="settings-title">
            開放設定
          </h2>
          {user.role === 'staff' ? (
            <>
              <dl className={styles.summary}>
                <dt>開放開關</dt>
                <dd>{setting.isOpen ? '開啟' : '關閉'}</dd>
                <dt>開放期間</dt>
                <dd>{period ?? '不限'}</dd>
              </dl>
              <p className={styles.hint}>只有管理者可以修改開放設定。</p>
            </>
          ) : (
            <SettingsForm
              formId={formId}
              isOpen={setting.isOpen}
              opensAt={toTaipeiInput(setting.opensAt)}
              closesAt={toTaipeiInput(setting.closesAt)}
            />
          )}
          {editorName && (
            <p className={styles.updated}>
              最後修改：{editorName}・{formatDateTime(setting.updatedAt)}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
