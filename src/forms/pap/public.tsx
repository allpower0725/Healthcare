'use client';

import { Choices, Field, RocDateInputs, ShowIf, TextInput } from '@/components/forms/fields';
import { ProfileSection, RegisteredRegionStep, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { PAP_QUESTIONS } from '@/lib/forms/defs/pap';

function Question({ q }: { q: (typeof PAP_QUESTIONS)[number] }) {
  return (
    <Field rule={q.key} className="q" role="radiogroup" label={q.title} hint={q.hint} validateOnBlur={false}>
      <Choices name={q.key} options={q.options} />
      {q.key === 'pap.q15' && (
        <ShowIf when="pap.q15=1">
          <div className="inline-fields">
            <span className="affix">
              <span className="affix__text">接種年份 民國</span>
              <TextInput name="pap.q15Year" maxLength={3} digits ariaLabel="HPV 疫苗接種年份（民國年，選填）" />
              <span className="affix__text">年（選填）</span>
            </span>
          </div>
        </ShowIf>
      )}
    </Field>
  );
}

/** 子宮頸抹片民眾填寫區：基本資料 → 戶籍地址 → 健康狀況 → 同意與簽名 */
export function PapPublic({ prefilled }: { prefilled: boolean }) {
  const [q9, q10, ...rest] = PAP_QUESTIONS;
  return (
    <>
      <ProfileSection step={1} prefilled={prefilled} />

      <RegisteredRegionStep no={2} />

      <StepCard no={3} title="健康狀況" desc="不清楚的題目可選「不知道」。">
        <Question q={q9} />
        <Question q={q10} />
        <ShowIf when="pap.q10!=1">
          <Field
            rule="pap.q11"
            className="q"
            role="group"
            label={
              <>
                最後一次月經日期 <span className="opt">選填</span>
              </>
            }
            hint="記不清楚可留空。"
          >
            <RocDateInputs prefix="pap.q11" label="最後一次月經日期" />
          </Field>
        </ShowIf>
        {rest.map((q) => (
          <Question key={q.key} q={q} />
        ))}
      </StepCard>

      <StepCard no={4} title="同意與簽名" desc="請確認以上資料無誤後簽名。">
        <p className="statement">
          本表資料將會作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。
        </p>
        <Field rule="pap.sigConsent" label="本人同意接受檢查，確認以上資料正確無誤。" validateOnBlur={false}>
          <SignatureField name="pap.sigConsent" signer="受檢者本人" />
        </Field>
      </StepCard>
    </>
  );
}
