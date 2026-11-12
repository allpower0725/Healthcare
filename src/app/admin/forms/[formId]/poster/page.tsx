import { LoadingOverlay } from '@/app/admin/loading-overlay';
import type { Metadata } from 'next';
import { AdminBackLink } from '@/app/admin/pending-ui';
import { BackBar } from '@/components/navigation/back-control';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { APPOINTMENT_ADMIN_PATH, APPOINTMENT_COLOR, APPOINTMENT_NAME, APPOINTMENT_SLUG, APPOINTMENT_TINT } from '@/lib/appointments/catalog';
import { appointmentQrUrl, renderAppointmentQrSvg } from '@/lib/appointments/qr';
import { requireUser } from '@/lib/auth/dal';
import { FORMS, isFormId } from '@/lib/forms/catalog';
import { formUrl, renderFormQrSvg } from '@/lib/forms/qr';
import { describePeriod, getFormSetting } from '@/lib/forms/settings';
import styles from './poster.module.css';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: '列印海報' };

type Params = PageProps<'/admin/forms/[formId]/poster'>['params'];

export default function PosterPage({ params }: PageProps<'/admin/forms/[formId]/poster'>) {
  return (
    <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
      <Poster params={params} />
    </Suspense>
  );
}

async function Poster({ params }: { params: Params }) {
  const { formId } = await params;
  const isAppointment = formId === APPOINTMENT_SLUG;
  if (!isAppointment && !isFormId(formId)) notFound();
  await requireUser();

  const form = isAppointment
    ? { name: APPOINTMENT_NAME, officialTitle: '勞工健康檢查線上預約', color: APPOINTMENT_COLOR, tint: APPOINTMENT_TINT }
    : FORMS[formId];
  const period = isAppointment ? null : describePeriod(await getFormSetting(formId));
  const url = isAppointment ? appointmentQrUrl() : formUrl(formId);
  const qrSvg = isAppointment ? renderAppointmentQrSvg(url) : renderFormQrSvg(formId, url);

  return (
    <>
      <BackBar className={styles.toolbar}>
        <AdminBackLink href={isAppointment ? APPOINTMENT_ADMIN_PATH : `/admin/forms/${formId}`}>返回表單設定</AdminBackLink>
        <PrintButton />
        <p>列印時紙張選 A4、邊界選「無」，並勾選「背景圖形」。</p>
      </BackBar>

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
            <p className={styles.eyebrow}>手機掃描・{isAppointment ? '線上預約' : '線上填寫'}</p>
            <h1 className={styles.title}>{form.name}</h1>
            <p className={styles.official}>{form.officialTitle}</p>

            <div className={styles.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} />

            <ol className={styles.steps}>
              <li>手機相機掃描 QR code</li>
              <li>{isAppointment ? '選擇預約日期與健檢套餐' : '填寫基本資料並簽名'}</li>
              <li>{isAppointment ? '送出預約，等候院所確認' : '送出後出示畫面給櫃台'}</li>
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
