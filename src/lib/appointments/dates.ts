import { todayIsoTaipei } from '@/lib/forms/format';

export const DEFAULT_BOOKING_DATES = { bookingMinDays: 15, bookingMaxDays: 90, closedDates: [] as string[] };
export type BookingDateSettings = typeof DEFAULT_BOOKING_DATES;
export type BookingCalendar = { firstDate: string; lastDate: string; closedDates: string[] };

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(value: string, days: number) {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekday(value: string) {
  return new Date(value + 'T00:00:00Z').getUTCDay();
}

export function bookingCalendar(settings: BookingDateSettings, now = new Date()): BookingCalendar {
  const today = todayIsoTaipei(now);
  const firstDate = addDays(today, settings.bookingMinDays);
  const lastDate = addDays(today, settings.bookingMaxDays);
  return { firstDate, lastDate, closedDates: settings.closedDates.filter((date) => date >= firstDate && date <= lastDate) };
}

export function isBookableDate(value: unknown, calendar: BookingCalendar): value is string {
  return isDate(value) && value >= calendar.firstDate && value <= calendar.lastDate
    && weekday(value) !== 0 && !calendar.closedDates.includes(value);
}

export function calendarLink(date: string) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: '健檢預約',
    dates: `${date.replaceAll('-', '')}/${addDays(date, 1).replaceAll('-', '')}`,
    location: '烏日澄清醫院',
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}
