'use client';

import { type ReactNode, useId, useRef } from 'react';
import type { Condition } from '@/lib/forms/engine';
import { clampDay, clampMonth, codeOf, todayRoc } from '@/lib/forms/format';
import type { Option } from '@/lib/forms/profile';
import { TW_COUNTIES, TW_DISTRICTS } from '@/lib/forms/tw-districts';
import { useFormContext, useText } from './context';

/** 欄位外框：標題、說明、錯誤訊息；離開欄位時驗證（單選、簽名不在此時驗證） */
export function Field(props: {
  /** 驗證規則 id，也是捲動定位用的 id */
  rule?: string;
  label?: ReactNode;
  /** 標題是 <label for> 時填入對應的 input id */
  htmlFor?: string;
  hint?: ReactNode;
  role?: 'group' | 'radiogroup';
  className?: string;
  validateOnBlur?: boolean;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { errors, validate } = useFormContext();
  const labelId = useId();
  const error = props.rule ? errors[props.rule] : undefined;
  const label = props.label ? (
    props.htmlFor ? (
      <label className="field__label" htmlFor={props.htmlFor}>
        {props.label}
      </label>
    ) : (
      <span className="field__label" id={labelId}>
        {props.label}
      </span>
    )
  ) : null;

  return (
    <div
      className={`field${props.className ? ` ${props.className}` : ''}${error ? ' is-invalid' : ''}`}
      id={props.rule ? `field-${props.rule}` : undefined}
      role={props.role}
      aria-labelledby={props.role && props.label && !props.htmlFor ? labelId : undefined}
      onBlur={(e) => {
        if (!props.rule || props.validateOnBlur === false) return;
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        validate(props.rule);
      }}
    >
      {props.aside ? (
        <div className="field__row">
          {label}
          {props.aside}
        </div>
      ) : (
        label
      )}
      {props.children}
      {props.hint && <p className="field__hint">{props.hint}</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 條件成立才顯示（隱藏時保留已填的值，送出時由伺服器清掉） */
export function ShowIf({ when, children }: { when: Condition; children: ReactNode }) {
  const { holds } = useFormContext();
  return holds(when) ? <>{children}</> : null;
}

type TextInputProps = {
  name: string;
  id?: string;
  maxLength: number;
  digits?: boolean;
  /** 只留數字與小數點 */
  decimal?: boolean;
  uppercase?: boolean;
  /** 離開欄位時去掉結尾的單位字（例：民眾多打了「號」） */
  stripSuffix?: string;
  className?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'email' | 'text';
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
};

export function TextInput(props: TextInputProps) {
  const { set, readOnly } = useFormContext();
  const value = useText(props.name);
  const composing = useRef(false);

  const normalize = (raw: string) => {
    let v = raw;
    if (props.digits) v = v.replace(/\D/g, '');
    if (props.decimal) v = v.replace(/[^\d.]/g, '');
    if (props.uppercase) v = v.toUpperCase().replace(/\s+/g, '');
    return v;
  };

  return (
    <input
      className={`input${props.className ? ` ${props.className}` : ''}`}
      id={props.id}
      name={props.name}
      type={props.type ?? 'text'}
      value={value}
      maxLength={props.maxLength}
      inputMode={props.inputMode ?? (props.digits ? 'numeric' : props.decimal ? 'decimal' : undefined)}
      placeholder={props.placeholder}
      autoComplete={props.autoComplete ?? 'off'}
      aria-label={props.ariaLabel}
      aria-describedby={props.ariaDescribedBy}
      disabled={readOnly}
      readOnly={props.readOnly}
      style={props.style}
      enterKeyHint="next"
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={(e) => {
        composing.current = false;
        set(props.name, normalize(e.currentTarget.value));
      }}
      onChange={(e) => set(props.name, composing.current ? e.target.value : normalize(e.target.value))}
      onBlur={(e) => {
        let v = normalize(e.target.value.trim());
        if (props.stripSuffix && v.endsWith(props.stripSuffix)) v = v.slice(0, -props.stripSuffix.length).trim();
        if (v !== value) set(props.name, v);
      }}
    />
  );
}

/** 民國年月日；年、月填滿後自動跳到下一格 */
export function RocDateInputs({ prefix, label }: { prefix: string; label: string }) {
  const month = useRef<HTMLInputElement>(null);
  const day = useRef<HTMLInputElement>(null);
  const { set, readOnly } = useFormContext();
  const y = useText(`${prefix}Y`);
  const m = useText(`${prefix}M`);
  const d = useText(`${prefix}D`);

  const part = (key: string, value: string, max: number, aria: string, next?: React.RefObject<HTMLInputElement | null>, full?: (v: string) => boolean) => (
    <input
      ref={key === 'M' ? month : key === 'D' ? day : undefined}
      className="input"
      name={`${prefix}${key}`}
      value={value}
      inputMode="numeric"
      maxLength={max}
      autoComplete="off"
      enterKeyHint="next"
      aria-label={aria}
      disabled={readOnly}
      onChange={(e) => {
        let v = e.target.value.replace(/\D/g, '');
        // 輸入當下就把月、日固定在最大值（月 12、日依該月天數）
        if (key === 'M') v = clampMonth(v);
        if (key === 'D') v = clampDay(v, y, m);
        set(`${prefix}${key}`, v);
        // 改了年或月之後，已填的日超過新的天數時一併調整（例：3 月 31 日改成 2 月）
        if (key !== 'D' && d) {
          const fixed = clampDay(d, key === 'Y' ? v : y, key === 'M' ? v : m);
          if (fixed !== d) set(`${prefix}D`, fixed);
        }
        const deleting = (e.nativeEvent as InputEvent).inputType?.startsWith('delete');
        if (!deleting && next?.current && full?.(v)) next.current.focus();
      }}
    />
  );

  return (
    <div className="rocdate">
      <span className="rocdate__unit">民國</span>
      {part('Y', y, 3, `${label}（民國年）`, month, (v) => v.length >= 3 || (v.length === 2 && v[0] !== '1'))}
      <span className="rocdate__unit">年</span>
      {part('M', m, 2, `${label}（月）`, day, (v) => v.length >= 2 || (v.length === 1 && v > '1'))}
      <span className="rocdate__unit">月</span>
      {part('D', d, 2, `${label}（日）`)}
      <span className="rocdate__unit">日</span>
    </div>
  );
}

/** 「今天」按鈕：帶入台灣時間的今天 */
export function TodayButton({ prefix }: { prefix: string }) {
  const { set, readOnly } = useFormContext();
  if (readOnly) return null;
  return (
    <button
      type="button"
      className="btn btn--soft btn--mini"
      onClick={() => {
        const t = todayRoc();
        set(`${prefix}Y`, t.y);
        set(`${prefix}M`, t.m);
        set(`${prefix}D`, t.d);
      }}
    >
      今天
    </button>
  );
}

/** 單選題；codes 時在選項前顯示代碼（院所區） */
export function Choices({
  name,
  options,
  className,
  codes,
}: {
  name: string;
  options: readonly Option[];
  className?: string;
  codes?: boolean;
}) {
  const { set, readOnly } = useFormContext();
  const value = useText(name);
  return (
    <div className={`choices${className ? ` ${className}` : ''}`}>
      {options.map(([v, label]) => (
        <label className="choice" key={v}>
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            disabled={readOnly}
            onChange={() => set(name, v)}
          />
          <span>
            {codes ? (
              <span className="choice__text">
                <span className="choice__code">{codeOf(v)}</span>
                {label}
              </span>
            ) : (
              label
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * 複選題；欄位定義的互斥選項（例：「以上均無」）勾選時會清掉其他選項，反之亦然。
 * 欄位定義有最多可選幾項時，選滿後其餘選項停用；codes 時在選項前顯示代碼（院所區）。
 */
export function Checks({
  name,
  options,
  className = 'choices',
  ariaLabel,
  codes,
}: {
  name: string;
  options: readonly Option[];
  className?: string;
  ariaLabel?: string;
  codes?: boolean;
}) {
  const { def, values, set, readOnly } = useFormContext();
  const current = Array.isArray(values[name]) ? (values[name] as string[]) : [];
  const spec = def.fields[name];
  const exclusive = spec?.exclusive ?? [];
  const full = spec?.maxPick != null && current.length >= spec.maxPick;
  const check = (v: string) =>
    exclusive.includes(v) ? [v] : [...current.filter((item) => !exclusive.includes(item)), v];
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {options.map(([v, label]) => (
        <label className="choice" key={v}>
          <input
            type="checkbox"
            name={name}
            value={v}
            checked={current.includes(v)}
            disabled={readOnly || (full && !current.includes(v))}
            onChange={(e) => set(name, e.target.checked ? check(v) : current.filter((item) => item !== v))}
          />
          <span>
            {codes ? (
              <span className="choice__text">
                <span className="choice__code">{codeOf(v)}</span>
                {label}
              </span>
            ) : (
              label
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

/** 多行文字（例：臨床所見、其他建議） */
export function TextArea({
  name,
  id,
  maxLength,
  rows = 3,
  placeholder,
  ariaLabel,
}: {
  name: string;
  id?: string;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const { set, readOnly } = useFormContext();
  const value = useText(name);
  return (
    <textarea
      className="input"
      id={id}
      name={name}
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={readOnly}
      onChange={(e) => set(name, e.target.value)}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== value) set(name, v);
      }}
    />
  );
}

/** 單一勾選（勾選時值為 '1'） */
export function Flag({ name, children }: { name: string; children: ReactNode }) {
  const { set, readOnly } = useFormContext();
  const checked = useText(name) === '1';
  return (
    <label className="check">
      <input
        type="checkbox"
        name={name}
        value="1"
        checked={checked}
        disabled={readOnly}
        onChange={(e) => set(name, e.target.checked ? '1' : '')}
      />
      <span>{children}</span>
    </label>
  );
}

function CountyTown({
  countyKey,
  townKey,
  countyCaption = '縣市',
  townCaption = '鄉鎮市區',
}: {
  countyKey: string;
  townKey: string;
  countyCaption?: string;
  townCaption?: string;
}) {
  const { set, readOnly } = useFormContext();
  const county = useText(countyKey);
  const town = useText(townKey);
  const towns = TW_DISTRICTS[county] ?? [];
  return (
    <>
      <label className="addr__item">
        <span className="addr__cap">{countyCaption}</span>
        <select
          className="input"
          name={countyKey}
          value={county}
          disabled={readOnly}
          autoComplete="off"
          onChange={(e) => {
            set(countyKey, e.target.value);
            set(townKey, '');
          }}
        >
          <option value="">請選擇</option>
          {TW_COUNTIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="addr__item">
        <span className="addr__cap">{townCaption}</span>
        <select
          className="input"
          name={townKey}
          value={towns.includes(town) ? town : ''}
          disabled={readOnly || towns.length === 0}
          onChange={(e) => set(townKey, e.target.value)}
        >
          <option value="">{towns.length ? '請選擇' : '請先選縣市'}</option>
          {towns.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** 只需縣市（例：成人預防保健的戶籍地） */
export function CountySelect({ name, id }: { name: string; id?: string }) {
  const { set, readOnly } = useFormContext();
  const county = useText(name);
  return (
    <select
      className="input"
      id={id}
      name={name}
      value={county}
      disabled={readOnly}
      autoComplete="off"
      onChange={(e) => set(name, e.target.value)}
    >
      <option value="">請選擇</option>
      {TW_COUNTIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** 只需縣市與鄉鎮市區（例：戶籍地址） */
export function RegionInputs({ countyKey, townKey }: { countyKey: string; townKey: string }) {
  return (
    <div className="addr">
      <CountyTown countyKey={countyKey} townKey={townKey} />
    </div>
  );
}

/** 現住址：縣市、鄉鎮市區、村里、鄰、路街、段、巷、弄、號、樓 */
export function AddressInputs({ prefix }: { prefix: string }) {
  const affix = (key: string, unit: string, max: number, cls: string, aria: string, numeric = true) => (
    <label className={`addr__item ${cls}`}>
      <span className="affix">
        <TextInput
          name={`${prefix}${key}`}
          maxLength={max}
          stripSuffix={unit}
          inputMode={numeric ? 'numeric' : undefined}
          ariaLabel={aria}
        />
        <span className="affix__text">{unit}</span>
      </span>
    </label>
  );
  return (
    <div className="addr">
      <CountyTown countyKey={`${prefix}County`} townKey={`${prefix}Town`} />
      <label className="addr__item addr__item--village">
        <span className="addr__cap">
          村／里 <span className="opt">選填</span>
        </span>
        <TextInput name={`${prefix}Village`} maxLength={12} placeholder="例：光明里" />
      </label>
      {affix('Lin', '鄰', 4, 'addr__item--lin', '鄰（選填）')}
      <label className="addr__item addr__item--road">
        <span className="addr__cap">路／街</span>
        <TextInput name={`${prefix}Road`} maxLength={16} placeholder="例：中山路" />
      </label>
      {affix('Sec', '段', 4, 'addr__item--sm', '段（選填）')}
      {affix('Lane', '巷', 6, 'addr__item--sm', '巷（選填）')}
      {affix('Alley', '弄', 6, 'addr__item--sm', '弄（選填）')}
      {affix('No', '號', 10, 'addr__item--md', '號', false)}
      {affix('Floor', '樓', 8, 'addr__item--md', '樓（選填）', false)}
    </div>
  );
}
