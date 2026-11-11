'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { type ResultMessage, useResultModal } from './result-modal';

export function UrlResultModal({ param, title, message, tone }: {
  param: string; title: string; message: string; tone: ResultMessage['tone'];
}) {
  const showResult = useResultModal();
  const router = useRouter();
  const shown = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify([param, title, message, tone]);
    if (shown.current === key) return;
    shown.current = key;
    showResult({ title, message, tone, onClose: () => {
      const url = new URL(window.location.href);
      url.searchParams.delete(param);
      router.replace(url.pathname + url.search + url.hash, { scroll: false });
    } });
  }, [param, title, message, tone, router, showResult]);
  return null;
}
