'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './loading-overlay.module.css';
/** 共用 top-layer 遮罩：前台手機與後台 modal 均可使用。 */
export function LoadingOverlay({ message = '資料處理中，請稍候…' }: { message?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  useEffect(() => {
    if (!host) return;
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, [host]);
  return host ? createPortal(
    <dialog ref={ref} className={styles.overlay} aria-label={message} onCancel={e => e.preventDefault()}>
      <div className={styles.content} role="status" aria-live="polite">
        <div className={styles.cogs} aria-hidden="true">
          {[styles.pink, styles.blue, styles.yellow].map(color => <div key={color} className={`${styles.gear} ${color}`}><i /><i /><i /><b /></div>)}
        </div>
        <p>{message}</p>
      </div>
    </dialog>, host,
  ) : null;
}
