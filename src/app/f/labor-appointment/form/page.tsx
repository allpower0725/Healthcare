import '@/components/forms/forms.css';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { readAppointmentAccess } from '@/lib/appointments/access';
import { APPOINTMENT_PUBLIC_PATH } from '@/lib/appointments/catalog';
import { intakeIdentity, readAppointmentIntake } from '@/lib/appointments/public-service';
import { getPublicCaptchaConfig } from '@/lib/security/recaptcha';
import { isIdentityType } from '@/lib/forms/identity';
import { AppointmentIntake } from './intake';

export const metadata: Metadata = { title: '預約健檢｜勞工健康檢查表', robots: { index: false, follow: false } };
type Query = Promise<{ booking?: string }>;

export default function AppointmentIntakePage({ searchParams }: { searchParams: Query }) {
  return <Suspense fallback={<LoadingOverlay message="正在開啟勞工健康檢查表…" />}>
    <IntakeView searchParams={searchParams} />
  </Suspense>;
}

async function IntakeView({ searchParams }: { searchParams: Query }) {
  await connection();
  const [{ booking }, { device, gate }] = await Promise.all([searchParams, readAppointmentAccess()]);
  if (!gate?.appointmentId || gate.appointmentId !== booking) redirect(APPOINTMENT_PUBLIC_PATH);
  const record = await readAppointmentIntake(gate, device);
  if (!record || (!record.intake && !record.editable)) redirect(APPOINTMENT_PUBLIC_PATH);
  const storedType = record.intake?.publicData['profile.idType'];
  return <AppointmentIntake key={record.booking.id} id={record.booking.id}
    identity={intakeIdentity(record.booking, isIdentityType(storedType) ? storedType : gate.idType)}
    intake={record.intake ? { values: record.intake.publicData, status: record.intake.status, version: record.intake.version } : null}
    editable={record.editable} captcha={getPublicCaptchaConfig()} />;
}
