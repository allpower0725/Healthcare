'use client';

import { useId, useRef } from 'react';
import { FormIllustration } from '@/components/brand/form-illustration';
import { APPOINTMENT_CATEGORY, APPOINTMENT_NAME, APPOINTMENT_PUBLIC_PATH } from '@/lib/appointments/catalog';
import { FORM_IDS, FORMS, type FormId } from '@/lib/forms/catalog';
import styles from './form-directory.module.css';

export type PublicFormId = FormId | typeof APPOINTMENT_CATEGORY;

const entries: { id: PublicFormId; href: string; name: string; description: string }[] = [
  ...FORM_IDS.map((id) => ({
    id,
    href: `/f/${id}`,
    name: FORMS[id].name,
    description: FORMS[id].officialTitle,
  })),
  {
    id: APPOINTMENT_CATEGORY,
    href: APPOINTMENT_PUBLIC_PATH,
    name: APPOINTMENT_NAME,
    description: '選擇健檢日期與套餐，或查詢既有預約',
  },
];

export function FormDirectory({ currentFormId }: { currentFormId: PublicFormId }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <div className={styles.dock}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label="所有表單一覽"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => dialog.current?.showModal()}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 8h.01M8 12h.01M8 16h.01M11 8h5m-5 4h5m-5 4h5" />
        </svg>
        表單一覽
      </button>

      <dialog
        ref={dialog}
        id={id}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-note`}
        onClose={() => trigger.current?.focus({ preventScroll: true })}
      >
        <div className={styles.heading}>
          <div>
            <h2 id={`${id}-title`}>所有表單一覽</h2>
            <p id={`${id}-note`}>連結會在新分頁開啟</p>
          </div>
          <button type="button" className={styles.close} aria-label="關閉表單一覽"
            onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ul className={styles.list} role="list">
          {entries.filter((entry) => entry.id !== currentFormId).map(({ id, href, name, description }) => (
            <li key={id}>
              <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
                <span className={styles.art} aria-hidden="true"><FormIllustration formId={id} /></span>
                <span className={styles.copy}>
                  <strong>{name}</strong>
                  <span>{description}</span>
                  <span className="sr-only">（在新分頁開啟）</span>
                </span>
                <svg className={styles.arrow} viewBox="0 0 24 24" width="16" height="16" fill="none"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 18 18 6M8 6h10v10" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
