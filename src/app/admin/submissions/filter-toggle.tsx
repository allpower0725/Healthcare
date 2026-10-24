'use client';

import { useEffect, useRef, useState } from 'react';

/** 輸入身分證號前的勾選，清空號碼時還原；按「篩選」換頁後仍要記得，所以存在 sessionStorage */
const SAVED_KEY = 'submissions-filter:before-id';

const checkboxes = (form: HTMLFormElement) =>
  [...form.elements].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'checkbox');

function idInput(form: HTMLFormElement) {
  const el = form.elements.namedItem('id');
  return el instanceof HTMLInputElement ? el : null;
}

const hasId = (form: HTMLFormElement) => (idInput(form)?.value.trim() ?? '') !== '';

/** 篩選欄位是否有任何條件：填了身分證號，或勾了任一個勾選框 */
const hasConditions = (form: HTMLFormElement) => hasId(form) || checkboxes(form).some((el) => el.checked);

const checkKey = (el: HTMLInputElement) => `${el.name}=${el.value}`;

function saveChecks(form: HTMLFormElement) {
  const checked = checkboxes(form).filter((el) => el.checked).map(checkKey);
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(checked));
  } catch {}
}

function forgetChecks() {
  try {
    sessionStorage.removeItem(SAVED_KEY);
  } catch {}
}

/** 還原輸入身分證號前的勾選；沒有紀錄（例如直接開啟帶號碼的網址）就回到全不勾 */
function restoreChecks(form: HTMLFormElement) {
  let saved: unknown = [];
  try {
    saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? '[]');
  } catch {}
  const keys = Array.isArray(saved) ? saved : [];
  for (const el of checkboxes(form)) el.checked = keys.includes(checkKey(el));
  forgetChecks();
}

/**
 * 「清除條件／條件全選」切換鈕：只改欄位，按「篩選」才套用。
 * 有任何條件時顯示「清除條件」，清空全部（含身分證號）；全空時顯示「條件全選」，勾選全部表單與狀態。
 * 身分證號由空變有值時自動全選（查出此人所有資料），清空號碼時還原原本的勾選。
 */
export function FilterToggle({ initialActive }: { initialActive: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(initialActive);
  const hadId = useRef(false);

  // 手動輸入或勾選時跟著切換文字
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    hadId.current = hasId(form);
    // 載入時沒有身分證號，先前記下的勾選用不到了
    if (!hadId.current) forgetChecks();

    const sync = () => {
      const nowId = hasId(form);
      if (nowId && !hadId.current) {
        saveChecks(form);
        for (const el of checkboxes(form)) el.checked = true;
      } else if (!nowId && hadId.current) {
        restoreChecks(form);
      }
      hadId.current = nowId;
      setActive(hasConditions(form));
    };
    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    return () => {
      form.removeEventListener('input', sync);
      form.removeEventListener('change', sync);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="btn btn--ghost"
      onClick={() => {
        const form = ref.current?.form;
        if (!form) return;
        for (const el of checkboxes(form)) el.checked = !active;
        const id = idInput(form);
        if (active && id) {
          id.value = '';
          hadId.current = false;
          forgetChecks();
        }
        // 程式改欄位不會觸發 input／change，直接切換
        setActive(!active);
      }}
    >
      {active ? '清除條件' : '條件全選'}
    </button>
  );
}
