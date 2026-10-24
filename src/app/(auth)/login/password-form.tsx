'use client';

import { useActionState } from 'react';
import styles from '../auth.module.css';
import { loginWithPassword } from './actions';

export function PasswordForm() {
  const [state, action, pending] = useActionState(loginWithPassword, {});

  return (
    <form action={action} className={styles.form}>
      <p className={styles.hint}>只用於第一次登入。驗證後須綁定 Google 帳號，之後帳密登入即停用。</p>
      <div>
        <label className="label" htmlFor="admin-username">
          帳號
        </label>
        <input
          className="input"
          id="admin-username"
          name="username"
          autoComplete="username"
          defaultValue={state.username}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="admin-password">
          密碼
        </label>
        <input
          className="input"
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && (
        <p className="notice notice--error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? '驗證中…' : '登入並綁定 Google'}
      </button>
    </form>
  );
}
