import { LoadingOverlay } from '@/app/admin/loading-overlay';
import type { Metadata } from 'next';
import { AdminLink as Link } from '@/app/admin/pending-ui';
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
import { FillingQrCard } from '../filling-qr-card';
import styles from '../forms.module.css';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: '表單設定' };

export default function FormDetailPage({ params }: PageProps<'/admin/forms/[formId]'>) {
  return (
    <>
      <Link className={`btn btn--ghost btn--sm ${styles.back}`} href="/admin/forms">
        ← 表單管理
      </Link>
      <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
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
        <FillingQrCard
          url={url}
          svg={renderFormQrSvg(formId, url, { size: 1024 })}
          formName={form.name}
          posterHref={`/admin/forms/${formId}/poster`}
        />

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
