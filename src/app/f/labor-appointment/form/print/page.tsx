import '@/components/forms/print.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getFormPrint } from '@/forms/print-registry';
import { readAppointmentAccess } from '@/lib/appointments/access';
import { readAppointmentIntake } from '@/lib/appointments/public-service';
import { deriveProfile } from '@/lib/forms/profile';

export const metadata: Metadata = { title: '列印勞工健康檢查表', robots: { index: false, follow: false } };
type Query = Promise<{ booking?: string }>;

export default function AppointmentPrintPage({ searchParams }: { searchParams: Query }) {
  return <Suspense fallback={<p role="status">載入列印內容中…</p>}><PrintView searchParams={searchParams} /></Suspense>;
}

async function PrintView({ searchParams }: { searchParams: Query }) {
  await connection();
  const [{ booking }, { device, gate }] = await Promise.all([searchParams, readAppointmentAccess()]);
  if (!gate?.appointmentId || gate.appointmentId !== booking) notFound();
  const record = await readAppointmentIntake(gate, device);
  const intake = record?.intake;
  const Print = getFormPrint('labor');
  if (!Print || !intake || (intake.status !== 'submitted' && intake.status !== 'completed')) notFound();
  return <main className="ps-frame"><Print data={{ ...intake.publicData, ...deriveProfile(intake.publicData) }} /></main>;
}
