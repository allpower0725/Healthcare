'use client';

import { startTransition, useActionState, useState } from 'react';
import styles from '../forms.module.css';
import { saveFormSetting } from './actions';

type Props = {
  formId: string;
  isOpen: boolean;
  /** datetime-local 的值（台灣時間），未設定為空字串 */
  opensAt: string;
  closesAt: string;
};

export function SettingsForm({ formId, ...initial }: Props) {
  const [state, action, pending] = useActionState(saveFormSetting.bind(null, formId), {});
  // 受控欄位：送出失敗時保留剛才輸入的值
  const [isOpen, setIsOpen] = useState(initial.isOpen);
  const [opensAt, setOpensAt] = useState(initial.opensAt);
  const [closesAt, setClosesAt] = useState(initial.closesAt);

  return (
    <form
      className={styles.settings}
      // 不用 action 屬性：React 在 action 完成後會自動重設表單，開關會跳回頁面載入時的狀態
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <label className={styles.switch}>
        <input type="checkbox" name="isOpen" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
        開放填寫
      </label>
      <p className={styles.fieldHint} style={{ marginTop: -8 }}>
        關閉時，不論開放期間怎麼設定，民眾都無法填寫。
      </p>

      <div className={styles.fields}>
        <TimeField
          id="opensAt"
          label="開始時間"
          hint="留空：開關打開就開放"
          value={opensAt}
          onChange={setOpensAt}
        />
        <TimeField
          id="closesAt"
          label="結束時間"
          hint="留空：不設結束時間"
          value={closesAt}
          onChange={setClosesAt}
        />
      </div>

      {state.error && (
        <p className="notice notice--error" role="alert">
          {state.error}
        </p>
      )}
      {!state.error && state.savedAt && !pending && (
        <p className="notice notice--info" role="status">
          已儲存。
        </p>
      )}

      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? '儲存中…' : '儲存設定'}
        </button>
      </div>
    </form>
  );
}

function TimeField(props: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>
        {props.label}（台灣時間）
      </label>
      <input
        className="input"
        id={props.id}
        name={props.id}
        type="datetime-local"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className={styles.fieldFoot}>
        <p className={styles.fieldHint}>{props.hint}</p>
        {props.value && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => props.onChange('')}>
            清除
          </button>
        )}
      </div>
    </div>
  );
}
