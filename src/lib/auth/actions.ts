'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie, readSessionToken } from './cookies';
import { deleteSession } from './session';

export async function logout() {
  const token = await readSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect('/login?notice=signed_out');
}
