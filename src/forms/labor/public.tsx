'use client';

import { Checks, Choices, DurationInputs, Field, RocDateInputs, ShowIf, TextInput } from '@/components/forms/fields';
import { DateField, StepCard } from '@/components/forms/sections';
import { LABOR_DISEASES, LABOR_HAS, LABOR_HABITS, LABOR_REASON, LABOR_SHIFT, LABOR_SYMPTOMS, habitOptions } from '@/lib/forms/defs/labor';
import { SEX } from '@/lib/forms/profile';
import { LaborUploadConsent } from './upload-consent';

function TextField({ name, label, optional, placeholder, maxLength = 40 }: { name: string; label: string; optional?: boolean; placeholder?: string; maxLength?: number }) {
  return <Field rule={name} label={<>{label}{optional && <span className="opt"> 選填</span>}</>} htmlFor={name}>
    <TextInput name={name} id={name} maxLength={maxLength} placeholder={placeholder} />
  </Field>;
}
function NumberField({ name, label, optional = false }: { name: string; label: string; optional?: boolean }) {
  return <Field rule={name} label={<>{label}{optional && <span className="opt"> 選填</span>}</>} htmlFor={name}>
    <TextInput name={name} id={name} maxLength={7} inputMode="decimal" />
  </Field>;
}
function Duration({ rule, y, m, label }: { rule: string; y: string; m: string; label: string }) {
  return <Field rule={rule} label={label} role="group" hint="不足一年或沒有剩餘月數請填 0；月數為 0–11。">
    <DurationInputs yearsName={y} monthsName={m} label={label} />
  </Field>;
}
function Job({ previous = false }: { previous?: boolean }) {
  const prefix = previous ? 'labor.previous' : 'labor.current';
  const label = previous ? '曾經從事的工作' : '目前從事的工作';
  return <>
    <Field rule={prefix + 'Has'} label={label} hint={previous ? '只需填寫最近一項過去的工作經歷即可。' : undefined} role="radiogroup" validateOnBlur={false}>
      <Choices name={prefix + 'Has'} options={LABOR_HAS} />
    </Field>
    <ShowIf when={`${prefix}Has=Y`}>
      <TextField name={prefix + 'Title'} label={previous ? '最近一項過去的工作內容' : '目前工作內容'} placeholder="例如：行政人員、護理師、機台操作員" />
      <Field rule={prefix + 'Dates'} label="作業起訖年月（選填）" role="group" hint="目前仍在職者，截止年月可留空。">
        <div className="date-rows">
          {(['Start', 'End'] as const).map((part) => <RocDateInputs key={part} precision="month"
            prefix={prefix + part} label={`${label}${part === 'Start' ? '起始' : '截止'}`}
            leadingLabel={part === 'Start' ? '起始：' : '截止：'} />)}
        </div>
      </Field>
      <Duration rule={prefix + 'Duration'} y={prefix + 'Years'} m={prefix + 'Months'} label="合計年資（選填）" />
    </ShowIf>
  </>;
}

