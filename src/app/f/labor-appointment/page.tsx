import '@/components/forms/forms.css';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { appointmentAccessConfigured, readAppointmentAccess } from '@/lib/appointments/access';
import { loadPublicAppointment, publicAppointmentView, publicBookingCalendar } from '@/lib/appointments/public-service';
import { getPublicCaptchaConfig } from '@/lib/security/recaptcha';
import { AppointmentApp } from './appointment-app';

export const metadata: Metadata = { title: '預約健檢', robots: { index: false, follow: false } };

export default function AppointmentPage() {
  return <Suspense fallback={<LoadingOverlay message="正在開啟預約健檢…" />}><AppointmentView /></Suspense>;
}

async function AppointmentView() {
  await connection();
  const { device, gate } = await readAppointmentAccess();
  const [availability, row] = await Promise.all([publicBookingCalendar(), gate ? loadPublicAppointment(gate) : null]);
  return <AppointmentApp
    {...availability}
    requestId={gate && (!gate.appointmentId || row) ? gate.requestId : null}
    booking={row ? await publicAppointmentView(row, device) : null}
    captcha={getPublicCaptchaConfig()}
    configured={appointmentAccessConfigured()}
  />;
}
