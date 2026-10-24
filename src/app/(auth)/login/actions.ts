'use server';

import { redirect } from 'next/navigation';
import { requestMeta, setSessionCookie } from '@/lib/auth/cookies';
import { loginSuperadminWithPassword } from '@/lib/auth/service';
import { createSession } from '@/lib/auth/session';

export type PasswordLoginState = { error?: string; username?: string };

const ERRORS = {
  invalid: '帳號或密碼錯誤。',
  already_bound: '最高管理者已綁定 Google 帳號，請改用「使用 Google 登入」。',
  not_configured: '尚未設定管理者帳密（.env 的 ADMIN_USERNAME、ADMIN_PASSWORD_HASH）。',
};

export async function loginWithPassword(_prev: PasswordLoginState, formData: FormData): Promise<PasswordLoginState> {
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!username.trim() || !password) return { error: '請輸入帳號與密碼。', username };

  const result = await loginSuperadminWithPassword(username, password);
  if (!result.ok) return { error: ERRORS[result.reason], username };

  // 帳密只換得 10 分鐘的綁定用 session，必須完成 Google 綁定才能進入後台
  const session = await createSession(result.userId, 'bind_google', await requestMeta());
  await setSessionCookie(session.token, session.expiresAt);
  redirect('/bind-google');
}
