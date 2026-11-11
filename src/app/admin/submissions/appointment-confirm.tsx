'use client';

import { useActionState } from 'react';
import { LoadingOverlay } from '../loading-overlay';
import { confirmAppointmentAction } from './appointment-actions';
import styles from './submissions.module.css';
import { ActionResultModal } from '@/components/feedback/result-modal';

export function AppointmentConfirm({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(confirmAppointmentAction.bind(null, id), {});

  return (
    <form action={action} className={styles.appointmentConfirm}>
      {pending && <LoadingOverlay message="確認預約中，請稍候…" />}
      <ActionResultModal state={state} pending={pending} refreshOnSuccess successTitle="預約已確認" successMessage="已完成院所確認，這筆健檢預約已成立。" />
      {state.error && <p className="notice notice--error" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn--primary" disabled={blocked || pending}>
        {pending ? '確認中…' : '確認預約'}
      </button>
    </form>
  );
}
