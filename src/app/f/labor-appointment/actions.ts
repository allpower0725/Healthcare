'use server';

import { randomUUID } from 'node:crypto';
import { allowAppointmentAttempt, appointmentAccessConfigured, type AppointmentGate, clearAppointmentAccess,
  readAppointmentAccess, writeAppointmentAccess } from '@/lib/appointments/access';
import { APPOINTMENT_PACKAGE_CODES, type AppointmentPackage } from '@/lib/appointments/catalog';
import { cancelAppointment, createAppointment, latestAppointment, loadPublicAppointment, parseAppointmentIdentity,
  publicAppointmentView, publicBookingCalendar, publicBookingCount, readAppointmentIntake, returnAppointmentIntake,
  saveAppointmentIntake } from '@/lib/appointments/public-service';
import { PUBLIC_CAPTCHA_ACTIONS as ACTION, type PublicCaptchaAction, VERIFICATION_MESSAGES } from '@/lib/security/public-protection';
import { verifyRecaptcha } from '@/lib/security/recaptcha';

const fail = (message: string) => ({ ok: false, message }) as const;
const EXPIRED = '查詢已逾時或預約已失效，請返回預約健檢重新查詢。';
const LIMITED = '操作次數過多，請等候十分鐘再試。';
const NOT_OPEN = '目前暫停受理新預約。既有預約仍可查詢。';

async function protection(group: 'lookup' | 'write', idNo: string, action: PublicCaptchaAction, token: unknown) {
  if (!appointmentAccessConfigured()) return fail(VERIFICATION_MESSAGES.verification_unavailable);
  if (!await allowAppointmentAttempt(group, idNo)) return fail(LIMITED);
  const result = await verifyRecaptcha(action, token);
  return result.ok ? null : fail(VERIFICATION_MESSAGES[result.reason]);
}

export async function lookupAppointment(raw: unknown, token: unknown) {
  const identity = parseAppointmentIdentity(raw);
  if (!identity) return fail('請確認證件號與民國出生年月日。');
  const blocked = await protection('lookup', identity.idNo, ACTION.appointmentLookup, token);
  if (blocked) return blocked;
  const { device, gate } = await readAppointmentAccess();
  const row = await latestAppointment(identity);
  const sameGate = gate && gate.idNo === identity.idNo && gate.birthDate === identity.birthDate && !gate.appointmentId;
  const requestId = sameGate ? gate.requestId : randomUUID();
  await writeAppointmentAccess({ ...identity, requestId, appointmentId: row?.id }, device);
  return { ok: true, booking: row ? await publicAppointmentView(row, device) : null, requestId, ...await publicBookingCalendar() } as const;
}

export async function countAppointments(requestId: string, date: unknown) {
  const { gate } = await readAppointmentAccess();
  if (!gate || gate.requestId !== requestId || gate.appointmentId) return fail(EXPIRED);
  if (!await allowAppointmentAttempt('count', gate.idNo)) return fail(LIMITED);
  const total = await publicBookingCount(date);
  return total === null ? fail('此日期目前無法預約，請重新查詢。') : { ok: true, total } as const;
}

export async function bookAppointment(requestId: string, raw: unknown, token: unknown) {
  const { device, gate } = await readAppointmentAccess();
  if (!device || !gate || gate.requestId !== requestId) return fail(EXPIRED);
  if (!raw || typeof raw !== 'object') return fail('請選擇日期與健檢套餐，並填寫姓名。');
  const { date, name, packageCode } = raw as Record<string, unknown>;
  if (typeof date !== 'string' || typeof name !== 'string' || !name.trim() || name.trim().length > 40
    || !APPOINTMENT_PACKAGE_CODES.some((code) => code === packageCode)) {
    return fail('請選擇日期與健檢套餐，並填寫 40 字以內的姓名。');
  }
  const blocked = await protection('write', gate.idNo, ACTION.appointmentCreate, token);
  if (blocked) return blocked;
  // 回應遺失但 Cookie 已更新時，重試同一請求仍回傳原預約。
  if (gate.appointmentId) {
    const row = gate.appointmentId === requestId ? await loadPublicAppointment(gate) : null;
    return row?.status && row.status !== 'cancelled'
      ? { ok: true, booking: await publicAppointmentView(row, device) } as const : fail(EXPIRED);
  }
  const result = await createAppointment(gate, device, { date, name: name.trim(), packageCode: packageCode as AppointmentPackage });
  if (!result.ok) {
    return fail({
      not_open: NOT_OPEN,
      date_unavailable: '此日期目前無法預約，請重新查詢。',
      conflict: '未能建立新預約。請返回查詢確認是否已有預約，或洽院所協助。',
    }[result.reason]);
  }
  await writeAppointmentAccess({ ...gate, appointmentId: result.row.id }, device);
  return { ok: true, booking: await publicAppointmentView(result.row, device) } as const;
}

export async function refreshAppointment(id: string) {
  const { device, gate } = await readAppointmentAccess();
  if (!gate || gate.appointmentId !== id) return fail(EXPIRED);
  const row = await loadPublicAppointment(gate);
  return row ? { ok: true, booking: await publicAppointmentView(row, device) } as const : fail(EXPIRED);
}

export async function cancelPublicAppointment(id: string, token: unknown) {
  const { device, gate } = await readAppointmentAccess();
  if (!gate || gate.appointmentId !== id) return fail(EXPIRED);
  const blocked = await protection('write', gate.idNo, ACTION.appointmentCancel, token);
  if (blocked) return blocked;
  const result = await cancelAppointment(gate, device, id);
  return result.ok ? { ok: true, booking: await publicAppointmentView(result.row, device) } as const
    : fail(result.reason === 'locked' ? '此預約需由院所協助取消，請與院所聯繫。' : EXPIRED);
}

export async function restartAppointment() {
  await clearAppointmentAccess();
  return { ok: true } as const;
}

async function intakeVersion(gate: AppointmentGate, device: string | null, status: 'submitted' | 'returned') {
  const record = await readAppointmentIntake(gate, device);
  if (!record?.intake || record.intake.status !== status) return fail(EXPIRED);
  return { ok: true, version: record.intake.version, editable: record.editable } as const;
}

export async function submitAppointmentIntake(id: string, version: number | null, raw: unknown, token: unknown) {
  const { device, gate } = await readAppointmentAccess();
  if (!gate || gate.appointmentId !== id) return fail(EXPIRED);
  if (version !== null && (!Number.isSafeInteger(version) || version < 1)) return fail(EXPIRED);
  const blocked = await protection('write', gate.idNo, version === null ? ACTION.submit : ACTION.resubmit, token);
  if (blocked) return blocked;
  const result = await saveAppointmentIntake(gate, device, id, version, raw);
  if (result.ok) return intakeVersion(gate, device, 'submitted');
  if (result.reason === 'invalid') return { ...fail('請確認表單中標示的欄位。'), errors: result.errors };
  return fail(result.reason === 'not_found' ? EXPIRED : '這份表單已更新或鎖定，請返回預約畫面確認狀態。');
}

export async function editAppointmentIntake(id: string, version: number, token: unknown) {
  const { device, gate } = await readAppointmentAccess();
  if (!gate || gate.appointmentId !== id || !Number.isSafeInteger(version) || version < 1) return fail(EXPIRED);
  const blocked = await protection('write', gate.idNo, ACTION.return, token);
  if (blocked) return blocked;
  const result = await returnAppointmentIntake(gate, device, id, version);
  return result.ok ? intakeVersion(gate, device, 'returned') : fail('這份表單已更新或鎖定，請返回預約畫面確認狀態。');
}
