'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { APPOINTMENT_ICON_PATH, APPOINTMENT_PACKAGES, APPOINTMENT_PUBLIC_PATH, type AppointmentPackage } from '@/lib/appointments/catalog';
import { type BookingCalendar, calendarLink } from '@/lib/appointments/dates';
import type { publicAppointmentView } from '@/lib/appointments/public-service';
import { clampDay, clampMonth, normalizeIntegerInput } from '@/lib/forms/format';
import { PUBLIC_CAPTCHA_ACTIONS as ACTION, type PublicCaptchaConfig } from '@/lib/security/public-protection';
import { PublicChrome } from '../[formId]/chrome';
import { appointmentDraft } from '../[formId]/local-store';
import { bookAppointment, cancelPublicAppointment, countAppointments, lookupAppointment,
  refreshAppointment, restartAppointment } from './actions';
import styles from './appointment.module.css';
import { AppointmentCalendar } from './calendar';
import { useAppointmentRequest } from './use-appointment-request';

type Booking = Awaited<ReturnType<typeof publicAppointmentView>>;
const STATUS = { pending: '待院所確認', confirmed: '預約已成立', cancelled: '預約已取消' };
const IDENTITY = { idNo: '', y: '', m: '', d: '' };
const BIRTH_FIELDS = [['y', '年', 3], ['m', '月', 2], ['d', '日', 2]] as const;
const COUNT_PENDING = '查詢人數中…';

