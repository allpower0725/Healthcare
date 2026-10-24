'use client';

import { Choices, Field } from '@/components/forms/fields';
import { MobileField, ProfileSection, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { ORAL_OPTIONS as O } from '@/lib/forms/defs/oral';
import { ABORIGINAL, type Option, SEX } from '@/lib/forms/profile';

/** 前兩個選項（無、已戒）並排，其餘一行一個 */
function HabitChoices({ name, options }: { name: string; options: readonly Option[] }) {
  return (
    <>
      <Choices name={name} options={options.slice(0, 2)} />
      <Choices name={name} options={options.slice(2)} className="choices--list choices--sub" />
    </>
  );
}

/** 口腔黏膜檢查民眾填寫區：基本資料 → 其他個人資料 → 菸檳習慣與口腔症狀 → 同意與簽名 */
export function OralPublic({ prefilled }: { prefilled: boolean }) {
  return (
    <>
      <ProfileSection step={1} prefilled={prefilled} />

      <StepCard no={2} title="其他個人資料" desc="其他表單有相同欄位時，也會自動帶入。">
        <Field rule="profile.sex" label="性別" role="radiogroup" validateOnBlur={false}>
          <Choices name="profile.sex" options={SEX} />
        </Field>
        <Field rule="profile.aboriginal" label="是否為原住民" role="radiogroup" validateOnBlur={false}>
          <Choices name="profile.aboriginal" options={ABORIGINAL} />
        </Field>
        <MobileField id="o-mobile" />
      </StepCard>

      <StepCard no={3} title="菸檳習慣與口腔症狀" desc="請依目前的實際情況選擇。">
        <Field
          rule="oral.betel"
          className="q"
          role="radiogroup"
          label={
            <>
              <span className="q__no">1</span>嚼檳榔習慣
            </>
          }
          validateOnBlur={false}
        >
          <HabitChoices name="oral.betel" options={O.betel} />
        </Field>
        <Field
          rule="oral.smoke"
          className="q"
          role="radiogroup"
          label={
            <>
              <span className="q__no">2</span>吸菸習慣
            </>
          }
          validateOnBlur={false}
        >
          <HabitChoices name="oral.smoke" options={O.smoke} />
        </Field>
        <Field
          rule="oral.symptom"
          className="q"
          role="radiogroup"
          label={
            <>
              <span className="q__no">3</span>自覺口腔黏膜有無異常症狀？
            </>
          }
          validateOnBlur={false}
        >
          <p className="field__hint q__hint">如異常顏色斑塊、口腔黏膜疼痛、難癒合之潰瘍及腫塊症狀</p>
          <Choices name="oral.symptom" options={O.noYes} />
        </Field>
      </StepCard>

      <StepCard no={4} title="同意與簽名" desc="請確認以上資料無誤後簽名。">
        <p className="statement">本人同意接受口腔黏膜檢查，相關資料將作為衛生單位政策評估或個案追蹤健康管理使用。</p>
        <Field rule="oral.sigConsent" label="確認以上資料及菸檳習慣資料正確無誤。" validateOnBlur={false}>
          <SignatureField name="oral.sigConsent" signer="受檢者本人" />
        </Field>
      </StepCard>
    </>
  );
}
