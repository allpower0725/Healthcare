'use client';

import { type ReactNode, useState } from 'react';
import { printDocument } from './print-document';

export function PrintDocumentButton({ href, className = 'btn btn--primary', children }: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function print() {
    setPending(true);
    setError(null);
    try {
      await printDocument(href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '列印沒有完成，請再試一次。');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className={className} disabled={pending} aria-busy={pending} onClick={() => void print()}>
        {pending ? '準備列印中…' : children}
      </button>
      {error && <span className="notice notice--error" role="alert" style={{ gridColumn: '1 / -1' }}>{error}</span>}
    </>
  );
}