export function AppointmentApp({ open, calendar, requestId: initialRequestId, booking: initialBooking, captcha, configured }: {
  open: boolean; calendar: BookingCalendar; requestId: string | null; booking: Booking | null; captcha: PublicCaptchaConfig; configured: boolean;
}) {
  const [identity, setIdentity] = useState(IDENTITY);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [booking, setBooking] = useState(initialBooking);
  const [availability, setAvailability] = useState({ open, calendar });
  const [name, setName] = useState('');
  const [packageCode, setPackage] = useState<AppointmentPackage | ''>('');
  const [date, setDate] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { request, message, error, setError } = useAppointmentRequest(captcha);
  const countPending = message === COUNT_PENDING;
  const overlayMessage = countPending ? null : message;

  async function lookup(event: FormEvent) {
    event.preventDefault();
    const result = await request('正在查詢預約…', (token) => lookupAppointment(identity, token), ACTION.appointmentLookup);
    if (!result?.ok) return;
    setRequestId(result.requestId);
    setBooking(result.booking);
    setAvailability({ open: result.open, calendar: result.calendar });
    setIdentity(IDENTITY);
  }

  async function selectDate(selected: string) {
    if (!requestId) return;
    const result = await request(COUNT_PENDING, () => {
      setDate(selected);
      setCount(null);
      return countAppointments(requestId, selected);
    });
    if (result?.ok) setCount(result.total);
  }

  async function book(event: FormEvent) {
    event.preventDefault();
    if (!requestId) return;
    const result = await request('正在送出預約…', (token) => bookAppointment(requestId, { date, name, packageCode }, token), ACTION.appointmentCreate);
    if (result?.ok) setBooking(result.booking);
  }

  async function restart() {
    const result = await request('正在返回查詢…', restartAppointment);
    if (!result?.ok) return;
    setBooking(null);
    setRequestId(null);
    setDate('');
    setCount(null);
    setName('');
    setPackage('');
    setConfirmCancel(false);
  }

  async function refresh() {
    if (!booking) return;
    const result = await request('正在查詢最新預約狀態…', () => refreshAppointment(booking.id));
    if (result?.ok) setBooking(result.booking);
  }

  async function cancel() {
    if (!booking) return;
    const result = await request('正在取消預約…', (token) => cancelPublicAppointment(booking.id, token), ACTION.appointmentCancel);
    if (!result?.ok) return;
    void appointmentDraft.clear(booking.id);
    setBooking(result.booking);
    setConfirmCancel(false);
  }

  return <PublicChrome progress={booking ? 100 : requestId ? 50 : 0}>
    {overlayMessage && <LoadingOverlay message={overlayMessage} />}
    <header className={styles.heading}>
      <div><h1>預約健檢</h1><p>選擇健檢日期與套餐，送出後由院所確認。</p></div>
      <img src={APPOINTMENT_ICON_PATH} alt="" width={84} height={84} />
    </header>
    {!configured && <p role="status" className="notice">預約服務暫時無法使用，請洽院所協助。</p>}
    {error && <p role="alert" className="notice notice--error">{error}</p>}
    {!requestId ? <form className="card" onSubmit={lookup}>
      <h2>輸入證件號與出生日期</h2>
      {!open && <p className="notice">目前暫停受理新預約，既有預約仍可查詢。</p>}
      <label className={styles.field}>身分證統一編號、統一證號或護照號碼
        <input className="input" autoCapitalize="characters" autoComplete="off" maxLength={12} required
          value={identity.idNo} onChange={(e) => setIdentity({ ...identity, idNo: e.target.value.toUpperCase().replace(/\s/g, '') })} />
      </label>
      <fieldset className={styles.birth}><legend>出生日期（民國）</legend>
        <div className="rocdate">{BIRTH_FIELDS.map(([key, unit, max]) => <label key={key}
          className={`date-part${key === 'y' ? ' date-part--year' : ''}`}>
          <input className="input" aria-label={`民國出生${unit}`} inputMode="numeric" maxLength={max} required value={identity[key]}
            onChange={(e) => {
              const digits = normalizeIntegerInput(e.target.value, max);
              const next = { ...identity, [key]: key === 'm' ? clampMonth(digits) : digits };
              next.d = clampDay(next.d, next.y, next.m);
              setIdentity(next);
            }} />{unit}
        </label>)}</div>
      </fieldset>
      <button type="submit" className="btn btn--primary" disabled={!!message || !configured}>查詢與預約</button>
    </form> : booking ? <section className="card" aria-labelledby="booking-status">
      <h2 id="booking-status">{STATUS[booking.status]}</h2>
      <dl className={styles.summary}>
        {booking.name && <><dt>姓名</dt><dd>{booking.name}</dd></>}
        <dt>預約日期</dt><dd>{booking.date.replaceAll('-', '/')}</dd>
        <dt>健檢套餐</dt><dd>{APPOINTMENT_PACKAGES[booking.packageCode]}</dd>
      </dl>
      {booking.status === 'cancelled' ? <p className="notice">此預約已取消，關聯的勞工健康檢查表亦已失效。</p> : <>
        {booking.canManage && booking.packageCode === 'in_service' && !booking.hasIntake && booking.status === 'pending' &&
          <p className="notice">在職套餐須先送出勞工健康檢查表，院所才能確認預約。</p>}
        {!booking.canManage &&
          <p className="notice">若要開啟健檢表或取消預約，請使用送出預約時的瀏覽器，或洽院所協助。</p>}
        <ul className={styles.links}>
          <li><a href="https://www.wjcch.com.tw/health/health031" target="_blank" rel="noreferrer">健檢當日注意事項</a></li>
          <li><a href="https://www.wjcch.com.tw/health/health021" target="_blank" rel="noreferrer">健檢流程</a></li>
        </ul>
        <div className={styles.actions}>
          {booking.canOpenIntake && <Link className="btn btn--primary" prefetch={false}
            href={`${APPOINTMENT_PUBLIC_PATH}/form?booking=${booking.id}`}>
            {booking.hasIntake ? '檢視健康檢查表' : '填寫健康檢查表'}
          </Link>}
          {booking.status === 'confirmed' ? <a className="btn btn--ghost" href={calendarLink(booking.date)} target="_blank" rel="noreferrer">加入 Google 行事曆</a>
            : <button className="btn btn--ghost" type="button" disabled>加入 Google 行事曆（待確認）</button>}
          <button className="btn btn--ghost" type="button" onClick={() => void refresh()}>更新預約狀態</button>
          {booking.canCancel && !confirmCancel &&
            <button className="btn btn--ghost" type="button" onClick={() => { setConfirmCancel(true); setError(null); }}>取消預約</button>}
        </div>
        {confirmCancel && booking.canCancel && <div className={styles.cancelConfirmation}>
          <p>確定取消預約？已填寫的勞工健康檢查表將一併失效。</p>
          <div className={styles.actions}>
            <button className="btn btn--primary" type="button" onClick={() => void cancel()} disabled={!!message}>確認取消預約</button>
            <button className="btn btn--ghost" type="button" onClick={() => setConfirmCancel(false)}>保留預約</button>
          </div>
        </div>}
      </>}
      <button className={`btn btn--ghost ${styles.back}`} type="button" onClick={() => void restart()}>返回查詢</button>
    </section> : <>
      <p className="notice" role="status">
        {availability.open ? '查無有效預約，可在下方建立新預約。' : '查無有效預約，目前暫停受理新預約。'}
      </p>
      {availability.open && <form className="card" onSubmit={book}>
        <h2>選擇預約日期與套餐</h2>
        <AppointmentCalendar calendar={availability.calendar} selected={date} select={(value) => void selectDate(value)}
          disabled={!!overlayMessage} countPending={countPending} />
        <p className={styles.selection} aria-live="polite" aria-atomic="true">
          {date ? <>
            預約日期 {date.replaceAll('-', '/')}
            {countPending ? <span className={styles.selectionPending}>，{COUNT_PENDING}</span>
              : count !== null && `，當日已有 ${count} 人預約`}
          </> : '請選擇可預約的日期。'}
        </p>
        <label className={styles.field}>姓名
          <input className="input" autoComplete="name" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>健檢套餐
          <select className="input" required value={packageCode} onChange={(e) => setPackage(e.target.value as AppointmentPackage | '')}>
            <option value="">請選擇</option>
            {Object.entries(APPOINTMENT_PACKAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {packageCode && <p>{packageCode === 'in_service' ? '此套餐須填寫勞工健康檢查表，才能由院所確認。' : '此套餐可依需要填寫勞工健康檢查表。'}</p>}
        <button type="submit" className="btn btn--primary" disabled={!date || !!overlayMessage} aria-disabled={countPending || undefined}>送出預約</button>
      </form>}
      <button className={`btn btn--ghost ${styles.back}`} type="button"
        aria-disabled={countPending || undefined} onClick={() => void restart()}>返回查詢</button>
    </>}
  </PublicChrome>;
}
