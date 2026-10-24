'use client';

import { Checks, Choices, Field, RocDateInputs, ShowIf, TextInput, TodayButton } from '@/components/forms/fields';
import { Req, StaffCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { HPV_STAFF_OPTIONS as O } from '@/lib/forms/defs/hpv';

function DateField({ prefix, label }: { prefix: string; label: string }) {
  return (
    <Field
      rule={prefix}
      role="group"
      label={
        <>
          <Req />
          {label}
        </>
      }
      aside={<TodayButton prefix={prefix} />}
    >
      <RocDateInputs prefix={prefix} label={label} />
    </Field>
  );
}

/** HPV 院所填寫區：收案資訊 → 採檢資料 → 檢驗資料 */
export function HpvStaff() {
  return (
    <>
      <StaffCard title="收案資訊">
        <Field role="radiogroup" label={<><Req />國籍</>}>
          <Choices name="hpv.nationality" options={O.nationality} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />抹片車或社區巡迴服務</>}>
          <Choices name="hpv.van" options={O.van} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />支付方式</>}>
          <Choices name="hpv.pay" options={O.pay} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />無法判讀重做？</>}>
          <Choices name="hpv.redo" options={O.redo} codes />
        </Field>
        <div className="grid2">
          <Field label="時程代碼" htmlFor="s-schedule">
            <TextInput name="hpv.schedule" id="s-schedule" maxLength={2} />
          </Field>
        </div>
      </StaffCard>

      <StaffCard title="採檢資料" note="採檢醫療機構填寫">
        <Field label={<><Req />採檢醫療機構（機構代碼）</>} htmlFor="s-org">
          <TextInput name="hpv.collectOrg" id="s-org" maxLength={10} digits />
        </Field>
        <DateField prefix="hpv.collect" label="採檢體日期" />
        <Field label={<><Req />檢體取樣醫事人員簽名（或蓋章）</>}>
          <SignatureField name="hpv.sigCollector" signer="檢體取樣醫事人員" />
        </Field>
        <Field role="radiogroup" label="檢體取樣醫事人員身分別">
          <Choices name="hpv.collectorRole" options={O.collectorRole} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />本次是否同時進行抹片檢查</>}>
          <Choices name="hpv.withPap" options={O.withPap} codes />
        </Field>
        <Field role="radiogroup" label="做 HPV 檢查目的">
          <Choices name="hpv.purpose" options={O.purpose} codes />
        </Field>
      </StaffCard>

      <StaffCard title="檢驗資料" note="檢驗單位填寫">
        <Field label={<><Req />檢驗實驗室（機構代碼）</>} htmlFor="s-lab">
          <TextInput name="hpv.lab" id="s-lab" maxLength={10} digits />
        </Field>
        <Field label={<><Req />檢體編號</>} htmlFor="s-specimen">
          <TextInput name="hpv.specimenNo" id="s-specimen" maxLength={30} />
        </Field>
        <DateField prefix="hpv.recv" label="檢體收到日期" />
        <DateField prefix="hpv.report" label="發報告日期" />

        <Field role="radiogroup" label={<><Req />檢驗試劑</>}>
          <Choices name="hpv.reagent" options={O.reagent} codes className="choices--wide" />
          <ShowIf when="hpv.reagent=99">
            <TextInput
              name="hpv.reagentOther"
              maxLength={40}
              placeholder="請填寫試劑名稱"
              ariaLabel="其他檢驗試劑名稱"
              style={{ marginTop: '.5rem' }}
            />
          </ShowIf>
        </Field>

        <Field role="radiogroup" label={<><Req />檢驗結果</>}>
          <Choices name="hpv.judge" options={O.judge} codes />
          <ShowIf when="hpv.judge=1">
            <div className="sub" role="group" aria-label="High-risk HPV">
              <p className="sub__title">1. High-risk HPV</p>
              <Choices name="hpv.hr" options={O.posNeg} codes />
              <ShowIf when="hpv.hr=1">
                <Checks name="hpv.hrTypes" options={O.hrTypes.slice(0, 15)} className="types" ariaLabel="High-risk HPV 陽性型別" />
                <Checks name="hpv.hrTypes" options={O.hrTypes.slice(15)} className="types types--wide" ariaLabel="不分型" />
              </ShowIf>
            </div>
            <div className="sub" role="group" aria-label="Low-risk HPV">
              <p className="sub__title">2. Low-risk HPV</p>
              <Choices name="hpv.lr" options={O.posNegUntested} codes />
              <ShowIf when="hpv.lr=1">
                <Checks name="hpv.lrTypes" options={O.lrTypes} className="types" ariaLabel="Low-risk HPV 陽性型別" />
              </ShowIf>
            </div>
            <div className="sub" role="group" aria-label="其他型別">
              <p className="sub__title">3. 其他型別</p>
              <Choices name="hpv.ot" options={O.posNegUntested} codes />
              <ShowIf when="hpv.ot=1">
                <div className="types-inputs" role="group" aria-label="其他陽性型別">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TextInput key={i} name={`hpv.ot${i}`} maxLength={6} ariaLabel={`型別 ${i}`} />
                  ))}
                </div>
              </ShowIf>
            </div>
          </ShowIf>
        </Field>

        <Field label={<><Req />檢驗者簽名（或蓋章）</>}>
          <SignatureField name="hpv.sigLab" signer="檢驗者" />
        </Field>
      </StaffCard>
    </>
  );
}
