import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { artSvg } from '@/lib/forms/art';
import { FORM_IDS, FORMS, type FormId, isFormId } from '@/lib/forms/catalog';
import { formStatus, getFormSetting } from '@/lib/forms/settings';
import { formatDateTime } from '@/lib/time';
import styles from './public.module.css';

type Props = PageProps<'/f/[formId]'>;

// 6 張表單的頁面可預先產生，開放狀態在請求時才讀取
export function generateStaticParams() {
  return FORM_IDS.map((formId) => ({ formId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formId } = await params;
  const site = '烏日澄清醫院 預防保健電子表單';
  return { title: { absolute: isFormId(formId) ? `${FORMS[formId].name}｜${site}` : site } };
}

export default function PublicFormPage({ params }: Props) {
  return (
    <div className={styles.page}>
      <header className={styles.appbar}>
        <div className={styles.appbarInner}>
          <img src="/brand/logo.svg" alt="烏日澄清醫院" width={160} height={30} />
        </div>
      </header>

      <main className={styles.main}>
        <Suspense fallback={<div className={styles.skeleton} style={{ marginTop: 24 }} aria-label="載入中" />}>
          <FormIntro params={params} />
        </Suspense>
      </main>

      <footer className={styles.foot}>烏日澄清醫院｜預防保健服務</footer>
    </div>
  );
}

async function FormIntro({ params }: { params: Props['params'] }) {
  const { formId } = await params;
  if (!isFormId(formId)) notFound();
  const form = FORMS[formId];

  return (
    <>
      <section className={styles.intro}>
        <span
          className={styles.art}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: artSvg(formId, 'width="168" height="168"') }}
        />
        <p className={styles.eyebrow}>預防保健服務</p>
        <h1 className={styles.title}>{form.name}</h1>
        <p className={styles.sub}>{form.officialTitle}</p>
      </section>

      <Suspense fallback={<div className={styles.skeleton} aria-label="載入中" />}>
        <FormAvailability formId={formId} />
      </Suspense>
    </>
  );
}

async function FormAvailability({ formId }: { formId: FormId }) {
  const setting = await getFormSetting(formId);
  const status = formStatus(setting);

  if (status === 'open') {
    // 第 5 項會在這裡換成民眾填寫的表單
    return (
      <section className={styles.card}>
        <div className={`${styles.icon} ${styles.iconOpen}`} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
        <h2>開放填寫中</h2>
        <p>電子表單建置中，請洽櫃台醫護人員協助填寫。</p>
      </section>
    );
  }

  const message =
    status === 'scheduled'
      ? `將於 ${formatDateTime(setting.opensAt)} 開放填寫。`
      : status === 'ended'
        ? `已於 ${formatDateTime(setting.closesAt)} 截止填寫。`
        : '此表單目前未開放填寫。';

  return (
    <section className={styles.card}>
      <div className={`${styles.icon} ${styles.iconClosed}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2>目前未開放填寫</h2>
      <p>{message}如需協助，請洽櫃台醫護人員。</p>
    </section>
  );
}
