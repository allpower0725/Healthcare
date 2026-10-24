import '@/components/forms/forms.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { artSvg } from '@/lib/forms/art';
import { FORM_IDS, FORMS, type FormId, isFormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { describePeriod, formStatus, getFormSetting } from '@/lib/forms/settings';
import { readDeviceToken } from '@/lib/submissions/device';
import { findDeviceSubmissions } from '@/lib/submissions/service';
import { formatDateTime } from '@/lib/time';
import { ClosedCard, PublicChrome } from './chrome';
import { FormApp } from './form-app';

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
    <Suspense
      fallback={
        <PublicChrome>
          <section className="card" aria-busy="true">
            <p className="field__hint" style={{ margin: 0 }}>
              載入中…
            </p>
          </section>
        </PublicChrome>
      }
    >
      <FormEntry params={params} />
    </Suspense>
  );
}

function Intro({ formId }: { formId: FormId }) {
  const form = FORMS[formId];
  return (
    <section className="intro">
      <span
        className="intro__art"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: artSvg(formId, 'width="240" height="240"') }}
      />
      <p className="intro__eyebrow">預防保健服務</p>
      <h1 className="intro__title">{form.name}</h1>
      <p className="intro__sub">{form.officialTitle}</p>
      <ul className="intro__meta">
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          約 {form.minutes} 分鐘
        </li>
        <li>未標示「選填」皆為必填</li>
        <li>共 {form.steps} 個步驟</li>
      </ul>
    </section>
  );
}

async function FormEntry({ params }: { params: Props['params'] }) {
  const { formId } = await params;
  if (!isFormId(formId)) notFound();

  const setting = await getFormSetting(formId);
  const status = formStatus(setting);
  const closedMessage =
    status === 'scheduled'
      ? `將於 ${formatDateTime(setting.opensAt)} 開放填寫。`
      : status === 'ended'
        ? `已於 ${formatDateTime(setting.closesAt)} 截止填寫。`
        : '此表單目前未開放填寫。';
  const period = describePeriod(setting);

  if (getFormDef(formId)) {
    // 表單關閉後，12 小時內送出過的裝置仍可回來查看、退回修改
    const token = await readDeviceToken();
    const sentFromDevice = token ? (await findDeviceSubmissions(formId, token)).length > 0 : false;
    if (status === 'open' || sentFromDevice) {
      return (
        <FormApp
          formId={formId}
          acceptingNew={status === 'open'}
          closedMessage={closedMessage}
          closedPeriod={period}
          intro={<Intro formId={formId} />}
        />
      );
    }
  }

  return (
    <PublicChrome>
      <Intro formId={formId} />
      {status === 'open' ? (
        <section className="card closed">
          <h2>電子表單建置中</h2>
          <p>請洽櫃台醫護人員協助填寫。</p>
        </section>
      ) : (
        <ClosedCard message={closedMessage} period={period} />
      )}
    </PublicChrome>
  );
}
