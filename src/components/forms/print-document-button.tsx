'use client';

import { type ReactNode, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { printDocument } from './print-document';

export function PrintDocumentButton({ href, className = 'btn btn--primary', children }: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const printing = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function print() {
    if (printing.current) return;
    printing.current = true;
    setPending(true);
    setPreparing(true);
    setError(null);
    try {
      await printDocument(href, () => flushSync(() => setPreparing(false)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '列印沒有完成，請再試一次。');
    } finally {
      printing.current = false;
      setPreparing(false);
      setPending(false);
    }
  }

  return (
    <>
      {preparing && <LoadingOverlay message="準備列印中，請稍候…" />}
      <button type="button" className={className} disabled={pending} aria-busy={pending} onClick={() => void print()}>
        {pending ? '準備列印中…' : children}
      </button>
      {error && <span className="notice notice--error" role="alert" style={{ gridColumn: '1 / -1' }}>{error}</span>}
    </>
  );
}
