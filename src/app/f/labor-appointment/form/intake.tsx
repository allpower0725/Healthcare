'use client';
import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { FormContext } from '@/components/forms/context';
import { PrintDocumentButton } from '@/components/forms/print-document-button';
import { useFormState } from '@/components/forms/use-form-state';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
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
function scrollToError() {
  requestAnimationFrame(() => document.querySelector('.field.is-invalid')?.scrollIntoView({ block: 'center' }));
}

export function AppointmentIntake({ id, identity, intake, editable: initialEditable, captcha }: {
  id: string; identity: FormValues; intake: Intake | null; editable: boolean; captcha: PublicCaptchaConfig;
}) {
  const [version, setVersion] = useState(intake?.version ?? null);
  const [status, setStatus] = useState(intake?.status ?? 'draft');
  const [editable, setEditable] = useState(initialEditable);
  const { message, error, request } = useAppointmentRequest(captcha);
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
    if (!canFill) return;
    if (Object.keys(form.validateAll()).length) { scrollToError(); return; }
    const result = await request('正在送出勞工健康檢查表…', (token) => submitAppointmentIntake(id, version, form.latest.current, token),
      version === null ? ACTION.submit : ACTION.resubmit);
    if (result?.ok) {
      setStatus('submitted');
      setVersion(result.version);
      setEditable(result.editable);
      void appointmentDraft.clear(id);
      window.scrollTo({ top: 0 });
    } else if (result && 'errors' in result && result.errors) {
      form.setErrors(result.errors);
      scrollToError();
    }
  }

  async function edit() {
    if (!editable || status !== 'submitted' || version === null) return;
    const result = await request('正在退回修改…', (token) => editAppointmentIntake(id, version, token), ACTION.return);
    if (!result?.ok) return;
    const values = withoutSignatures(form.latest.current);
    changed.current = true;
    replace(values);
    setStatus('returned');
    setVersion(result.version);
    setEditable(result.editable);
    if (result.editable) void appointmentDraft.save(id, result.version, values);
  }

  return <PublicChrome progress={canFill ? 50 : 100}>
    {message && <LoadingOverlay message={message} />}
    <header className={styles.heading}><div>
      <h1>勞工健康檢查表</h1>
      <p>這份表單會與目前的健檢預約一起送交院所。</p>
    </div></header>
    <section className="card">
      <div className={styles.actions}>
        <Link className="btn btn--ghost" prefetch={false} href={APPOINTMENT_PUBLIC_PATH}>← 返回預約</Link>
        {(status === 'submitted' || status === 'completed') && <PrintDocumentButton
          href={`${APPOINTMENT_PUBLIC_PATH}/form/print?booking=${id}`}>列印 / 另存 PDF</PrintDocumentButton>}
        {status === 'submitted' && editable && <button className="btn btn--ghost" type="button" onClick={() => void edit()}>退回修改</button>}
      </div>
      {status === 'submitted' && <p role="status" className="notice">勞工健康檢查表已送出。</p>}
      {error && <p className="notice notice--error" role="alert">{error}</p>}
    </section>
    <form onSubmit={submit} noValidate>
      <fieldset disabled={!!message} className={styles.intake} aria-label="勞工健康檢查表">
        <FormContext.Provider value={form.ctx}><LaborPublic prefilled={false} identityLocked /></FormContext.Provider>
        {canFill && <button className="btn btn--primary" type="submit">送出勞工健康檢查表</button>}
      </fieldset>
    </form>
  </PublicChrome>;
}
