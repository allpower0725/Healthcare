'use client';

import { startTransition, useActionState, useState } from 'react';
import { LoadingOverlay } from '../../loading-overlay';
import styles from '../forms.module.css';
import { saveAppointmentSetting } from './actions';

export function AppointmentSettingsForm({ isOpen, recipients }: { isOpen: boolean; recipients: string[] }) {
  const [state, action, pending] = useActionState(saveAppointmentSetting, {});
  const [open, setOpen] = useState(isOpen);
  const [addresses, setAddresses] = useState(recipients.join('\n'));

  return (
    <form
      className={styles.settings}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {pending && <LoadingOverlay message="儲存設定中…" />}
      <label className={styles.switch}>
        <input type="checkbox" name="isOpen" checked={open} onChange={(event) => setOpen(event.target.checked)} />
        開放預約
      </label>
      <p className={styles.fieldHint}>開關控制是否受理新預約。已送出的案件仍可在協同完成處理。</p>

      <div>
        <label className="label" htmlFor="appointment-recipients">通知收件人</label>
        <textarea
          className={`input ${styles.recipientInput}`}
          id="appointment-recipients"
          name="recipients"
          rows={5}
          maxLength={8000}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={state.invalidRecipients ? 'appointment-recipient-hint appointment-settings-error' : 'appointment-recipient-hint'}
          aria-invalid={state.invalidRecipients || undefined}
          value={addresses}
          onChange={(event) => setAddresses(event.target.value)}
        />
        <p className={styles.fieldHint} id="appointment-recipient-hint">
          每行一個信箱，也可用逗號分隔。有新案件時於整點彙整寄送，留空時暫停通知。
        </p>
      </div>

      {state.error && <p className="notice notice--error" id="appointment-settings-error" role="alert">{state.error}</p>}
      {state.saved && !pending && <p className="notice notice--info" role="status">已儲存。</p>}
      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? '儲存中…' : '儲存設定'}
        </button>
      </div>
    </form>
  );
}
