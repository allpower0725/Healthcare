'use client';

import { useText } from '@/components/forms/context';
import { Checks, Choices, CountySelect, Field, Flag, ShowIf, TextInput } from '@/components/forms/fields';
import { ProfileSection, StepCard } from '@/components/forms/sections';
import { ADULT_BEHAVIORS, ADULT_OPTIONS as O } from '@/lib/forms/defs/adult';
import { ABORIGINAL, SEX } from '@/lib/forms/profile';

function CurrentCounty() {
  const county = useText('profile.addrCounty');
  return county ? <span className="check__sub">（{county}）</span> : null;
}

/** 成人預防保健民眾填寫區（原表單紅框內的欄位）：基本資料 → 其他個人資料 → 疾病史與家族史 → 健康行為 */
export function AdultPublic({ prefilled }: { prefilled: boolean }) {
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
        <Field label="戶籍地" role="group">
          <Flag name="profile.regSame">
            與現住址相同 <CurrentCounty />
          </Flag>
        </Field>
        <ShowIf when="profile.regSame!=1">
          <Field rule="profile.regCounty" label="戶籍地縣市" htmlFor="a-regcounty">
            <CountySelect name="profile.regCounty" id="a-regcounty" />
          </Field>
        </ShowIf>
      </StepCard>

      <StepCard no={3} title="疾病史與家族史" desc="供醫師參考，請盡量詳細填寫。">
        <Field
          rule="adult.dx"
          className="q"
          role="group"
          label="疾病史：您曾被診斷有下列哪些疾病？（可複選）"
          validateOnBlur={false}
        >
          <Checks name="adult.dx" options={O.diseases} />
          <ShowIf when="adult.dx=other">
            <Field rule="adult.dxOther">
              <TextInput name="adult.dxOther" maxLength={20} placeholder="請填寫疾病名稱" ariaLabel="其他疾病名稱" />
            </Field>
          </ShowIf>
        </Field>

        <Field rule="adult.med" className="q" role="radiogroup" label="是否長期服藥？" validateOnBlur={false}>
          <Choices name="adult.med" options={O.med} />
          <ShowIf when="adult.med=1">
            <div className="field">
              <TextInput
                name="adult.medCause"
                maxLength={20}
                placeholder="因為什麼疾病服藥（選填）"
                ariaLabel="長期服藥的病因（選填）"
              />
            </div>
          </ShowIf>
        </Field>

        <Field
          rule="adult.fam"
          className="q"
          role="group"
          label="家族史：您的家人有下列哪些疾病？（可複選）"
          validateOnBlur={false}
        >
          <Checks name="adult.fam" options={O.family} />
          <ShowIf when="adult.fam=cancer">
            <div className="inline-fields">
              <span className="affix affix--wide">
                <span className="affix__text">癌症名稱</span>
                <TextInput name="adult.famCancer" maxLength={12} ariaLabel="家族史癌症名稱（選填）" />
                <span className="affix__text">（選填）</span>
              </span>
            </div>
          </ShowIf>
          <ShowIf when="adult.fam=other">
            <Field rule="adult.famOther">
              <TextInput
                name="adult.famOther"
                maxLength={20}
                placeholder="請填寫其他疾病名稱"
                ariaLabel="家族史其他疾病名稱"
              />
            </Field>
          </ShowIf>
        </Field>
      </StepCard>

      <StepCard no={4} title="健康行為" desc="請依最近的實際情形回答。">
        {ADULT_BEHAVIORS.map((q, i) => (
          <Field
            key={q.key}
            rule={q.key}
            className="q"
            role="radiogroup"
            label={
              <>
                <span className="q__no">{i + 1}</span>
                {q.title}
              </>
            }
            validateOnBlur={false}
          >
            <Choices name={q.key} options={q.options} className={q.options.length > 2 ? 'choices--list' : undefined} />
          </Field>
        ))}
      </StepCard>
    </>
  );
}
