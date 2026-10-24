import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { readSessionToken } from './cookies';
import { validateSession } from './session';

/** 後台首頁：表單管理 */
export const ADMIN_HOME = '/admin/forms';

/** 目前請求的 session；同一次渲染只查一次資料庫 */
export const getSession = cache(async () => {
  const token = await readSessionToken();
  return token ? validateSession(token) : null;
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;

/** 需要正式登入：未登入導向登入頁，綁定中導向綁定頁 */
export async function requireUser() {
  const current = await getSession();
  if (!current) redirect('/login');
  if (current.session.purpose === 'bind_google') redirect('/bind-google');

  const { id, role, name, email, avatarUrl } = current.user;
  return { id, role, name, email, avatarUrl };
}

/** 需要管理者（最高管理者或管理者）權限 */
export async function requireManager() {
  const user = await requireUser();
  if (user.role === 'staff') redirect(ADMIN_HOME);
  return user;
}

/** 綁定頁：只有帳密驗證通過、尚未綁定的最高管理者能進入 */
export async function requireBindSession() {
  const current = await getSession();
  if (!current) redirect('/login');
  if (current.session.purpose === 'full') redirect(ADMIN_HOME);
  return current.session;
}
