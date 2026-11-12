'use client';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { FormContext } from '@/components/forms/context';
import { PrintDocumentButton } from '@/components/forms/print-document-button';
import { useFormState } from '@/components/forms/use-form-state';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { useResultModal } from '@/components/feedback/result-modal';
import { BackLink } from '@/components/navigation/back-control';
import type { FormValues, SubmissionStatus } from '@/db/schema';
import { LaborPublic } from '@/forms/labor/public';
import { APPOINTMENT_PUBLIC_PATH } from '@/lib/appointments/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { laborUploadOnSet } from '@/lib/forms/defs/labor-upload';
import { PUBLIC_CAPTCHA_ACTIONS as ACTION, type PublicCaptchaConfig } from '@/lib/security/public-protection';
import { PublicChrome } from '../../[formId]/chrome';
import { appointmentDraft } from '../../[formId]/local-store';
import { editAppointmentIntake, refreshAppointment, submitAppointmentIntake } from '../actions';
import styles from '../appointment.module.css';
import { useAppointmentRequest } from '../use-appointment-request';

const def = getFormDef('labor')!;
type Intake = { values: FormValues; status: SubmissionStatus; version: number };
function withoutSignatures(values: FormValues): FormValues {
  return { ...values, 'labor.uploadSignature': '', 'labor.uploadRepresentativeSignature': '' };
}
function focusInvalidField(rule: string) {
  const field = document.getElementById(`field-${rule}`);
  const control = field?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
  control?.focus({ preventScroll: true });
  field?.scrollIntoView({ block: 'center' });
}

