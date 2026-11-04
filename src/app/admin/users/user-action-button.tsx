'use client';

import { useFormStatus } from 'react-dom';
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
  return (
    <form action={updateUser}>
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
