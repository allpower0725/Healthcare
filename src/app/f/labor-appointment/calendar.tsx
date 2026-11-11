'use client';
import { useState } from 'react';
import { addDays, type BookingCalendar, isBookableDate, weekday } from '@/lib/appointments/dates';
import styles from './appointment.module.css';

const DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const monthOf = (value: string) => value.slice(0, 7);

function moveMonth(month: string, offset: number) {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return monthOf(date.toISOString());
}

export function AppointmentCalendar({ calendar, selected, select, disabled, countPending }: {
  calendar: BookingCalendar; selected: string; select: (date: string) => void; disabled: boolean; countPending: boolean;
}) {
  const [month, setMonth] = useState(monthOf(selected || calendar.firstDate));
  const first = month + '-01';
  const offset = (weekday(first) + 6) % 7;
  const [year, number] = month.split('-');
  const dates: string[] = [];
  for (let date = first; monthOf(date) === month; date = addDays(date, 1)) dates.push(date);
  return <div className={styles.calendar}>
    <div className={styles.month}>
      <button type="button" className="btn btn--ghost btn--sm" aria-label="上個月" disabled={disabled || month <= monthOf(calendar.firstDate)}
        onClick={() => setMonth(moveMonth(month, -1))}>‹</button>
      <strong aria-live="polite">{year} 年 {Number(number)} 月</strong>
      <button type="button" className="btn btn--ghost btn--sm" aria-label="下個月" disabled={disabled || month >= monthOf(calendar.lastDate)}
        onClick={() => setMonth(moveMonth(month, 1))}>›</button>
    </div>
    <div className={styles.days} role="group" aria-label={`${year} 年 ${Number(number)} 月可預約日期`}>
      {DAYS.map((day) => <span key={day} aria-hidden="true">{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={i} aria-hidden="true" />)}
      {dates.map((date) => <button key={date} type="button" aria-label={date} aria-pressed={date === selected}
        disabled={disabled || !isBookableDate(date, calendar)} aria-disabled={countPending || undefined}
        onClick={() => { if (!countPending) select(date); }}>{Number(date.slice(-2))}</button>)}
    </div>
  </div>;
}
