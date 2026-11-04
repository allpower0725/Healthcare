import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLink as Link } from '@/app/admin/pending-ui';
import { LoadingOverlay } from '@/app/admin/loading-overlay';
import { SubmissionDetail } from '../submission-detail';

export const metadata: Metadata = { title: '協同完成' };

export default function SubmissionPage({ params }: PageProps<'/admin/submissions/[id]'>) {
  return (
    <>
      <Link className="btn btn--ghost btn--sm" href="/admin/submissions">← 協同完成</Link>
      <Suspense fallback={<LoadingOverlay message="載入表單中…" />}>
        <SubmissionDetail params={params} />
      </Suspense>
    </>
  );
}
