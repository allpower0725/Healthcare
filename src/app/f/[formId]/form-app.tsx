'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormContext } from '@/components/forms/context';
import { useFormState } from '@/components/forms/use-form-state';
import type { FormValues, SubmissionStatus } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { validateRules } from '@/lib/forms/engine';
import { checkTwId, isTaiwanCitizenId, maskIdNo } from '@/lib/forms/format';
import { toTaipeiInput } from '@/lib/time';
import { getFormUi } from '@/forms/registry';
import { forgetDevice, loadDeviceSubmission, resubmitForm, returnForm, submitForm } from './actions';
import { ClosedCard, PublicChrome } from './chrome';
import { type Loaded, localStore } from './local-store';

type Phase = 'loading' | 'gate' | 'closed' | 'filling' | 'done';
type Sent = { id: string; status: SubmissionStatus; submittedAt: string };

const session = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      // 略過
    }
  },
  remove: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      // 略過
    }
  },
};

/** 送出時間：民國 115/10/24 12:34（台灣時間） */
function rocDateTime(iso: string) {
  const [date, time] = toTaipeiInput(new Date(iso)).split('T');
  const [y, m, d] = date.split('-').map(Number);
  return `${y - 1911}/${m}/${d} ${time}`;
}

function scrollToId(id: string, block: ScrollLogicalPosition = 'center') {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block }));
}