export function AppointmentIntake({ id, identity, intake, editable: initialEditable, captcha }: {
  id: string; identity: FormValues; intake: Intake | null; editable: boolean; captcha: PublicCaptchaConfig;
}) {
  const [version, setVersion] = useState(intake?.version ?? null);
  const [status, setStatus] = useState(intake?.status ?? 'draft');
  const [editable, setEditable] = useState(initialEditable);
  const { message, error, request, setError } = useAppointmentRequest(captcha);
  const [feedbackAttempt, setFeedbackAttempt] = useState(0);
  const showResult = useResultModal();
  const canFill = editable && (status === 'draft' || status === 'returned');
  const changed = useRef(false);
  const form = useFormState(def, {
    ...(intake?.status === 'returned' ? withoutSignatures(intake.values) : intake?.values), ...identity,
  }, {
    rules: def.publicRules,
    readOnly: !canFill,
    onSet: laborUploadOnSet,
    onChange: (values) => {
      changed.current = true;
      if (canFill) void appointmentDraft.save(id, version, values);
    },
  });
  const { replace } = form;
  const invalidRules = Object.keys(form.errors);
  useEffect(() => {
    if (!canFill) return;
    let active = true;
    void appointmentDraft.load(id, version).then((draft) => {
      if (active && !changed.current && draft) replace({ ...draft, ...identity });
    });
    return () => { active = false; };
  }, [canFill, id, identity, replace, version]);
  useEffect(() => {
    if (message) return;
    let active = true;
    const checkAccess = () => {
      // 背景核對權限，不顯示遮罩。連線錯誤時保留畫面，寫入仍由伺服器重新驗證。
      void refreshAppointment(id).then((result) => {
        if (!active || (result.ok && result.booking.canManage && result.booking.status !== 'cancelled')) return;
        void appointmentDraft.clear(id);
        replace({});
        window.location.replace(APPOINTMENT_PUBLIC_PATH);
      }).catch(() => {});
    };
    window.addEventListener('focus', checkAccess);
    return () => { active = false; window.removeEventListener('focus', checkAccess); };
  }, [id, message, replace]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canFill || message) return;
    setError(null);
    const invalid = Object.keys(form.validateAll());
    if (invalid.length) {
      setFeedbackAttempt((attempt) => attempt + 1);
      showResult({ title: '表單尚未送出', tone: 'warning',
        message: `還有 ${invalid.length} 個欄位需要填寫或確認，請修正後再送出。`,
        confirmLabel: '前往修正', onClose: () => focusInvalidField(invalid[0]) });
      return;
    }
    setFeedbackAttempt(0);
    const result = await request('正在送出勞工健康檢查表…', (token) => submitAppointmentIntake(id, version, form.latest.current, token),
      version === null ? ACTION.submit : ACTION.resubmit);
    if (result?.ok) {
      setStatus('submitted');
      setVersion(result.version);
      setEditable(result.editable);
      void appointmentDraft.clear(id);
      window.scrollTo({ top: 0 });
      showResult({ title: '健檢表已送出', tone: 'success', message: '已收到您的勞工健康檢查表，將由院所人員核對健檢內容與預約資料。' });
    } else {
      if (result && 'errors' in result && result.errors) form.setErrors(result.errors);
      setFeedbackAttempt((attempt) => attempt + 1);
      if (result) {
        const invalid = 'errors' in result && result.errors ? Object.keys(result.errors) : [];
        showResult({ title: '表單尚未送出', tone: 'error', message: result.message,
          confirmLabel: invalid.length ? '前往修正' : '確定',
          onClose: invalid.length ? () => focusInvalidField(invalid[0]) : undefined });
      }
    }
  }

  async function edit() {
    if (!editable || status !== 'submitted' || version === null) return;
    const result = await request('正在退回修改…', (token) => editAppointmentIntake(id, version, token), ACTION.return);
    if (!result?.ok) {
      if (result) showResult({ title: '退回修改未完成', tone: 'error', message: result.message });
      return;
    }
    const values = withoutSignatures(form.latest.current);
    changed.current = true;
    replace(values);
    setStatus('returned');
    setVersion(result.version);
    setEditable(result.editable);
    if (result.editable) void appointmentDraft.save(id, result.version, values);
    showResult({ title: '已退回修改', tone: 'success', message: '請修改內容，並重新完成適用的同意書簽名後再次送出。' });
  }

  return <PublicChrome progress={canFill ? 50 : 100}
    navigation={<BackLink prefetch={false} href={APPOINTMENT_PUBLIC_PATH}>返回預約</BackLink>}>
    {message && <LoadingOverlay message={message} />}
    <header className={styles.heading}><div>
      <h1>勞工健康檢查表</h1>
      <p>這份表單會與目前的健檢預約一起送交院所。</p>
    </div></header>
    {(status === 'submitted' || status === 'completed' || (!canFill && !!error)) && <section className="card">
      <div className={styles.actions}>
        {(status === 'submitted' || status === 'completed') && <PrintDocumentButton
          href={`${APPOINTMENT_PUBLIC_PATH}/form/print?booking=${id}`}>列印 / 另存 PDF</PrintDocumentButton>}
        {status === 'submitted' && editable && <button className="btn btn--ghost" type="button" onClick={() => void edit()}>退回修改</button>}
      </div>
      {status === 'submitted' && <p role="status" className="notice notice--info">勞工健康檢查表已送出。</p>}
      {!canFill && error && <p className="notice notice--error" role="alert">{error}</p>}
    </section>}
    <form onSubmit={submit} noValidate>
      <fieldset disabled={!!message} className={styles.intake} aria-label="勞工健康檢查表">
        <FormContext.Provider value={form.ctx}><LaborPublic prefilled={false} identityLocked /></FormContext.Provider>
        {canFill && <div className="submitbar">
          {(error || (feedbackAttempt > 0 && invalidRules.length > 0)) && <div
            className="notice notice--error" role="alert" tabIndex={-1}>
            <strong className="notice__title">表單尚未送出</strong>
            <span>{invalidRules.length > 0 ? `還有 ${invalidRules.length} 個欄位需要填寫或確認，請依紅色提示修正後再送出。` : error}</span>
            {invalidRules.length > 0 && <button className={styles.errorLink} type="button"
              onClick={() => focusInvalidField(invalidRules[0])}>前往第一個需確認的欄位</button>}
          </div>}
          <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={!!message}>
            {message ? '送出中…' : '送出勞工健康檢查表'}
          </button>
          <p className="submitbar__note">送出後，將由院所人員核對健檢內容與預約資料。</p>
        </div>}
      </fieldset>
    </form>
  </PublicChrome>;
}
