'use client';

import { Checks, Choices, Field, ShowIf, TextInput } from '@/components/forms/fields';
import { DateField, StaffCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import type { FormValues } from '@/db/schema';
import { conditionsHold } from '@/lib/forms/engine';
import { FIT_ANNEX, FIT_CHECKLIST, FIT_OPTIONS as O } from '@/lib/forms/defs/fit';

/** 「其他」選項的說明欄 */
function Other({ when, name, label, placeholder = '請說明' }: { when: string; name: string; label: string; placeholder?: string }) {
  return (
    <ShowIf when={when}>
      <TextInput name={name} maxLength={30} placeholder={placeholder} ariaLabel={label} className="input--sub" />
    </ShowIf>
  );
}

/** 衛教指引檢核表的一欄評值 */
function Checklist({ n }: { n: 1 | 2 }) {
  const k = `fit.edu${n}`;
  return (
    <div className="sub" role="group" aria-label={`評值（${n === 1 ? '一' : '二'}）`}>
      <p className="sub__title">
        評值（{n === 1 ? '一' : '二'}）{n === 2 && <span className="opt">選填</span>}
      </p>
      <DateField prefix={k} label="評值日期" />
      <div className="grid2">
        <Field label="姓名" htmlFor={`s-edu${n}-name`}>
          <TextInput name={`${k}Name`} id={`s-edu${n}-name`} maxLength={20} />
        </Field>
        <Field label="病歷號或 ID" htmlFor={`s-edu${n}-pid`}>
          <TextInput name={`${k}Pid`} id={`s-edu${n}-pid`} maxLength={20} />
        </Field>
      </div>
      {FIT_CHECKLIST.map((s, i) => (
        <Field
          key={s.step}
          role="group"
          label={
            <>
              {s.step}
              {s.title}
            </>
          }
        >
          <Checks name={`${k}S${i + 1}`} options={s.items.map(([v, label]) => [v, label.replace(/^:/, '')] as const)} />
        </Field>
      ))}
    </div>
  );
}

/** 糞便潛血檢查院所填寫區：收案資訊 → 檢查情形 → 檢驗結果 → 確診結果（陽性）→ 衛教檢核表 → 附表訪問人員 */
export function FitStaff({ publicData }: { publicData: FormValues }) {
  // 院所區的條件只看院所欄位；附表是否適用要看民眾填的答案
  const annex = conditionsHold(FIT_ANNEX, publicData);
  return (
    <>
      <StaffCard title="收案資訊">
        <Field role="radiogroup" label="支付方式">
          <Choices name="fit.pay" options={O.pay} codes />
        </Field>
        <Field role="radiogroup" label="篩檢地點">
          <Choices name="fit.site" options={O.site} codes />
        </Field>
      </StaffCard>

      <StaffCard title="個案檢查情形" note="檢查醫療院所填寫">
        <Field label="檢查醫療院所名稱及代碼" htmlFor="s-clinic">
          <TextInput name="fit.clinic" id="s-clinic" maxLength={40} />
        </Field>
        <DateField prefix="fit.visit" label="門診日期" />
      </StaffCard>

      <StaffCard title="糞便潛血檢查結果" note="糞便潛血檢驗機構填寫">
        <Field label="1. 醫事檢驗機構／醫療院所名稱及代碼" htmlFor="s-lab">
          <TextInput name="fit.lab" id="s-lab" maxLength={40} />
        </Field>
        <DateField prefix="fit.lab" label="2. 檢驗日期" />
        <Field role="radiogroup" label="3. 檢驗結果">
          <Choices name="fit.result" options={O.result} codes />
          <div className="inline-fields">
            <span className="affix affix--wide">
              <span className="affix__text">數值</span>
              <TextInput name="fit.value" maxLength={10} ariaLabel="檢驗數值" />
            </span>
          </div>
        </Field>
        <Field role="radiogroup" label="4. 定量試劑商品名稱">
          <Choices name="fit.reagent" options={O.reagent} codes />
          <Other when="fit.reagent=2" name="fit.reagentOther" label="其他定量試劑名稱" placeholder="試劑名稱" />
        </Field>
      </StaffCard>

      <ShowIf when="fit.result=1">
        <StaffCard title="個案確診結果" note="陽性個案">
          <Field role="radiogroup" label="檢查後三個月內有沒有接受後續確診？">
            <Choices name="fit.followed" options={O.followed} codes />
          </Field>
          <ShowIf when="fit.followed=0">
            <Field role="radiogroup" label="沒有接受確診理由">
              <Choices name="fit.noReason" options={O.noReason} codes />
              <Other when="fit.noReason=6" name="fit.noReasonOther" label="其他未確診理由" />
            </Field>
          </ShowIf>
          <ShowIf when="fit.followed=1">
            <Field label="確診醫療院所名稱及代碼" htmlFor="s-chosp">
              <TextInput name="fit.confirmHospital" id="s-chosp" maxLength={40} />
            </Field>
            <DateField prefix="fit.confirm" label="確診日期" />
            <Field role="radiogroup" label="檢查方法">
              <Choices name="fit.method" options={O.method} codes />
              <Other when="fit.method=9" name="fit.methodOther" label="其他檢查方法" placeholder="檢查方法" />
            </Field>
            <Field role="group" label="診斷（可複選）">
              <Checks name="fit.dx" options={O.dx} codes />
              <Other when="fit.dx=9" name="fit.dxOther" label="其他診斷" placeholder="其他診斷" />
            </Field>
            <ShowIf when="fit.dx=3">
              <Field role="radiogroup" label="息肉有無切除">
                <Choices name="fit.polypCut" options={O.polypCut} codes />
              </Field>
            </ShowIf>
          </ShowIf>
        </StaffCard>
      </ShowIf>

      <StaffCard title="大腸癌篩檢衛教指引檢核表">
        <Checklist n={1} />
        <Checklist n={2} />
      </StaffCard>

      {annex && (
        <StaffCard title="家族史及吸菸習慣資料表" note="訪問人員填寫">
          <Field label="訪問人員簽名（醫療院所）">
            <SignatureField name="fit.sigInterviewer" signer="訪問人員" />
          </Field>
          <DateField prefix="fit.iv" label="日期" />
          <p className="field__hint">備註：大腸癌篩檢家族史及吸菸習慣資料表，請視同病歷資料留存院所備查。</p>
        </StaffCard>
      )}
    </>
  );
}
