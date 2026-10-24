'use client';

import type { ReactNode } from 'react';
import { ageOn, rocToIso, todayIsoTaipei } from '@/lib/forms/format';
import { EDUCATION } from '@/lib/forms/profile';
import { useText } from './context';
import {
  AddressInputs,
  Choices,
  Field,
  Flag,
  RegionInputs,
  RocDateInputs,
  ShowIf,
  TextInput,
  TodayButton,
} from './fields';

/** 民眾區的一個步驟 */
export function StepCard(props: {
  no: ReactNode;
  title: string;
  desc?: string;
  tag?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card step${props.className ? ` ${props.className}` : ''}`}>
      <header className="step__head">
        <span className="step__no" aria-hidden="true">
          {props.no}
        </span>
        <div className="step__titles">
          <h2 className="step__title">{props.title}</h2>
          {props.desc && <p className="step__desc">{props.desc}</p>}
        </div>
        {props.tag}
      </header>
      {props.children}
    </section>
  );
}

/** 院所區的一張卡片 */
export function StaffCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h3 className="card__title">
        {title} {note && <small>{note}</small>}
      </h3>
      {children}
    </section>
  );
}

/** 院所區欄位標題前的＊（原表單的必填標記） */
export function Req() {
  return <span className="req">＊</span>;
}

/** 院所區民國日期欄位（含「今天」按鈕）；req 時標題前加＊ */
export function DateField(props: { prefix: string; label: string; req?: boolean; hint?: ReactNode }) {
  const { prefix, label, req } = props;
  return (
    <Field
      rule={prefix}
      role="group"
      hint={props.hint}
      label={
        <>
          {req && <Req />}
          {label}
        </>
      }
      aside={<TodayButton prefix={prefix} />}
    >
      <RocDateInputs prefix={prefix} label={label} />
    </Field>
  );
}

function CurrentRegion() {
  const county = useText('profile.addrCounty');
  const town = useText('profile.addrTown');
  return county ? <span className="check__sub">（{county + town}）</span> : null;
}

/** 戶籍地址（縣市與鄉鎮市區）；HPV、子宮頸抹片共用 */
export function RegisteredRegionStep({ no }: { no: number }) {
  return (
    <StepCard no={no} title="戶籍地址" desc="只需要縣市與鄉鎮市區；其他表單有相同欄位時，也會自動帶入。">
      <div className="field">
        <Flag name="profile.regSame">
          與現住址相同 <CurrentRegion />
        </Flag>
      </div>
      <ShowIf when="profile.regSame!=1">
        <Field rule="profile.reg" role="group">
          <RegionInputs countyKey="profile.regCounty" townKey="profile.regTown" />
        </Field>
      </ShowIf>
    </StepCard>
  );
}

function BirthHint() {
  const iso = rocToIso(useText('profile.birthY'), useText('profile.birthM'), useText('profile.birthD'));
  const today = todayIsoTaipei();
  if (!iso || iso > today) return <>請填民國年，例：民國 72 年 5 月 18 日</>;
  const [y, m, d] = iso.split('-').map(Number);
  return (
    <>
      西元 {y} 年 {m} 月 {d} 日・{ageOn(iso, today)} 歲
    </>
  );
}

/** 手機（選填） */
export function MobileField({ id }: { id: string }) {
  return (
    <Field
      rule="profile.mobile"
      label={
        <>
          手機 <span className="opt">選填</span>
        </>
      }
      htmlFor={id}
      hint="基本資料的聯絡電話若已是手機，可以不填。"
    >
      <TextInput name="profile.mobile" id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} />
    </Field>
  );
}

/** 6 張表單共用的基本資料（身分證號在關卡輸入，這裡不重複） */
export function ProfileSection({ step, prefilled }: { step: number; prefilled: boolean }) {
  return (
    <StepCard
      no={step}
      title="基本資料"
      desc="本院各項預防保健表單共用，填寫一次即可自動帶入其他表單。"
      tag={<span className="tag tag--shared">共用</span>}
    >
      {prefilled && <p className="notice">已帶入您先前填寫的基本資料，請確認內容是否正確。</p>}

      <Field rule="profile.name" label="姓名" htmlFor="pf-name">
        <TextInput name="profile.name" id="pf-name" maxLength={40} autoComplete="name" />
      </Field>

      <Field rule="profile.birth" label="出生日期" role="group" hint={<BirthHint />}>
        <RocDateInputs prefix="profile.birth" label="出生日期" />
      </Field>

      <Field
        rule="profile.phone"
        label="聯絡電話"
        htmlFor="pf-phone"
        hint="手機或市話皆可，市話請加區碼，例：0912345678、04-23456789"
      >
        <TextInput name="profile.phone" id="pf-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} />
      </Field>

      <Field
        rule="profile.email"
        label={
          <>
            電子郵件 <span className="opt">選填</span>
          </>
        }
        htmlFor="pf-email"
        hint="沒有可留空，例：name@example.com"
      >
        <TextInput
          name="profile.email"
          id="pf-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={100}
        />
      </Field>

      <Field rule="profile.edu" label="教育程度" role="radiogroup" validateOnBlur={false}>
        <Choices name="profile.edu" options={EDUCATION} />
      </Field>

      <Field
        rule="profile.addr"
        label="現住址"
        role="group"
        hint="鄰、段、巷、弄、樓若沒有可留空；號碼如「25之1」請直接輸入。"
      >
        <AddressInputs prefix="profile.addr" />
      </Field>
    </StepCard>
  );
}
