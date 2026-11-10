export const APPOINTMENT_CATEGORY = 'appointment';
export const APPOINTMENT_NAME = '預約健檢';
export const APPOINTMENT_SLUG = 'labor-appointment';
export const APPOINTMENT_ADMIN_PATH = `/admin/forms/${APPOINTMENT_SLUG}`;
export const APPOINTMENT_PUBLIC_PATH = `/f/${APPOINTMENT_SLUG}`;
export const APPOINTMENT_ICON_PATH = '/forms/appointment-icon.svg';
export const APPOINTMENT_COLOR = '#2f8f7f';
export const APPOINTMENT_TINT = '#dff0ea';

export const APPOINTMENT_PACKAGE_CODES = ['new_worker', 'new_worker_hbv', 'food_service', 'in_service'] as const;
export type AppointmentPackage = (typeof APPOINTMENT_PACKAGE_CODES)[number];

export const APPOINTMENT_PACKAGES = {
  new_worker: '新進勞工體格檢查',
  new_worker_hbv: '新進勞工體格＋B肝檢查',
  food_service: '餐飲業體檢（新進勞工＋食品類）',
  in_service: '一般勞工體格檢查（在職）',
} as const satisfies Record<AppointmentPackage, string>;

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
