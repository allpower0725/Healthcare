'use client';

import { startTransition, useActionState, useRef, useState } from 'react';
import { LoadingOverlay } from '../../loading-overlay';
import styles from '../forms.module.css';
import { saveAppointmentSetting } from './actions';
import { isDate, type BookingDateSettings } from '@/lib/appointments/dates';
import { isNotificationAddress, MAX_APPOINTMENT_RECIPIENTS } from '@/lib/appointments/recipient-validation';
import { ActionResultModal, useNativeValidationModal, useResultModal } from '@/components/feedback/result-modal';

function SettingItems({ items, label, disabled, onRemove }: {
  items: string[];
  label: string;
  disabled: boolean;
  onRemove: (item: string) => void;
}) {
  return items.length > 0 ? (
    <ul className={styles.settingItems} aria-label={`${label}清單`}>
      {items.map((item) => (
        <li className={styles.settingItem} key={item}>
          <span>{item}</span>
          <button type="button" className={styles.removeItem} disabled={disabled}
            aria-label={`刪除${label} ${item}`} title={`刪除${item}`} onClick={() => onRemove(item)}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  ) : <p className={styles.fieldHint}>尚未設定{label}。</p>;
}

export function AppointmentSettingsForm({ isOpen, recipients, dates }: { isOpen: boolean; recipients: string[]; dates: BookingDateSettings }) {
  const [state, action, pending] = useActionState(saveAppointmentSetting, {});
  const [open, setOpen] = useState(isOpen);
  const [addresses, setAddresses] = useState(recipients);
  const [closedDates, setClosedDates] = useState(dates.closedDates);
  const [dateDraft, setDateDraft] = useState('');
  const [addressDraft, setAddressDraft] = useState('');
  const dateInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  const showResult = useResultModal();
  const onInvalid = useNativeValidationModal();

  function addDate() {
    if (pending) return;
    const onClose = () => dateInput.current?.focus();
    if (!isDate(dateDraft)) {
      showResult({ title: '請選擇停診日期', message: '請選擇有效日期後，再按「確認加入」。', tone: 'warning', onClose });
      return;
    }
    if (closedDates.includes(dateDraft)) {
      showResult({ title: '日期已在清單中', message: `${dateDraft} 已加入，無須重複新增。`, tone: 'warning', onClose });
      return;
    }
    if (closedDates.length >= 365) {
      showResult({ title: '停診日期已達上限', message: '最多可設定 365 個停診日期，請先移除不需要的日期。', tone: 'warning', onClose });
      return;
    }
    setClosedDates((previous) => [...previous, dateDraft].sort());
    setDateDraft('');
    showResult({ title: '已加入待儲存清單', message: `停診日期 ${dateDraft} 已加入清單，請按「儲存設定」套用變更。`, tone: 'success', onClose });
  }

  function addAddress() {
    if (pending) return;
    const address = addressDraft.trim().toLowerCase();
    const onClose = () => addressInput.current?.focus();
    if (!isNotificationAddress(address)) {
      showResult({ title: '請確認信箱格式', message: '請輸入一個完整的電子郵件信箱，例如 health@example.com。', tone: 'warning', onClose });
      return;
    }
    if (addresses.includes(address)) {
      showResult({ title: '收件人已在清單中', message: `${address} 已加入，無須重複新增。`, tone: 'warning', onClose });
      return;
    }
    if (addresses.length >= MAX_APPOINTMENT_RECIPIENTS) {
      showResult({ title: '通知收件人已達上限', message: `最多可設定 ${MAX_APPOINTMENT_RECIPIENTS} 個信箱，請先移除不需要的收件人。`, tone: 'warning', onClose });
      return;
    }
    setAddresses((previous) => [...previous, address]);
    setAddressDraft('');
    showResult({ title: '已加入待儲存清單', message: `通知收件人 ${address} 已加入清單，請按「儲存設定」套用變更。`, tone: 'success', onClose });
  }

  return (
    <form
      className={styles.settings}
      onInvalidCapture={onInvalid}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (dateDraft || addressDraft.trim()) {
          showResult({
            title: '尚有未加入的項目', tone: 'warning',
            message: '請先按輸入框旁的「確認加入」，或清空尚未加入的內容，再儲存設定。',
            onClose: () => (dateDraft ? dateInput : addressInput).current?.focus(),
          });
          return;
        }
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {pending && <LoadingOverlay message="儲存設定中…" />}
      <ActionResultModal state={state} pending={pending} successMessage="預約開放、日期與通知設定已儲存。" />
      <label className={styles.switch}>
        <input type="checkbox" name="isOpen" checked={open} disabled={pending} onChange={(event) => setOpen(event.target.checked)} />
        開放預約
      </label>
      <p className={styles.fieldHint}>開關控制是否受理新預約。已送出的案件仍可在協同完成處理。</p>

      <fieldset className={styles.fields} disabled={pending} style={{ border: 0, margin: 0, padding: 0 }}>
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
        <div className={`${styles.itemEntry} ${styles.dateEntry}`}>
          <input className="input" ref={dateInput} id="appointment-closed-dates" type="date" max="9999-12-31"
            disabled={pending} value={dateDraft} aria-describedby="appointment-closed-dates-hint"
            onInput={(event) => setDateDraft(event.currentTarget.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addDate(); }
            }} />
          <button type="button" className="btn btn--ghost" disabled={pending} aria-label="確認加入停診日期" onClick={addDate}>確認加入</button>
        </div>
        <input type="hidden" name="closedDates" value={closedDates.join('\n')} />
        <SettingItems items={closedDates} label="停診日期" disabled={pending} onRemove={(date) => {
          setClosedDates((previous) => previous.filter((item) => item !== date));
          dateInput.current?.focus();
        }} />
        <p className={styles.fieldHint} id="appointment-closed-dates-hint">加入或刪除後，請按「儲存設定」。停診日期僅影響新預約，已送出的案件仍可管理。</p>
      </div>

      <div>
        <label className="label" htmlFor="appointment-recipients">通知收件人</label>
        <div className={styles.itemEntry}>
          <input
            className="input"
            ref={addressInput}
            id="appointment-recipients"
            type="text"
            inputMode="email"
            placeholder="例如 health@example.com"
            maxLength={254}
            disabled={pending}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={state.invalidRecipients ? 'appointment-recipient-hint appointment-settings-error' : 'appointment-recipient-hint'}
            aria-invalid={state.invalidRecipients || undefined}
            value={addressDraft}
            onChange={(event) => setAddressDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addAddress(); }
            }}
          />
          <button type="button" className="btn btn--ghost" disabled={pending} aria-label="確認加入通知收件人" onClick={addAddress}>確認加入</button>
        </div>
        <input type="hidden" name="recipients" value={addresses.join('\n')} />
        <SettingItems items={addresses} label="通知收件人" disabled={pending} onRemove={(address) => {
          setAddresses((previous) => previous.filter((item) => item !== address));
          addressInput.current?.focus();
        }} />
        <p className={styles.fieldHint} id="appointment-recipient-hint">
          每次加入一個信箱，最多 {MAX_APPOINTMENT_RECIPIENTS} 個。加入或刪除後，請按「儲存設定」。有新案件時於整點彙整寄送，清空清單並儲存即可暫停通知。
        </p>
      </div>

      {state.error && <p className="notice notice--error" id="appointment-settings-error" role="alert">{state.error}</p>}
      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? '儲存中…' : '儲存設定'}
        </button>
      </div>
    </form>
  );
}
