'use client';

import { useActionState } from 'react';
import { LoadingOverlay } from '../loading-overlay';
import { confirmAppointmentAction } from './appointment-actions';
import styles from './submissions.module.css';

export function AppointmentConfirm({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(confirmAppointmentAction.bind(null, id), {});

  return (
    <form action={action} className={styles.appointmentConfirm}>
      {pending && <LoadingOverlay message="確認預約中，請稍候…" />}
      {state.error && <p className="notice notice--error" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn--primary" disabled={blocked || pending}>
        {pending ? '確認中…' : '確認預約'}
      </button>
    </form>
  );
}
