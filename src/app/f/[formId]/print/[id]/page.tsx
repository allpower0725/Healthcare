import '@/components/forms/print.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { PrintButton } from '@/components/forms/print-button';
import { getFormPrint } from '@/forms/print-registry';
import { isFormId } from '@/lib/forms/catalog';
import { deriveProfile } from '@/lib/forms/profile';
import { readDeviceToken } from '@/lib/submissions/device';
import { getDeviceSubmission } from '@/lib/submissions/service';
import styles from './print.module.css';

export const metadata: Metadata = {
  title: { absolute: '列印已送出的表單｜烏日澄清醫院 預防保健電子表單' },
  robots: { index: false, follow: false },
};
type Params = Promise<{ formId: string; id: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicPrintPage({ params }: { params: Params }) {
  return <Suspense fallback={<p role="status">載入列印內容中…</p>}><PrintView params={params} /></Suspense>;
}

async function PrintView({ params }: { params: Params }) {
  const { formId, id } = await params;
  if (!isFormId(formId) || !UUID.test(id)) notFound();
  // 憑證期限必須以這次請求的時間判斷，不參與預先渲染或部分預取。
  await connection();
  const token = await readDeviceToken();
  if (!token) notFound();
  const submission = await getDeviceSubmission(id, token);
  if (!submission || submission.formId !== formId || submission.status === 'returned') notFound();
  const Print = getFormPrint(formId);
  if (!Print) notFound();
  // 僅讀取伺服器已接收的民眾資料，院所欄位留白。
  const data = { ...submission.publicData, ...deriveProfile(submission.publicData) };
  return (
    <main className={styles.page}>
      <div className="ps-toolbar">
        <Link className="btn btn--ghost btn--sm" href={`/f/${formId}`}>← 回填寫完成畫面</Link>
        <PrintButton />
        <p>列印時紙張選 A4、邊界選「無」。手機可在列印選單中另存 PDF。</p>
      </div>
      <div className="ps-frame"><Print data={data} /></div>
    </main>
  );
}
