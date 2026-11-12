'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormContext } from '@/components/forms/context';
import { IdentityFields } from '@/components/forms/identity-fields';
import { PrintDocumentButton } from '@/components/forms/print-document-button';
import { useFormState } from '@/components/forms/use-form-state';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { usePublicRequest } from '@/components/loading/use-public-request';
import { type ResultMessage, useResultModal } from '@/components/feedback/result-modal';
import { preloadCaptchaScript, requestCaptchaToken } from '@/lib/security/recaptcha-client';
import { PUBLIC_CAPTCHA_ACTIONS, type PublicCaptchaConfig, PublicRequestError, VERIFICATION_MESSAGES } from '@/lib/security/public-protection';
import type { FormValues, SubmissionStatus } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { validateRules } from '@/lib/forms/engine';
import { maskIdNo } from '@/lib/forms/format';
import { identityError, isIdentityType, type IdentityType, normalizeIdentityNumber } from '@/lib/forms/identity';
import { toTaipeiInput } from '@/lib/time';
import { newSubmissionRequestId } from '@/lib/submissions/request-id';
import { getFormUi } from '@/forms/registry';
import { forgetDevice, loadDeviceSubmission, recoverDeviceSubmission, resubmitForm, returnForm, submitForm } from './actions';
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
  captcha,
  acceptingNew,
  closedMessage,
  closedPeriod,
  intro,
}: {
  formId: FormId;
  captcha: PublicCaptchaConfig;
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
  const [idType, setIdType] = useState<IdentityType>('national_id');
  const [idError, setIdError] = useState('');
  const [sent, setSent] = useState<Sent | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [showPublic, setShowPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const showResult = useResultModal();
  const { message: pendingMessage, run: runRequest } = usePublicRequest();
  const starting = useRef(false);

  const token = useRef<string | null>(null);
  const ownerRef = useRef<string | null>(null);
  const sentRef = useRef<Sent | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const submitting = useRef(false);
  const statusGeneration = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    preloadCaptchaScript(captcha);
  }, [captcha]);

  const imageKeys = useMemo(
    () => Object.keys(def.fields).filter((k) => def.fields[k].part === 'public' && def.fields[k].kind === 'image'),
    [def],
  );

  const showFeedback = useCallback((message: string, tone: ResultMessage['tone'] = 'error', onClose?: () => void) => {
    showResult({ title: tone === 'success' ? '操作完成' : tone === 'warning' ? '請確認填寫內容' : '操作未完成',
      message, tone, onClose, confirmLabel: onClose ? '前往修正' : '確定' });
  }, [showResult]);

  /* ---------- 裝置暫存 ---------- */

  const persist = useCallback(
    (values: FormValues) => {
      const who = ownerRef.current;
      if (!who) return;
      const profile: FormValues = {};
      const own: FormValues = {};
      for (const [k, v] of Object.entries(values)) (k.startsWith('profile.') ? profile : own)[k] = v;
      void localStore.save(who, formId, { values: own, submissionId: sentRef.current?.id, requestId: requestIdRef.current ?? undefined }, profile);
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
    async (who: string, saved: Loaded, selectedType?: IdentityType) => {
      const type = selectedType ?? saved.profile?.['profile.idType'];
      if (!isIdentityType(type) || identityError(type, who)) {
        setIdInput(who);
        if (isIdentityType(type)) setIdType(type);
        setPhase('gate');
        return;
      }
      setIdType(type);
      ownerRef.current = who;
      setOwner(who);
      const own = saved.form;
      requestIdRef.current = own?.requestId ?? null;
      const knownId = own?.submissionId ?? own?.requestId;
      const remote = await runRequest('讀取表單中，請稍候…', async () => {
        const known = knownId ? await loadDeviceSubmission(knownId, formId) : null;
        return known ?? await recoverDeviceSubmission(formId, who);
      });
      if (remote) {
        const remoteType = remote.publicData['profile.idType'];
        const confirmedType = isIdentityType(remoteType) ? remoteType : type;
        setIdType(confirmedType);
        setSentState({ id: remote.id, status: remote.status, submittedAt: remote.submittedAt });
        if (remote.status === 'returned') {
          // 退回修改中：以裝置上正在修改的內容為主
          const editing = Object.keys(own?.values ?? {}).length > 0;
          replace({ ...withoutImages(remote.publicData), ...(editing ? own?.values : {}), 'profile.idNo': who, 'profile.idType': confirmedType });
          setPhase('filling');
        } else {
          replace({ ...remote.publicData, 'profile.idType': confirmedType });
          setPhase('done');
        }
        await localStore.save(who, formId, {
          values: remote.status === 'returned' ? latest.current : {}, submissionId: remote.id,
        }, { 'profile.idType': confirmedType, 'profile.idNo': who });
        requestIdRef.current = null;
        return;
      }

      setSentState(null);
      if (!acceptingNew) {
        setPhase('closed');
        return;
      }
      const profile = saved.profile ?? {};
      const hasProfile = Object.entries(profile).some(([k, v]) => !['profile.idNo', 'profile.idType'].includes(k) && v && v.length > 0);
      // 先前送出的表單已失效（逾時或作廢）時，只帶入基本資料
      const draft = own?.submissionId ? {} : (own?.values ?? {});
      setPrefilled(hasProfile && Object.keys(draft).length === 0);
      replace({ ...profile, ...draft, 'profile.idNo': who, 'profile.idType': type });
      persist(latest.current);
      setPhase('filling');
    },
    [acceptingNew, formId, latest, replace, withoutImages, runRequest, persist],
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
        try { await enter(saved.owner, saved); }
        catch (error) {
          if (!cancelled) {
            setIdInput(saved.owner);
            setPhase('gate');
            showFeedback(error instanceof PublicRequestError ? error.message : '無法讀取表單，請稍後重試。');
          }
        }
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
    if (starting.current) return;
    const id = normalizeIdentityNumber(idInput);
    setIdInput(id);
    const error = identityError(idType, id);
    if (error) {
      setIdError(error);
      showFeedback(error, 'warning', () => document.getElementById('pf-id')?.focus());
      return;
    }
    setIdError('');
    starting.current = true;
    setBusy(true);
    try {
      const saved = await localStore.open(id, formId);
      // 裝置換了填寫者：前一位送出的表單不能再從這個裝置存取
      if (saved.ownerChanged) {
        await runRequest('切換填寫者中，請稍候…', () => forgetDevice());
      }
      token.current = saved.token;
      if (saved.token) session.set(RESUME_KEY, saved.token);
      await enter(id, saved, idType);
      scrollToId('gate', 'start');
    } catch (error) {
      showFeedback(error instanceof PublicRequestError ? error.message : '無法讀取表單，請稍後重試。');
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }

  // 更換身分證號：畫面清空回到關卡，資料仍保留在裝置上，輸入不同號碼時才會清除
  function toGate() {
    statusGeneration.current += 1;
    flush();
    void localStore.release(token.current);
    session.remove(RESUME_KEY);
    token.current = null;
    ownerRef.current = null;
    setOwner(null);
    setSentState(null);
    requestIdRef.current = null;
    setShowPublic(false);
    setIdInput('');
    replace({});
    setPhase('gate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function clearDevice() {
    if (busy) return;
    if (!window.confirm('確定要清除此裝置上暫存的所有表單資料嗎？清除後無法復原。')) return;
    setBusy(true);
    try {
      await localStore.clearAll();
      await runRequest('清除裝置連線中，請稍候…', () => forgetDevice());
      session.remove(RESUME_KEY);
      showResult({ title: '暫存資料已清除', tone: 'success', message: '此裝置的表單暫存資料已清除。', onClose: () => location.reload() });
    } catch (error) {
      showFeedback(error instanceof PublicRequestError ? error.message : '無法清除裝置連線，請稍後重試。');
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 送出、退回修改 ---------- */

  async function submit() {
    if (submitting.current) return;
    const errors = form.validateAll();
    const bad = Object.keys(errors);
    if (bad.length > 0) {
      showFeedback(`還有 ${bad.length} 個欄位需要填寫或確認`, 'warning', () => scrollToId(`field-${bad[0]}`));
      return;
    }
    submitting.current = true;
    statusGeneration.current += 1;
    setBusy(true);
    try {
      const values = latest.current;
      const original = sentRef.current;
      const profile = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('profile.')));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (!original) requestIdRef.current ??= newSubmissionRequestId();
      // 寫入前先保存案件／請求編號，回應遺失、重新整理後也能重試同一份。
      await localStore.save(owner!, formId, {
        values, submissionId: original?.id, requestId: requestIdRef.current ?? undefined,
      }, profile);
      const result = await runRequest('安全驗證與送出中，請稍候…', async () => {
        const captchaToken = await requestCaptchaToken(captcha, original ? PUBLIC_CAPTCHA_ACTIONS.resubmit : PUBLIC_CAPTCHA_ACTIONS.submit);
        return original
          ? resubmitForm(original.id, values, original.submittedAt, captchaToken)
          : submitForm(formId, values, requestIdRef.current!, captchaToken);
      });
      if (result.ok) {
        setSentState({ id: result.id, status: result.status, submittedAt: result.submittedAt });
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = null;
        // 裝置上只記下送出紀錄與基本資料；表單內容以伺服器為準
        const editingAgain = result.status === 'returned';
        const draft = editingAgain ? withoutImages(values) : {};
        if (editingAgain) replace(draft);
        await localStore.save(owner!, formId, { values: draft, submissionId: result.id }, profile);
        requestIdRef.current = null;
        setShowPublic(false);
        setPhase(editingAgain ? 'filling' : 'done');
        showFeedback(editingAgain ? `表單已再次退回修改，請確認內容${imageKeys.length > 0 ? '並重新簽名' : ''}後送出。` : '已送出，謝謝您的填寫', editingAgain ? 'warning' : 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (result.reason === 'verification_failed' || result.reason === 'verification_unavailable') {
        showFeedback(VERIFICATION_MESSAGES[result.reason]);
      } else if (result.reason === 'invalid' && result.errors) {
        form.setErrors(result.errors);
        const keys = Object.keys(result.errors);
        showFeedback(`還有 ${keys.length} 個欄位需要填寫或確認`, 'warning', () => scrollToId(`field-${keys[0]}`));
      } else if (result.reason === 'not_open') {
        showFeedback('此表單目前未開放填寫，請洽櫃台醫護人員。');
      } else if (result.reason === 'ambiguous') {
        showFeedback('目前有多份尚未完成的相同表單，請洽櫃台人員確認；系統不會自動覆蓋。');
      } else if (result.reason === 'not_returned') {
        showFeedback('這份資料已送出或由院所鎖定；請重新整理後，從原表單「退回修改」。');
      } else if (result.reason === 'conflict') {
        showFeedback('這份表單已再次更新，請重新整理後確認最新內容；目前填寫內容已暫存。');
      } else {
        showFeedback('無法更新先前送出的資料，請重新整理頁面後再試。');
      }
    } catch (error) {
      showFeedback(error instanceof PublicRequestError ? error.message : '網路連線不穩定，請稍後再按一次「確認送出」。');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function unlock() {
    if (!sent || submitting.current) return;
    const question = imageKeys.length > 0 ? '退回修改後，需要重新簽名才能再次送出。確定要修改嗎？' : '確定要退回修改嗎？';
    if (!window.confirm(question)) return;
    submitting.current = true;
    statusGeneration.current += 1;
    setBusy(true);
    try {
      const result = await runRequest('安全驗證與退回修改中，請稍候…', async () => {
        const captchaToken = await requestCaptchaToken(captcha, PUBLIC_CAPTCHA_ACTIONS.return);
        return returnForm(sent.id, captchaToken);
      });
      if (result.ok) {
        const values = withoutImages(latest.current);
        replace(values);
        setSentState({ ...sent, status: 'returned' });
        persist(values);
        setShowPublic(false);
        setPhase('filling');
        scrollToId('gate', 'start');
        showFeedback('表單已退回修改，請完成內容與適用的簽名後再次送出。', 'success');
      } else if (result.reason === 'verification_failed' || result.reason === 'verification_unavailable') {
        showFeedback(VERIFICATION_MESSAGES[result.reason]);
      } else if (result.reason === 'locked') {
        setSentState({ ...sent, status: 'completed' });
        showFeedback('院所已完成填寫，無法退回修改。');
      } else {
        showFeedback('找不到這份資料，可能已超過 12 小時，請洽櫃台醫護人員。');
      }
    } catch (error) {
      showFeedback(error instanceof PublicRequestError ? error.message : '網路連線不穩定，請稍後再試。');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  // 完成畫面：隨時更新院所是否已確認送出（決定能否退回修改）
  const sentId = sent?.id;
  useEffect(() => {
    if (phase !== 'done' || !sentId) return;
    let cancelled = false;
    const refresh = async () => {
      const generation = statusGeneration.current;
      const remote = await loadDeviceSubmission(sentId, formId).catch(() => undefined);
      if (cancelled || generation !== statusGeneration.current || sentRef.current?.id !== sentId) return;
      if (remote === undefined) return;
      if (remote === null) return;
      setSentState({ id: sentId, status: remote.status, submittedAt: remote.submittedAt });
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; window.removeEventListener('focus', refresh); };
  }, [phase, sentId, formId]);

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
  const locked = sent?.status === 'completed';
  const v = form.values;
  const text = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '');

  return (
    <PublicChrome
      progress={progress.pct}
      welcome={phase === 'gate'}
      foot={
        <button type="button" className="btn btn--ghost btn--mini" disabled={busy} onClick={clearDevice}>
          清除此裝置上的暫存資料
        </button>
      }
    >
      {intro}
      {pendingMessage && <LoadingOverlay message={pendingMessage} />}
      {captcha.mode === 'unavailable' && <p className="notice notice--error" role="alert">目前安全驗證暫時無法使用，請稍後重試或洽院所人員。已填內容會保留。</p>}
      {captcha.mode === 'development-bypass' && <p className="notice">本機開發模式：已略過人機驗證，正式環境不會使用此模式。</p>}

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
                  {passed ? '已確認證件資料' : '請先選擇證件種類並輸入號碼'}
                </h2>
                {!passed && (
                  <p className="step__desc">輸入相同的證件號碼，才會帶出您先前在此裝置填寫的內容。</p>
                )}
              </div>
            </header>
            <IdentityFields inputId="pf-id" type={idType} value={shownId} readOnly={passed} disabled={busy} error={idError}
              onTypeChange={(type) => { setIdType(type); setIdError(''); }}
              onNumberChange={(value) => { setIdInput(value); setIdError(''); }} onEnter={() => void start()}
              action={passed ? (
                  <button type="button" className="btn btn--soft btn--mini gate__change" disabled={busy} onClick={toGate}>
                    更換
                  </button>
              ) : undefined} />
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
              <p className="notice notice--warn">院所已完成{formId === 'labor' ? '確認' : '填寫'}，資料已鎖定；如需修改，請洽櫃台醫護人員。</p>
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
              <PrintDocumentButton className="btn btn--primary done__print" href={`/f/${formId}/print/${sent.id}`}>
                列印 / 另存 PDF
              </PrintDocumentButton>
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
            <fieldset className="public" disabled={busy}>
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
              <p className="submitbar__note">{formId === 'labor' ? '送出後，將由醫護人員核對問卷內容。' : '送出後，將由醫護人員接續填寫院所資料。'}</p>
              {captcha.mode === 'required' && <p className="submitbar__note">本網站使用 reCAPTCHA 防護，送出時將進行安全驗證。</p>}
            </div>
          </>
        )}
      </FormContext.Provider>

    </PublicChrome>
  );
}
