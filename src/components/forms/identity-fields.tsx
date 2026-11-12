'use client';

import { type ReactNode, useId } from 'react';
import { IDENTITY_HINTS, IDENTITY_MAX_LENGTH, IDENTITY_TYPES, type IdentityType, normalizeIdentityNumber } from '@/lib/forms/identity';
import styles from './identity-fields.module.css';

export function IdentityFields({ inputId, type, value, onTypeChange, onNumberChange, onEnter, readOnly, disabled, error, action }: {
  inputId: string;
  type: IdentityType;
  value: string;
  onTypeChange: (type: IdentityType) => void;
  onNumberChange: (value: string) => void;
  onEnter?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
  error?: string;
  action?: ReactNode;
}) {
  const groupId = useId();
  const numberLabel = type === 'national_id' ? '身分證統一編號' : type === 'resident_id' ? '統一證號' : '護照號碼';
  return <div className={`${styles.fields}${error ? ' is-invalid' : ''}`}>
    <fieldset className={styles.types} disabled={readOnly || disabled}>
      <legend className="field__label">證件種類</legend>
      <div className={styles.options}>{IDENTITY_TYPES.map(([code, label]) => <label key={code} className={styles.option}>
        <input type="radio" name={groupId} value={code} checked={type === code} onChange={() => onTypeChange(code)} />
        <span>{label}</span>
      </label>)}</div>
    </fieldset>
    <div className="field__row">
      <label className="field__label" htmlFor={inputId}>{numberLabel}</label>
      {action}
    </div>
    <input className="input input--code" id={inputId} value={value} readOnly={readOnly} disabled={disabled}
      // 多保留一碼供驗證拒絕，避免貼上過長護照時被瀏覽器截成合法的 20 碼。
      maxLength={IDENTITY_MAX_LENGTH + 1} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
      enterKeyHint="go" aria-invalid={!!error} aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
      onChange={(event) => onNumberChange(normalizeIdentityNumber(event.target.value))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && onEnter && !readOnly) {
          event.preventDefault(); onEnter();
        }
      }} />
    <p className="field__hint" id={`${inputId}-hint`}>{IDENTITY_HINTS[type]}</p>
    {error && <p className="field__error" id={`${inputId}-error`} role="alert">{error}</p>}
  </div>;
}
