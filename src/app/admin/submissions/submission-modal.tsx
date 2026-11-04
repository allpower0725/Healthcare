'use client';

import { useRouter } from 'next/navigation';
import { createContext, type MutableRefObject, type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { LoadingOverlay } from '../loading-overlay';
import styles from './submissions.module.css';

/** 編輯器登記離開前的儲存程序；失敗時保留 modal 和輸入內容。 */
export const BeforeLeaveContext = createContext<MutableRefObject<(() => Promise<boolean>) | null> | null>(null);

export function SubmissionModal({ children, returnHref }: { children: ReactNode; returnHref: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const beforeLeave = useRef<(() => Promise<boolean>) | null>(null);
  const closingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const el = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    el.showModal();
    return () => {
      el.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    setSaving(true);
    try {
      if (beforeLeave.current && !(await beforeLeave.current())) return;
      startTransition(() => router.replace(returnHref, { scroll: false }));
    } finally {
      closingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className={styles.modal} aria-label="協同完成表單" onCancel={(e) => { e.preventDefault(); void close(); }}>
      <div className={styles.modalBar}>
        <button type="button" className="btn btn--ghost btn--sm" disabled={saving || pending} onClick={() => void close()}>
          ← 協同完成
        </button>
        <button type="button" className="btn btn--ghost btn--sm" aria-label="關閉表單" disabled={saving || pending} onClick={() => void close()}>
          關閉 ×
        </button>
      </div>
      <BeforeLeaveContext.Provider value={beforeLeave}>
        <div className={styles.modalContent}>{children}</div>
      </BeforeLeaveContext.Provider>
      {(saving || pending) && <LoadingOverlay message="儲存並返回列表中…" />}
    </dialog>
  );
}
