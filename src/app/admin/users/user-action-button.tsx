'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { ActionResultModal } from '@/components/feedback/result-modal';
import { updateUser } from './actions';
import { FormPending } from '../pending-ui';

type Props = {
  userId: string;
  action: string;
  label: string;
  variant: 'primary' | 'ghost' | 'danger';
  confirmText?: string;
};

export function UserActionButton({ userId, action, label, variant, confirmText }: Props) {
  const [state, submit, pending] = useActionState(updateUser, {});
  return (
    <form action={submit}>
      <ActionResultModal state={state} pending={pending} refreshOnSuccess successTitle="使用者資料已更新" successMessage={`已完成「${label}」。`} />
      <FormPending />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton label={label} variant={variant} confirmText={confirmText} />
    </form>
  );
}

function SubmitButton({ label, variant, confirmText }: Pick<Props, 'label' | 'variant' | 'confirmText'>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn btn--sm btn--${variant}`}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? '處理中…' : label}
    </button>
  );
}
