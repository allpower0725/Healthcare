import { LoadingOverlay } from '@/app/admin/loading-overlay';
import '@/components/forms/print.css';
import type { Metadata } from 'next';
import { AdminLink as Link } from '@/app/admin/pending-ui';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/dal';
import { deriveProfile } from '@/lib/forms/profile';
import { getSubmission } from '@/lib/submissions/service';
import { getFormPrint } from '@/forms/print-registry';
import { PrintButton } from '../../../forms/[formId]/poster/print-button';

export const metadata: Metadata = { title: '列印表單' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PrintPage({ params }: PageProps<'/admin/submissions/[id]/print'>) {
  return (
    <Suspense fallback={<LoadingOverlay message="載入中，請稍候…" />}>
      <PrintView params={params} />
    </Suspense>
  );
}

async function PrintView({ params }: { params: PageProps<'/admin/submissions/[id]/print'>['params'] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireUser();

  const submission = await getSubmission(id);
  if (!submission || (submission.appointmentId && (submission.appointmentStatus === 'cancelled' || submission.status === 'voided'))) notFound();
  const Print = getFormPrint(submission.formId);
  if (!Print) notFound();

  const back = (
    <Link className="btn btn--ghost btn--sm" href={submission.appointmentId ? '/admin/submissions' : `/admin/submissions/${id}`}>
      {submission.appointmentId ? '← 回協同完成' : '← 回這份表單'}
    </Link>
  );

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
