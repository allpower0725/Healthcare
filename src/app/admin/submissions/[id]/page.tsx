import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminBackLink } from '@/app/admin/pending-ui';
import { BackBar } from '@/components/navigation/back-control';
import { LoadingOverlay } from '@/app/admin/loading-overlay';
import { SubmissionDetail } from '../submission-detail';

export const metadata: Metadata = { title: '協同完成' };

export default function SubmissionPage({ params }: PageProps<'/admin/submissions/[id]'>) {
  return (
    <>
      <BackBar><AdminBackLink href="/admin/submissions">返回協同完成</AdminBackLink></BackBar>
      <Suspense fallback={<LoadingOverlay message="載入表單中…" />}>
        <SubmissionDetail params={params} />
      </Suspense>
    </>
  );
}
