import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appUrl } from '@/lib/env';
import { renderQrSvg, type QrSvgOptions } from '@/lib/forms/qr';
import { APPOINTMENT_COLOR, APPOINTMENT_NAME, APPOINTMENT_PUBLIC_PATH, APPOINTMENT_TINT } from './catalog';

export function appointmentQrUrl() {
  return `${appUrl()}${APPOINTMENT_PUBLIC_PATH}`;
}

export function renderAppointmentQrSvg(url: string, options?: QrSvgOptions) {
  // 直接嵌入核准圖示，下載的 SVG 和轉成的 PNG 都能離線顯示。
  const icon = readFileSync(join(process.cwd(), 'public/forms/appointment-icon.svg'), 'utf8');
  return renderQrSvg({
    name: APPOINTMENT_NAME,
    color: APPOINTMENT_COLOR,
    tint: APPOINTMENT_TINT,
    art: (attributes) => icon.replace('<svg ', `<svg ${attributes} `),
  }, url, options);
}
