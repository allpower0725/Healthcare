import '@/components/forms/print.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { deriveProfile } from '@/lib/forms/profile';
import { getSubmission } from '@/lib/submissions/service';
import { getFormPrint } from '@/forms/print-registry';
import adminStyles from '../../../admin.module.css';
import { PrintButton } from '../../../forms/[formId]/poster/print-button';

export const metadata: Metadata = { title: '列印表單' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PrintPage({ params }: PageProps<'/admin/submissions/[id]/print'>) {
  return (
    <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
      <PrintView params={params} />
    </Suspense>
  );
}

async function PrintView({ params }: { params: PageProps<'/admin/submissions/[id]/print'>['params'] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireUser();

  const submission = await getSubmission(id);
  if (!submission) notFound();
  const Print = getFormPrint(submission.formId);
  if (!Print) notFound();

  const back = (
    <Link className="btn btn--ghost btn--sm" href={`/admin/submissions/${id}`}>
      ← 回這份表單
    </Link>
  );

  // 院所確認送出（鎖定）後才提供列印
  if (submission.status !== 'completed') {
    return (
      <>
        <div className="ps-toolbar">{back}</div>
        <p className="notice notice--warn">這份表單尚未確認送出，確認送出後才能列印。</p>
      </>
    );
  }

  // 資料在存入時已依條件清理（被隱藏的欄位為空），直接合併並加上紙本格式的衍生值
  const data = { ...submission.publicData, ...submission.staffData };
  Object.assign(data, deriveProfile(data));

  return (
    <>
      <div className="ps-toolbar">
        {back}
        <PrintButton />
        <p>列印時紙張選 A4、邊界選「無」。</p>
      </div>
      <div className="ps-frame">
        <Print data={data} />
      </div>
    </>
  );
}
