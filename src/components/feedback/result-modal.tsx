'use client';

import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import styles from './result-modal.module.css';

export type ResultMessage = {
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error';
  confirmLabel?: string;
  onClose?: () => void;
};
type QueuedMessage = ResultMessage & { id: number };
const ResultContext = createContext<((message: ResultMessage) => void) | null>(null);

export function ResultModalProvider({ children }: { children: ReactNode }) {
  const sequence = useRef(0);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const showResult = useCallback((message: ResultMessage) => {
    const id = ++sequence.current;
    setQueue((previous) => [...previous, { ...message, id }]);
  }, []);
  const current = queue[0];
  return <ResultContext.Provider value={showResult}>
    {children}
    {current && <ResultModal key={current.id} result={current} close={() => {
      setQueue((previous) => previous.slice(1));
      current.onClose?.();
    }} />}
  </ResultContext.Provider>;
}

export function useResultModal() {
  const showResult = useContext(ResultContext);
  if (!showResult) throw new Error('ResultModalProvider is required');
  return showResult;
}

function ResultModal({ result, close }: { result: ResultMessage; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => setHost(document.body), []);
  useEffect(() => {
    if (!host) return;
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, [host]);
  function acknowledge() {
    dialog.current?.close();
    if (!result.onClose && document.activeElement === document.body) {
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
      const scope = dialogs[dialogs.length - 1] ?? document;
      const heading = scope.querySelector<HTMLElement>('h1, h2');
      if (heading) {
        const hadTabIndex = heading.hasAttribute('tabindex');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        if (!hadTabIndex) heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
      }
    }
    close();
  }
  return host ? createPortal(
    <dialog ref={dialog} className={`${styles.dialog} ${styles[result.tone]}`} role="alertdialog"
      aria-labelledby={titleId} aria-describedby={messageId} onCancel={(event) => {
        event.preventDefault();
        acknowledge();
      }}>
      <div className={styles.icon} aria-hidden="true">{result.tone === 'success' ? '✓' : '!'}</div>
      <h2 id={titleId}>{result.title}</h2>
      <p id={messageId}>{result.message}</p>
      <button autoFocus type="button" className="btn btn--primary" onClick={acknowledge}>
        {result.confirmLabel ?? '確定'}
      </button>
    </dialog>, host,
  ) : null;
}

/** 原生必填與格式檢查也以相同 Modal 回覆，每次提交只顯示第一個錯誤。 */
export function useNativeValidationModal() {
  const showResult = useResultModal();
  const reporting = useRef(false);
  return (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (reporting.current) return;
    reporting.current = true;
    const control = event.target as HTMLElement;
    showResult({
      title: '請確認輸入內容', tone: 'warning',
      message: '請完成必填欄位，並確認輸入格式後再送出。',
      confirmLabel: '前往修正',
      onClose: () => {
        reporting.current = false;
        if (control.isConnected) {
          control.focus({ preventScroll: true });
          control.scrollIntoView({ block: 'center' });
        }
      },
    });
  };
}

export function ActionResultModal({ state, pending, successMessage, successTitle = '儲存完成', refreshOnSuccess = false }: {
  state: { error?: string; saved?: boolean; savedAt?: number; success?: boolean };
  pending: boolean;
  successMessage: string;
  successTitle?: string;
  refreshOnSuccess?: boolean;
}) {
  const showResult = useResultModal();
  const router = useRouter();
  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (pending || handled.current === state) return;
    const success = state.saved || state.savedAt || state.success;
    if (!state.error && !success) return;
    handled.current = state;
    showResult({
      title: state.error ? '操作未完成' : successTitle,
      tone: state.error ? 'error' : 'success',
      message: state.error ?? successMessage,
    });
    if (!state.error && refreshOnSuccess) router.refresh();
  }, [state, pending, successMessage, successTitle, refreshOnSuccess, router, showResult]);
  return null;
}
