import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { lt, lte, or, sql } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import { appointmentAttemptLimits } from '@/db/schema';
import { secureCookies } from '@/lib/auth/cookies';
import { APPOINTMENT_PUBLIC_PATH } from './catalog';
import { identityError, type IdentityType } from '@/lib/forms/identity';

export type AppointmentIdentity = { idType: IdentityType; idNo: string; birthDate: string };
export type AppointmentGate = AppointmentIdentity & { requestId: string; appointmentId?: string; expiresAt: number };
const GATE = 'hc_appointment';
const DEVICE = 'hc_appointment_device';
const TTL = 12 * 60 * 60;
const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: APPOINTMENT_PUBLIC_PATH } as const;

function key(purpose: string) {
  const secret = process.env.APPOINTMENT_SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? createHmac('sha256', secret).update(purpose).digest() : null;
}

export function appointmentAccessConfigured() {
  return !!key('appointment-gate');
}

export async function readAppointmentAccess() {
  const jar = await cookies();
  const token = jar.get(DEVICE)?.value;
  const device = token && /^[\w-]{43}$/.test(token) ? token : null;
  const secret = key('appointment-gate');
  const raw = jar.get(GATE)?.value;
  if (!device || !secret || !raw || raw.length > 1000) return { device, gate: null };
  try {
    const bytes = Buffer.from(raw, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(device));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const gate = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as AppointmentGate;
    return { device, gate: gate.expiresAt > Date.now() && !identityError(gate.idType, gate.idNo) ? gate : null };
  } catch {
    return { device, gate: null };
  }
}

export async function writeAppointmentAccess(gate: Omit<AppointmentGate, 'expiresAt'>, currentDevice: string | null) {
  const secret = key('appointment-gate');
  if (!secret) throw new Error('Appointment access unavailable');
  const device = currentDevice ?? randomBytes(32).toString('base64url');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  cipher.setAAD(Buffer.from(device));
  const data = cipher.update(JSON.stringify({ ...gate, expiresAt: Date.now() + TTL * 1000 }));
  const raw = Buffer.concat([iv, Buffer.alloc(16), data, cipher.final()]);
  cipher.getAuthTag().copy(raw, 12);
  const jar = await cookies();
  jar.set(DEVICE, device, { ...COOKIE_OPTIONS, maxAge: 365 * 24 * 60 * 60 });
  jar.set(GATE, raw.toString('base64url'), { ...COOKIE_OPTIONS, maxAge: TTL });
}

export async function clearAppointmentAccess() {
  (await cookies()).set(GATE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

export function appointmentDeviceHash(device: string | null, id: string) {
  const secret = key('appointment-code');
  if (!device || !secret) return null;
  // 沿用已儲存的雜湊格式，讓既有預約仍可由原瀏覽器管理。
  const proof = createHmac('sha256', secret).update(device).update(id).digest().subarray(0, 18).toString('base64url');
  return createHash('sha256').update(proof).digest('hex');
}

export function matchesAppointmentDevice(device: string | null, id: string, storedHash: string | null) {
  const hash = appointmentDeviceHash(device, id);
  return !!hash && !!storedHash && /^[a-f0-9]{64}$/.test(storedHash)
    && timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

type AttemptGroup = 'lookup' | 'write' | 'count';
export async function allowAppointmentAttempt(group: AttemptGroup, idNo: string, now = new Date()) {
  const secret = key('appointment-rate-limit');
  if (!secret) return false;
  const forwarded = process.env.VERCEL ? (await headers()).get('x-vercel-forwarded-for')?.split(',')[0].trim() : null;
  const network = forwarded && isIP(forwarded) ? forwarded : 'local';
  const expires = new Date(now.getTime() + 10 * 60 * 1000);
  const { attempts, expiresAt, keyHash } = appointmentAttemptLimits;
  const expired = lte(expiresAt, now);
  for (const [scope, value, limit] of [
    ['network', network, group === 'count' ? 300 : 100],
    ['identity', idNo, group === 'count' ? 60 : group === 'lookup' ? 12 : 20],
  ] as const) {
    const hash = createHmac('sha256', secret).update(JSON.stringify([group, scope, value])).digest('hex');
    const [allowed] = await db.insert(appointmentAttemptLimits).values({ keyHash: hash, attempts: 1, expiresAt: expires })
      .onConflictDoUpdate({
        target: keyHash,
        set: {
          attempts: sql`case when ${expired} then 1 else ${attempts} + 1 end`,
          expiresAt: sql`case when ${expired} then excluded.expires_at else ${expiresAt} end`,
        },
        setWhere: or(expired, lt(attempts, limit)),
      }).returning({ keyHash });
    if (!allowed) return false;
  }
  // 偶爾分批清除已過期的雜湊計數；跳過其他請求正在使用的列。
  if (Math.random() < 0.02) {
    await db.execute(sql`delete from ${appointmentAttemptLimits} where ${keyHash} in (
      select ${keyHash} from ${appointmentAttemptLimits} where ${expired}
      order by ${expiresAt} limit 200 for update skip locked
    )`);
  }
  return true;
}
