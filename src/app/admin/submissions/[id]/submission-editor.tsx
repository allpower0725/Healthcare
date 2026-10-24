'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormContext, type FormContextValue } from '@/components/forms/context';
import { useFormState } from '@/components/forms/use-form-state';
import type { FormValues, SubmissionStatus } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { conditionsHold, missingStarred, sanitize } from '@/lib/forms/engine';
import type { StaffActionResult } from '@/lib/submissions/service';
import { getFormUi } from '@/forms/registry';
import styles from '../submissions.module.css';
import { completeAction, reopenAction, restoreAction, saveStaff, voidAction } from './actions';

type Props = {
  id: string;
  formId: FormId;
  status: SubmissionStatus;
  version: number;
  publicData: FormValues;
  /** 院所區目前的值（第一次開啟時已帶入預設值） */
  staffData: FormValues;
  printHref: string;
  completedNote: string | null;
};

const ERRORS: Record<string, string> = {
  conflict: '資料已被其他人更新，請重新整理頁面後再操作。',
  not_ready: '民眾正在修改，等民眾重新送出後才能確認送出。',
  invalid_status: '這份表單的狀態已改變，請重新整理頁面。',
  locked: '這份表單已被鎖定，請重新整理頁面。',
  forbidden: '你的帳號沒有權限，或已被停用。',
  not_found: '找不到這筆資料。',
};

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export function SubmissionEditor(props: Props) {
  const def = getFormDef(props.formId)!;
  const ui = getFormUi(props.formId)!;
  const editable = props.status === 'submitted' || props.status === 'returned';

  const version = useRef(props.version);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const staff = useFormState(def, props.staffData, {
    rules: def.staffRules,
    onSet: ui.onSet,
    readOnly: !editable,
    onChange: () => {
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 1200);
    },
  });

  // 民眾填寫內容：唯讀
  const publicCtx = useMemo<FormContextValue>(
    () => ({
      def,
      values: props.publicData,
      set: () => {},
      errors: {},
      validate: () => {},
      readOnly: true,
      holds: (condition) => conditionsHold(condition, props.publicData),
    }),
    [def, props.publicData],
  );

  function showResult(result: StaffActionResult) {
    if (!result.ok) setError(ERRORS[result.reason] ?? '操作沒有完成，請再試一次。');
    return result.ok;
  }

  /** 依序送出暫存，避免兩個請求帶著同一個版本號 */
  function save() {
    if (!dirty.current || error) return inFlight.current;
    dirty.current = false;
    const run = async () => {
      setSaveState('saving');
      try {
        const result = await saveStaff(props.id, version.current, staff.latest.current);
        if (result.ok) {
          version.current = result.version;
          setSaveState('saved');
          setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }));
        } else {
          setSaveState('failed');
          showResult(result);
        }
      } catch {
        setSaveState('failed');
        dirty.current = true;
      }
    };
    inFlight.current = inFlight.current.then(run, run);
    return inFlight.current;
  }

  // 離開頁面前把尚未暫存的內容送出
  useEffect(() => {
    const onHide = () => {
      if (timer.current) clearTimeout(timer.current);
      void save();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function complete() {
    if (timer.current) clearTimeout(timer.current);
    await inFlight.current;

    const formatErrors = staff.validateAll();
    const bad = Object.keys(formatErrors);
    if (bad.length > 0) {
      setError('有欄位格式不正確，請修正後再確認送出。');
      document.getElementById(`field-${bad[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const missing = missingStarred(def, sanitize(def, 'staff', staff.latest.current, props.publicData), props.publicData);
    const question =
      missing.length > 0
        ? `以下標＊的欄位尚未填寫：\n・${missing.join('\n・')}\n\n仍要確認送出嗎？送出後整份表單會鎖定。`
        : '確認送出後，整份表單會鎖定，無法再修改。確定要送出嗎？';
    if (!window.confirm(question)) return;

    setBusy(true);
    setError(null);
    try {
      showResult(await completeAction(props.id, version.current, staff.latest.current));
    } finally {
      setBusy(false);
    }
  }

  async function act(action: (id: string) => Promise<StaffActionResult>, question: string) {
    if (!window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      showResult(await action(props.id));
    } finally {
      setBusy(false);
    }
  }

  const saveNote =
    saveState === 'saving'
      ? '儲存中…'
      : saveState === 'saved' && savedAt
        ? `已自動儲存 ${savedAt}`
        : saveState === 'failed'
          ? '儲存失敗'
          : '內容會自動儲存';

  return (
    <>
      <div
        className={`notice ${props.status === 'completed' ? 'notice--info' : 'notice--warn'} ${styles.statusNotice}`}
        role="status"
      >
        {props.status === 'submitted' && '民眾已送出。請填寫下方的「院所填寫區」，填完後按最下面的「確認送出」。'}
        {props.status === 'returned' && '民眾正在修改，等民眾重新送出後才能確認送出；院所填寫區仍可先填寫。'}
        {props.status === 'completed' &&
          `${props.completedNote ?? '已完成，資料已鎖定。'}需要修改時，按最下面的「取消送出」。`}
        {props.status === 'voided' && '這筆資料已作廢，列表預設不顯示（勾選狀態「已作廢」才看得到）。需要時可按最下面的「復原」。'}
      </div>

      <div className={`ppf ${styles.formArea}`}>
        <details className={styles.publicPart}>
          <summary>
            <span>民眾填寫內容</span>
            <span className={`btn btn--ghost btn--mini ${styles.toggle}`} aria-hidden="true">
              <span className={styles.whenClosed}>展開 ▾</span>
              <span className={styles.whenOpen}>收合 ▴</span>
            </span>
          </summary>
          <FormContext.Provider value={publicCtx}>
            <fieldset className="public" disabled>
              <legend className="sr-only">民眾填寫內容</legend>
              <ui.Public prefilled={false} />
            </fieldset>
          </FormContext.Provider>
        </details>

        <section className="staff" aria-labelledby="staff-title">
          <header className="staff__head">
            <span className="staff__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <div>
              <h2 className="staff__title" id="staff-title">
                院所填寫區
              </h2>
              <p className="staff__desc">{editable ? '由醫療院所及檢驗單位填寫；內容會自動儲存。' : '已鎖定，無法修改。'}</p>
            </div>
          </header>
          <FormContext.Provider value={staff.ctx}>
            <fieldset disabled={!editable} className={styles.staffFields}>
              <legend className="sr-only">院所填寫區</legend>
              <ui.Staff publicData={props.publicData} />
            </fieldset>
          </FormContext.Provider>

          {/* 錯誤訊息在院所區內捲動時固定在畫面下緣，填寫中途儲存失敗也看得到 */}
          {error && (
            <p className="notice notice--error staff__error" role="alert">
              <span>{error}</span>
              <button type="button" className="btn btn--ghost btn--mini" onClick={() => location.reload()}>
                重新整理
              </button>
            </p>
          )}

          {/* 填完院所區就在這裡送出 */}
          <div className="staff__actions">
            <div className="staff__buttons">
              {editable && (
                <span className="staff__save" aria-live="polite">
                  {saveNote}
                </span>
              )}
              {editable && (
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={busy}
                  onClick={() => void act(voidAction, '確定要作廢這筆資料嗎？作廢後列表預設不顯示，之後仍可復原。')}
                >
                  作廢
                </button>
              )}
              {props.status === 'submitted' && (
                <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void complete()}>
                  確認送出
                </button>
              )}
              {props.status === 'returned' && (
                // 停用的按鈕不會觸發滑鼠事件，說明放在外層
                <span title="民眾重新送出後才能確認送出">
                  <button type="button" className="btn btn--primary" disabled>
                    確認送出
                  </button>
                </span>
              )}
              {props.status === 'completed' && (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={busy}
                    onClick={() =>
                      void act(reopenAction, '取消送出後，院所區可以再修改，民眾也可以退回修改。確定要取消送出嗎？')
                    }
                  >
                    取消送出
                  </button>
                  <Link className="btn btn--primary" href={props.printHref}>
                    列印 / 另存原樣 PDF
                  </Link>
                </>
              )}
              {props.status === 'voided' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy}
                  onClick={() => void act(restoreAction, '確定要復原這筆資料嗎？')}
                >
                  復原
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