export function LaborPublic({ prefilled }: { prefilled: boolean }) {
  return <>
    <StepCard no={1} title="基本資料" desc="相同基本資料可由本裝置先前填寫的表單帶入。" tag={<span className="tag tag--shared">共用</span>}>
      {prefilled && <p className="notice">已帶入先前填寫的基本資料，請確認內容是否正確。</p>}
      <TextField name="profile.name" label="姓名" />
      <Field rule="profile.sex" label="性別" role="radiogroup" validateOnBlur={false}><Choices name="profile.sex" options={SEX} /></Field>
      <Field rule="profile.birth" label="出生日期" role="group"><RocDateInputs prefix="profile.birth" label="出生日期" /></Field>
      <Field rule="profile.email" label={<>電子郵件 <span className="opt">選填</span></>} htmlFor="labor-email" hint="沒有可留空，例：name@example.com">
        <TextInput name="profile.email" id="labor-email" type="email" inputMode="email" autoComplete="email" maxLength={100} />
      </Field>
    </StepCard>
    <StepCard no={2} title="作業經歷與檢查時期" desc="請依實際工作情形填寫，日期及時數不清楚時可先留空。">
      <TextField name="labor.company" label="事業單位名稱" maxLength={60} placeholder="例如：烏日澄清醫院、○○股份有限公司" />
      <DateField prefix="labor.hired" label="受僱日期（選填）" />
      <DateField prefix="labor.exam" label="檢查日期（選填）" />
      <Job />
      <ShowIf when="labor.currentHas=Y">
        <Field rule="labor.shift" label="是否需輪班？" role="radiogroup" validateOnBlur={false}><Choices name="labor.shift" options={LABOR_HAS.map(([v, label]) => [v, label === '有' ? '是' : '否'] as const)} /></Field>
        <ShowIf when="labor.shift=Y">
          <Field rule="labor.shiftType" label="輪班班制" role="radiogroup" validateOnBlur={false}><Choices name="labor.shiftType" options={LABOR_SHIFT} /></Field>
          <ShowIf when="labor.shiftType=other"><TextField name="labor.shiftOther" label="其他班制說明" maxLength={30} /></ShowIf>
        </ShowIf>
      </ShowIf>
      <Job previous />
      <NumberField name="labor.hours1m" label="檢查日前 1 個月，平均每週工時（小時）" optional />
      <NumberField name="labor.hours6m" label="檢查日前 6 個月，平均每週工時（小時）" optional />
      <Field rule="labor.reason" label="檢查時期（原因）" role="radiogroup" validateOnBlur={false}><Choices name="labor.reason" options={LABOR_REASON} /></Field>
    </StepCard>
    <StepCard no={3} title="既往病史" desc="您是否曾患有下列慢性疾病？可複選；若沒有，請選「以上皆無」。">
      <Field rule="labor.diseases" label="曾患疾病" validateOnBlur={false}><Checks name="labor.diseases" options={LABOR_DISEASES} ariaLabel="曾患疾病" /></Field>
      {(['cancer', 'fracture', 'surgery', 'other'] as const).map((key) => <ShowIf key={key} when={`labor.diseases=${key}`}>
        <TextField name={`labor.${key}Detail`} label={`${LABOR_DISEASES.find(([v]) => v === key)![1]}說明`} />
      </ShowIf>)}
    </StepCard>
    <StepCard no={4} title="生活習慣" desc="請依各題指定的期間回答。">
      {LABOR_HABITS.map((habit) => {
        const prefix = `labor.${habit.key}`;
        return <div key={prefix}>
          <Field rule={prefix} label={habit.question} role="radiogroup" validateOnBlur={false}><Choices name={prefix} options={habitOptions(habit)} /></Field>
          <ShowIf when={`${prefix}=daily`}>
            <NumberField name={prefix + 'Amount'} label={`${habit.amount}（${habit.unit}）`} />
            {habit.key !== 'drink' ? <NumberField name={prefix + 'Years'} label={habit.years} /> : <>
              <TextField name="labor.drinkType" label="最常喝的酒類" maxLength={20} placeholder="例如：啤酒、紅酒、高粱酒" />
              <NumberField name="labor.drinkBottles" label="每次喝幾瓶" />
            </>}
          </ShowIf>
          <ShowIf when={`${prefix}=quit`}><Duration rule={prefix + 'Quit'} y={prefix + 'QuitY'} m={prefix + 'QuitM'} label="已戒多久" /></ShowIf>
        </div>;
      })}
      <NumberField name="labor.sleep" label="工作日期間，平均每天睡眠時間（小時）" optional />
    </StepCard>
    <StepCard no={5} title="自覺症狀" desc="您最近三個月是否常有下列症狀？請依自身實際情形勾選；若沒有，請選「以上皆無」。">
      <Field rule="labor.symptoms" label="自覺症狀" validateOnBlur={false}><Checks name="labor.symptoms" options={LABOR_SYMPTOMS} ariaLabel="自覺症狀" /></Field>
      <ShowIf when="labor.symptoms=other"><TextField name="labor.symptomOther" label="其他症狀說明" /></ShowIf>
    </StepCard>
    <LaborUploadConsent />
  </>;
}
