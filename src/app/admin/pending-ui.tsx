'use client';

import NextLink, { useLinkStatus } from 'next/link';
import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { LoadingOverlay } from './loading-overlay';

function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <LoadingOverlay message="載入中，請稍候…" /> : null;
}

export function AdminLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props}>{children}<LinkPending /></NextLink>;
}

export function FormPending() {
  const { pending } = useFormStatus();
  return pending ? <LoadingOverlay /> : null;
}