export function FormApp({
  formId,
  acceptingNew,
  closedMessage,
  closedPeriod,
  intro,
}: {
  formId: FormId;
  /** 表單開放中；關閉時只讓已送出的裝置回來查看、退回修改 */
  acceptingNew: boolean;
  closedMessage: string;
  /** 開放期間的文字；未設定時為 null */
  closedPeriod: string | null;
  intro: ReactNode;
}) {
  const def = getFormDef(formId)!;
  const ui = getFormUi(formId)!;
  const RESUME_KEY = `pp:resume:${formId}`;

  const [phase, setPhase] = useState<Phase>('loading');
  const [owner, setOwner] = useState<string | null>(null);
  const [idInput, setIdInput] = useState('');
  const [idError, setIdError] = useState('');
  const [sent, setSent] = useState<Sent | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [showPublic, setShowPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const token = useRef<string | null>(null);
  const ownerRef = useRef<string | null>(null);
  const sentRef = useRef<Sent | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imageKeys = useMemo(
    () => Object.keys(def.fields).filter((k) => def.fields[k].part === 'public' && def.fields[k].kind === 'image'),
    [def],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /* ---------- 裝置暫存 ---------- */

  const persist = useCallback(
    (values: FormValues) => {
      const who = ownerRef.current;
      if (!who) return;
      const profile: FormValues = {};
      const own: FormValues = {};
      for (const [k, v] of Object.entries(values)) (k.startsWith('profile.') ? profile : own)[k] = v;
      void localStore.save(who, formId, { values: own, submissionId: sentRef.current?.id }, profile);
    },
    [formId],
  );

  const form = useFormState(def, {}, {
    rules: def.publicRules,
    onSet: ui.onSet,
    readOnly: phase === 'done',
    onChange: (values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(values), 300);
    },
  });
  const { replace, latest } = form;

  const flush = useCallback(() => {
    if (!saveTimer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    persist(latest.current);
  }, [persist, latest]);

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  const setSentState = (next: Sent | null) => {
    sentRef.current = next;
    setSent(next);
  };

  const withoutImages = useCallback(
    (values: FormValues) => ({ ...values, ...Object.fromEntries(imageKeys.map((k) => [k, ''])) }),
    [imageKeys],
  );

  /* ---------- 身分證關卡 ---------- */

  const enter = useCallback(
    async (who: string, saved: Loaded) => {
      ownerRef.current = who;
      setOwner(who);
      const own = saved.form;

      if (own?.submissionId) {
        const remote = await loadDeviceSubmission(own.submissionId);
        if (remote) {
          setSentState({ id: own.submissionId, status: remote.status, submittedAt: remote.submittedAt });
          if (remote.status === 'returned') {
            // 退回修改中：以裝置上正在修改的內容為主
            const editing = Object.keys(own.values ?? {}).length > 0;
            replace({ ...withoutImages(remote.publicData), ...(editing ? own.values : {}), 'profile.idNo': who });
            setPhase('filling');
          } else {
            replace(remote.publicData);
            setPhase('done');
          }
          return;
        }
      }

      setSentState(null);
      if (!acceptingNew) {
        setPhase('closed');
        return;
      }
      const profile = saved.profile ?? {};
      const hasProfile = Object.entries(profile).some(([k, v]) => k !== 'profile.idNo' && v && v.length > 0);
      // 先前送出的表單已失效（逾時或作廢）時，只帶入基本資料
      const draft = own?.submissionId ? {} : (own?.values ?? {});
      setPrefilled(hasProfile && Object.keys(draft).length === 0);
      replace({ ...profile, ...draft, 'profile.idNo': who });
      setPhase('filling');
    },
    [acceptingNew, replace, withoutImages],
  );

  // 同一分頁重新整理：憑證有效就直接續填
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resumeToken = session.get(RESUME_KEY);
      const saved = await localStore.resume(resumeToken, formId);
      if (cancelled) return;
      if (saved) {
        token.current = resumeToken;
        await enter(saved.owner, saved);
      } else {
        session.remove(RESUME_KEY);
        await localStore.purge();
        setPhase('gate');
      }
    })();
    return () => {
      cancelled = true;
    };
    // 只在載入時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    const id = idInput.toUpperCase().replace(/\s+/g, '');
    setIdInput(id);
    if (!id) {
      setIdError('請填寫身分證統一編號、統一證號或護照號碼');
      return;
    }
    setIdError('');
    setBusy(true);
    try {
      const saved = await localStore.open(id, formId);
      // 裝置換了填寫者：前一位送出的表單不能再從這個裝置存取
      if (saved.ownerChanged) await forgetDevice();
      token.current = saved.token;
      if (saved.token) session.set(RESUME_KEY, saved.token);
      await enter(id, saved);
      scrollToId('gate', 'start');
    } finally {
      setBusy(false);
    }
  }

  // 更換身分證號：畫面清空回到關卡，資料仍保留在裝置上，輸入不同號碼時才會清除
  function toGate() {
    flush();
    void localStore.release(token.current);
    session.remove(RESUME_KEY);
    token.current = null;
    ownerRef.current = null;
    setOwner(null);
    setSentState(null);
    setShowPublic(false);
    setIdInput('');
    replace({});
    setPhase('gate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function clearDevice() {
    if (!window.confirm('確定要清除此裝置上暫存的所有表單資料嗎？清除後無法復原。')) return;
    await localStore.clearAll();
    await forgetDevice();
    session.remove(RESUME_KEY);
    location.reload();
  }

  /* ---------- 送出、退回修改 ---------- */

  async function submit() {
    const errors = form.validateAll();
    const bad = Object.keys(errors);
    if (bad.length > 0) {
      showToast(`還有 ${bad.length} 個欄位需要填寫或確認`);
      scrollToId(`field-${bad[0]}`);
      return;
    }
    setBusy(true);
    try {
      const values = latest.current;
      const result =
        sent?.status === 'returned' ? await resubmitForm(sent.id, values) : await submitForm(formId, values);
      if (result.ok) {
        setSentState({ id: result.id, status: 'submitted', submittedAt: result.submittedAt });
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = null;
        // 裝置上只記下送出紀錄與基本資料；表單內容以伺服器為準
        const profile = Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith('profile.')));
        void localStore.save(owner!, formId, { values: {}, submissionId: result.id }, profile);
        setShowPublic(false);
        setPhase('done');
        showToast('已送出，謝謝您的填寫');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (result.reason === 'invalid' && result.errors) {
        form.setErrors(result.errors);
        const keys = Object.keys(result.errors);
        showToast(`還有 ${keys.length} 個欄位需要填寫或確認`);
        scrollToId(`field-${keys[0]}`);
      } else if (result.reason === 'not_open') {
        showToast('此表單目前未開放填寫，請洽櫃台醫護人員。');
      } else {
        showToast('無法更新先前送出的資料，請重新整理頁面後再試。');
      }
    } catch {
      showToast('網路連線不穩定，請稍後再按一次「確認送出」。');
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    if (!sent) return;
    const question = imageKeys.length > 0 ? '退回修改後，需要重新簽名才能再次送出。確定要修改嗎？' : '確定要退回修改嗎？';
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      const result = await returnForm(sent.id);
      if (result.ok) {
        const values = withoutImages(latest.current);
        replace(values);
        setSentState({ ...sent, status: 'returned' });
        persist(values);
        setShowPublic(false);
        setPhase('filling');
        scrollToId('gate', 'start');
      } else if (result.reason === 'locked') {
        setSentState({ ...sent, status: 'completed' });
        showToast('院所已完成填寫，無法退回修改。');
      } else {
        showToast('找不到這份資料，可能已超過 12 小時，請洽櫃台醫護人員。');
      }
    } catch {
      showToast('網路連線不穩定，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  // 完成畫面：隨時更新院所是否已確認送出（決定能否退回修改）
  const sentId = sent?.id;
  useEffect(() => {
    if (phase !== 'done' || !sentId) return;
    const refresh = async () => {
      const remote = await loadDeviceSubmission(sentId).catch(() => undefined);
      if (remote === undefined) return;
      if (remote === null) return;
      setSentState({ id: sentId, status: remote.status, submittedAt: remote.submittedAt });
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [phase, sentId]);

  /* ---------- 畫面 ---------- */

  const progress = useMemo(() => {
    if (phase === 'done') return { pct: 100, done: 0, total: 0 };
    if (phase !== 'filling') return { pct: 0, done: 0, total: 0 };
    const required = def.publicRules.filter((r) => r.required && form.ctx.holds(r.showIf));
    const errors = validateRules(required, form.values);
    const done = required.filter((r) => !errors[r.id]).length;
    return { pct: required.length ? Math.round((done / required.length) * 100) : 0, done, total: required.length };
  }, [phase, def, form.values, form.ctx]);

  const passed = phase === 'filling' || phase === 'closed';
  const shownId = passed ? (owner ?? '') : idInput;
  const idWarn = isTaiwanCitizenId(shownId) && !checkTwId(shownId).ok;
  const locked = sent?.status === 'completed';
  const v = form.values;
  const text = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '');

  return (
    <PublicChrome
      progress={progress.pct}
      foot={
        <button type="button" className="btn btn--ghost btn--mini" onClick={clearDevice}>
          清除此裝置上的暫存資料
        </button>
      }
    >
      {intro}

      <FormContext.Provider value={form.ctx}>
        {phase === 'loading' && (
          <section className="card" aria-busy="true">
            <p className="field__hint" style={{ margin: 0 }}>
              載入中…
            </p>
          </section>
        )}

        {(phase === 'gate' || passed) && (
          <section className="card gate" id="gate" aria-labelledby="gate-title">
            <header className="step__head">
              <span className="step__no" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8.5" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M5.8 16c.6-1.5 1.6-2.2 2.7-2.2s2.1.7 2.7 2.2M14 10h4.5M14 13.5h3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="step__titles">
                <h2 className="step__title" id="gate-title">
                  {passed ? '已確認身分' : '請先輸入身分證統一編號'}
                </h2>
                {!passed && (
                  <p className="step__desc">為保護個人資料，輸入相同的身分證號，才會帶出您先前在此裝置填寫的內容。</p>
                )}
              </div>
            </header>
            <div className={`field${idError ? ' is-invalid' : ''}`}>
              <div className="field__row">
                <label className="field__label" htmlFor="pf-id">
                  身分證統一編號 <span className="field__label-sub">（外籍人士請填統一證號）</span>
                </label>
                {passed && (
                  <button type="button" className="btn btn--soft btn--mini gate__change" onClick={toGate}>
                    更換
                  </button>
                )}
              </div>
              <input
                className="input input--code"
                id="pf-id"
                value={shownId}
                readOnly={passed}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-invalid={idError ? true : undefined}
                onChange={(e) => {
                  setIdInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                  if (idError) setIdError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && !passed) void start();
                }}
              />
              <p className="field__hint">共 10 碼，例：A123456789。無居留證的外籍人士請填護照號碼。</p>
              {idWarn && (
                <p className="field__warn">這個號碼的檢查碼與本國身分證規則不符，請再核對一次；確認無誤仍可繼續填寫。</p>
              )}
              {idError && (
                <p className="field__error" role="alert">
                  {idError}
                </p>
              )}
            </div>
            {!passed && (
              <button
                type="button"
                className="btn btn--primary btn--lg btn--block gate__start"
                disabled={busy}
                onClick={() => void start()}
              >
                開始填寫
              </button>
            )}
          </section>
        )}

        {phase === 'closed' && <ClosedCard message={closedMessage} period={closedPeriod} />}

        {phase === 'done' && sent && (
          <section className={`card done${locked ? ' done--locked' : ''}`} aria-labelledby="done-title">
            <div className="done__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="done__title" id="done-title">
              已完成送出
            </h2>
            <p className="done__text">請將此畫面出示給櫃台醫護人員。</p>
            {locked && (
              <p className="notice notice--warn">院所已完成填寫，資料已鎖定；如需修改，請洽櫃台醫護人員。</p>
            )}
            <dl className="done__summary">
              <dt>姓名</dt>
              <dd>{text('profile.name') || '—'}</dd>
              <dt>出生日期</dt>
              <dd>
                {text('profile.birthY')
                  ? `民國 ${text('profile.birthY')} 年 ${text('profile.birthM')} 月 ${text('profile.birthD')} 日`
                  : '—'}
              </dd>
              <dt>身分證號</dt>
              <dd>{maskIdNo(text('profile.idNo')) || '—'}</dd>
              <dt>送出時間</dt>
              <dd>{rocDateTime(sent.submittedAt)}</dd>
            </dl>
            <div className="done__actions">
              <button
                type="button"
                className="btn btn--ghost"
                aria-expanded={showPublic}
                onClick={() => setShowPublic((s) => !s)}
              >
                {showPublic ? '收合填寫內容' : '檢視填寫內容'}
              </button>
              <button type="button" className="btn btn--ghost" disabled={locked || busy} onClick={() => void unlock()}>
                退回修改
              </button>
            </div>
          </section>
        )}

        {phase === 'done' && showPublic && (
          <fieldset className="public" disabled style={{ opacity: 0.92 }}>
            <legend className="sr-only">填寫內容</legend>
            <ui.Public prefilled={false} />
          </fieldset>
        )}

        {phase === 'filling' && (
          <>
            {sent?.status === 'returned' && (
              <p className="notice notice--warn">
                退回修改中：修改完成後{imageKeys.length > 0 ? '請重新簽名，' : ''}再按「確認送出」。
              </p>
            )}
            <fieldset className="public">
              <legend className="sr-only">民眾填寫</legend>
              <ui.Public prefilled={prefilled} />
            </fieldset>
            <div className="submitbar">
              <p className="submitbar__progress">
                已完成 {progress.done} / {progress.total} 項
              </p>
              <button
                type="button"
                className="btn btn--primary btn--lg btn--block"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? '送出中…' : '確認送出'}
              </button>
              <p className="submitbar__note">送出後，將由醫護人員接續填寫院所資料。</p>
            </div>
          </>
        )}
      </FormContext.Provider>

      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </PublicChrome>
  );
}
