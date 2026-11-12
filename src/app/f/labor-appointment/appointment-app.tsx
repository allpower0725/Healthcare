'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { LoadingOverlay } from '@/components/loading/loading-overlay';
import { BackButton } from '@/components/navigation/back-control';
import { useNativeValidationModal, useResultModal } from '@/components/feedback/result-modal';
import { APPOINTMENT_PACKAGES, APPOINTMENT_PUBLIC_PATH, type AppointmentPackage } from '@/lib/appointments/catalog';
import { FormIllustration } from '@/components/brand/form-illustration';
import { IdentityFields } from '@/components/forms/identity-fields';
import { type BookingCalendar, calendarLink } from '@/lib/appointments/dates';
import type { publicAppointmentView } from '@/lib/appointments/public-service';
import { clampDay, clampMonth, normalizeIntegerInput } from '@/lib/forms/format';
import { identityError, type IdentityType } from '@/lib/forms/identity';
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
const IDENTITY = { idType: 'national_id' as IdentityType, idNo: '', y: '', m: '', d: '' };
const BIRTH_FIELDS = [['y', '年', 3], ['m', '月', 2], ['d', '日', 2]] as const;
const COUNT_PENDING = '查詢人數中…';
const HEALTH_RESOURCES = [
  { label: '健檢當日注意事項', href: 'https://www.wjcch.com.tw/health/health031',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v4H9zM9 12h6M9 16h4" />
    </svg> },
  { label: '健檢流程', href: 'https://www.wjcch.com.tw/health/health021',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 5h8a3.5 3.5 0 0 1 0 7H8a3.5 3.5 0 0 0 0 7h8" />
    </svg> },
];

function HealthResources() {
  return <ul className={styles.links} aria-label="健檢參考資訊" role="list">
    {HEALTH_RESOURCES.map(({ label, href, icon }) => <li key={href}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <span className={styles.linkIcon} aria-hidden="true">{icon}</span>
        <span className={styles.linkLabel}>{label}</span>
        <span className={styles.linkArrow} aria-hidden="true">↗</span>
        <span className="sr-only">（另開新分頁）</span>
      </a>
    </li>)}
  </ul>;
}

export function AppointmentApp({ open, calendar, requestId: initialRequestId, booking: initialBooking, captcha, configured }: {
  open: boolean; calendar: BookingCalendar; requestId: string | null; booking: Booking | null; captcha: PublicCaptchaConfig; configured: boolean;
}) {
  const [identity, setIdentity] = useState(IDENTITY);
  const [identityIssue, setIdentityIssue] = useState('');
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
  const showResult = useResultModal();
  const onInvalid = useNativeValidationModal();

  async function lookup(event: FormEvent) {
    event.preventDefault();
    const issue = identityError(identity.idType, identity.idNo);
    if (issue) {
      setIdentityIssue(issue);
      showResult({ title: '請確認證件資料', tone: 'warning', message: issue,
        confirmLabel: '前往修正', onClose: () => document.getElementById('appointment-idNo')?.focus() });
      return;
    }
    setIdentityIssue('');
    const result = await request('正在查詢預約…', (token) => lookupAppointment(identity, token), ACTION.appointmentLookup);
    if (!result?.ok) {
      if (result) showResult({ title: '查詢未完成', tone: 'error', message: result.message });
      return;
    }
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
    if (!result) return;
    if (result.ok) {
      setBooking(result.booking);
      showResult({ title: '預約已送出', tone: 'success', message: result.booking.packageCode === 'in_service'
        ? '已收到預約。請接著填寫並送出勞工健康檢查表，院所才能確認預約。'
        : '已收到預約，待院所確認後預約才會成立。' });
    } else showResult({ title: '預約未送出', tone: 'error', message: result.message });
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
    if (!result?.ok) {
      if (result) showResult({ title: '取消預約未完成', tone: 'error', message: result.message });
      return;
    }
    void appointmentDraft.clear(booking.id);
    setBooking(result.booking);
    setConfirmCancel(false);
    showResult({ title: '預約已取消', tone: 'success', message: '此預約及已關聯的勞工健康檢查表已失效。' });
  }

  return <PublicChrome progress={booking ? 100 : requestId ? 50 : 0} welcome={!requestId}
    navigation={requestId ? <BackButton disabled={!!message} onClick={() => void restart()}>返回查詢</BackButton> : undefined}>
    {overlayMessage && <LoadingOverlay message={overlayMessage} />}
    <header className="intro">
      <span className="intro__art" aria-hidden="true"><FormIllustration formId="appointment" /></span>
      <p className="intro__eyebrow">預防保健服務</p>
      <h1 className="intro__title">預約健檢</h1>
      <p className="intro__sub">選擇健檢日期與套餐，送出後由院所確認。</p>
    </header>
    {!configured && <p role="status" className="notice notice--warn">預約服務暫時無法使用，請洽院所協助。</p>}
    {error && <p role="alert" className="notice notice--error">{error}</p>}
    {!requestId ? <form className="card" onSubmit={lookup} onInvalidCapture={onInvalid}>
      <h2>輸入證件號與出生日期</h2>
      {!open && <p className="notice notice--warn">目前暫停受理新預約，既有預約仍可查詢。</p>}
      <IdentityFields inputId="appointment-idNo" type={identity.idType} value={identity.idNo} disabled={!!message}
        error={identityIssue} onTypeChange={(idType) => { setIdentity({ ...identity, idType }); setIdentityIssue(''); }}
        onNumberChange={(idNo) => { setIdentity({ ...identity, idNo }); setIdentityIssue(''); }} />
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
      {booking.status === 'cancelled' ? <p className="notice notice--warn">此預約已取消，關聯的勞工健康檢查表亦已失效。</p> : <>
        {booking.canManage && booking.packageCode === 'in_service' && !booking.hasIntake && booking.status === 'pending' &&
          <div className="notice notice--warn" role="status">
            <strong className="notice__title">請先填寫並送出勞工健康檢查表</strong>
            <span>在職套餐須完成此步驟，院所才能確認預約。</span>
          </div>}
        {!booking.canManage &&
          <p className="notice notice--warn">若要開啟健檢表或取消預約，請使用送出預約時的瀏覽器，或洽院所協助。</p>}
        <HealthResources />
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
    </section> : <>
      <p className="notice" role="status">
        {availability.open ? '查無有效預約，可在下方建立新預約。' : '查無有效預約，目前暫停受理新預約。'}
      </p>
      {availability.open && <form className="card" onSubmit={book} onInvalidCapture={onInvalid}>
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
        <div className={styles.field}>
          <div className={styles.fieldHeading}>
            <label htmlFor="appointment-package">健檢套餐</label>
            <a className={`opt ${styles.packageHelp}`} href="https://www.wjcch.com.tw/health/health011" target="_blank" rel="noopener noreferrer">
              套餐說明<span className="sr-only">（另開新分頁）</span>
            </a>
          </div>
          <select id="appointment-package" className="input" required value={packageCode} onChange={(e) => setPackage(e.target.value as AppointmentPackage | '')}>
            <option value="">請選擇</option>
            {Object.entries(APPOINTMENT_PACKAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {packageCode && <p>{packageCode === 'in_service' ? '此套餐須填寫勞工健康檢查表，才能由院所確認。' : '此套餐可依需要填寫勞工健康檢查表。'}</p>}
        <button type="submit" className="btn btn--primary" disabled={!date || !!overlayMessage} aria-disabled={countPending || undefined}>送出預約</button>
      </form>}
    </>}
  </PublicChrome>;
}
