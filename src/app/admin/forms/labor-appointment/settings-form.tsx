'use client';

import { startTransition, useActionState, useState } from 'react';
import { LoadingOverlay } from '../../loading-overlay';
import styles from '../forms.module.css';
import { saveAppointmentSetting } from './actions';
import type { BookingDateSettings } from '@/lib/appointments/dates';
import { ActionResultModal, useNativeValidationModal } from '@/components/feedback/result-modal';

export function AppointmentSettingsForm({ isOpen, recipients, dates }: { isOpen: boolean; recipients: string[]; dates: BookingDateSettings }) {
  const [state, action, pending] = useActionState(saveAppointmentSetting, {});
  const [open, setOpen] = useState(isOpen);
  const [addresses, setAddresses] = useState(recipients.join('\n'));
  const onInvalid = useNativeValidationModal();

  return (
    <form
      className={styles.settings}
      onInvalidCapture={onInvalid}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {pending && <LoadingOverlay message="儲存設定中…" />}
      <ActionResultModal state={state} pending={pending} successMessage="預約開放、日期與通知設定已儲存。" />
      <label className={styles.switch}>
        <input type="checkbox" name="isOpen" checked={open} onChange={(event) => setOpen(event.target.checked)} />
        開放預約
      </label>
      <p className={styles.fieldHint}>開關控制是否受理新預約。已送出的案件仍可在協同完成處理。</p>

      <fieldset className={styles.fields} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend>可預約日期（週一至週六）</legend>
        <label>最早可預約（今天起第幾天）
          <input className="input" name="minDays" type="number" min={1} max={365} required defaultValue={dates.bookingMinDays} />
        </label>
        <label>最晚可預約（今天起第幾天）
          <input className="input" name="maxDays" type="number" min={1} max={365} required defaultValue={dates.bookingMaxDays} />
        </label>
      </fieldset>
      <div>
        <label className="label" htmlFor="appointment-closed-dates">停診日期</label>
        <textarea className="input" id="appointment-closed-dates" name="closedDates"
          rows={3} maxLength={5000} defaultValue={dates.closedDates.join('\n')} />
        <p className={styles.fieldHint}>每行一個西元日期（YYYY-MM-DD）。調整後影響新預約，已送出的案件仍可管理。</p>
      </div>

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
