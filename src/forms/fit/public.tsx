'use client';

import type { ReactNode } from 'react';
import { Checks, Choices, Field, ShowIf, TextInput } from '@/components/forms/fields';
import { MobileField, ProfileSection, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { FIT_ANNEX, FIT_ANNEX_TABLES, FIT_OPTIONS as O, FIT_RELATIVES } from '@/lib/forms/defs/fit';
import { SEX } from '@/lib/forms/profile';

const no = (n: number, title: ReactNode) => (
  <>
    <span className="q__no">{n}</span>
    {title}
  </>
);

/** 選填的年齡欄（例：開始吸菸年齡） */
function AgeInput({ name, caption }: { name: string; caption: string }) {
  return (
    <div className="inline-fields">
      <span className="affix">
        <span className="affix__text">{caption}</span>
        <TextInput name={name} maxLength={3} digits ariaLabel={`${caption}（選填）`} />
        <span className="affix__text">歲（選填）</span>
      </span>
    </div>
  );
}

/** 附表五之六的家族罹癌表：先勾選哪些家人，再填每位家人的癌別、罹癌人數、罹癌年紀 */
function AnnexTable({ table }: { table: (typeof FIT_ANNEX_TABLES)[number] }) {
  const k = table.key;
  return (
    <Field className="q" label={table.title}>
      <div className="sub">
        <Field
          rule={`${k}Rel`}
          role="group"
          label={`${table.question}（可複選）`}
          hint="勾選後請填寫下方資料；癌別、人數、年紀不清楚可留空。"
          validateOnBlur={false}
        >
          <Checks name={`${k}Rel`} options={FIT_RELATIVES.map((r) => [r.value, r.label] as const)} />
        </Field>
        {FIT_RELATIVES.map((r) => (
          <ShowIf key={r.value} when={`${k}Rel=${r.value}`}>
            <div className="famrow">
              <p className="famrow__title">{r.label}</p>
              <div className="inline-fields">
                {table.withType && (
                  <span className="affix affix--wide">
                    <span className="affix__text">癌別</span>
                    <TextInput name={`${k}${r.value}Type`} maxLength={12} ariaLabel={`${r.label}癌別（選填）`} />
                  </span>
                )}
                {r.max > 1 && (
                  <span className="affix">
                    <span className="affix__text">罹癌人數</span>
                    <TextInput name={`${k}${r.value}N`} maxLength={2} digits ariaLabel={`${r.label}罹癌人數（選填）`} />
                    <span className="affix__text">人</span>
                  </span>
                )}
                <span className="ages">
                  <span className="ages__unit">罹癌年紀（歲）</span>
                  <span className="ages__inputs">
                    {Array.from({ length: r.max }, (_, i) => (
                      <TextInput
                        key={i}
                        name={`${k}${r.value}Age${i + 1}`}
                        maxLength={3}
                        digits
                        ariaLabel={`${r.label}罹癌年紀${r.max > 1 ? `第 ${i + 1} 位` : ''}（選填）`}
                      />
                    ))}
                  </span>
                </span>
              </div>
            </div>
          </ShowIf>
        ))}
      </div>
    </Field>
  );
}

/** 糞便潛血檢查民眾填寫區：基本資料 → 其他個人資料 → 吸菸、家族病史與症狀 →（附表五之六）→ 同意與簽名 */
export function FitPublic({ prefilled }: { prefilled: boolean }) {
  return (
    <>
      <ProfileSection step={1} prefilled={prefilled} />

      <StepCard no={2} title="其他個人資料" desc="其他表單有相同欄位時，也會自動帶入。">
        <Field rule="profile.sex" label="性別" role="radiogroup" validateOnBlur={false}>
          <Choices name="profile.sex" options={SEX} />
        </Field>
        <MobileField id="f-mobile" />
      </StepCard>

      <StepCard
        no={3}
        title="吸菸、家族病史與症狀"
        desc="前三題任一題選「有」，下方會再出現「家族史及吸菸習慣資料表」。"
      >
        <Field rule="fit.smoke" className="q" role="radiogroup" label={no(1, '吸菸史')} validateOnBlur={false}>
          <Choices name="fit.smoke" options={O.smoke} />
          <ShowIf when="fit.smoke=1">
            <AgeInput name="fit.smokeAge" caption="開始吸菸年齡" />
          </ShowIf>
        </Field>
        <Field
          rule="fit.famCrc"
          className="q"
          role="radiogroup"
          label={no(2, '請問與您有血緣的父母、兄弟姐妹或子女或其他親屬，有無得過大腸直腸癌？')}
          validateOnBlur={false}
        >
          <Choices name="fit.famCrc" options={O.family} />
        </Field>
        <Field
          rule="fit.famCa"
          className="q"
          role="radiogroup"
          label={no(3, '請問與您有血緣的父母、兄弟姐妹或子女或其他親屬，有無得過其他癌症？')}
          validateOnBlur={false}
        >
          <Choices name="fit.famCa" options={O.family} />
        </Field>
        <Field
          rule="fit.symptom"
          className="q"
          role="radiogroup"
          label={no(4, '請問您有無腸道不適症狀？')}
          validateOnBlur={false}
        >
          <p className="field__hint q__hint">如腹瀉、便秘、糞便變稠、排泄黏液、便血、黃便帶血或其他症狀</p>
          <Choices name="fit.symptom" options={O.noYes} />
        </Field>
      </StepCard>

      {/* 附表五之六：上一步任一題選「有」才出現；不編號以免步驟跳號 */}
      <ShowIf when={FIT_ANNEX}>
        <StepCard
          no="附"
          className="step--annex"
          title="家族史及吸菸習慣資料表"
          desc="因上一步有選「有」，請再填寫這份資料表（附表五之六），供後續政策評估使用。"
        >
          <Field
            rule="fit.annexConsent"
            role="radiogroup"
            label="是否同意進行以下大腸癌篩檢之家族史及吸菸習慣問卷填答？"
            validateOnBlur={false}
          >
            <Choices name="fit.annexConsent" options={O.consent} />
          </Field>
          <ShowIf when="fit.annexConsent=Y">
            <ShowIf when="fit.smoke=1">
              <Field rule="fit.smokeHabit" className="q" role="radiogroup" label="吸菸習慣" validateOnBlur={false}>
                <Choices name="fit.smokeHabit" options={O.smokeHabit} className="choices--list" />
                <ShowIf when="fit.smokeHabit=1">
                  <AgeInput name="fit.quitAge" caption="戒菸年齡" />
                </ShowIf>
              </Field>
            </ShowIf>
            {FIT_ANNEX_TABLES.map((t) => (
              <ShowIf key={t.key} when={t.when}>
                <AnnexTable table={t} />
              </ShowIf>
            ))}
            <p className="field__hint">
              其他父系親屬：僅含曾祖父母、祖父母、伯、叔、姑、姪男（女）、孫子（女）。其他母系親屬：僅含外曾祖父母、外祖父母、舅父、姨母、外甥（女）、外孫子（女）。若罹癌人數超過
              3 位，請填最年輕的 3 位罹癌年紀。
            </p>
          </ShowIf>
          <Field rule="fit.sigAnnex" label="本人簽名" validateOnBlur={false}>
            <SignatureField name="fit.sigAnnex" signer="受檢者本人" />
          </Field>
        </StepCard>
      </ShowIf>

      <StepCard no={4} title="同意與簽名" desc="請確認以上資料無誤後簽名。">
        <p className="statement">
          本人同意接受糞便潛血檢查，本表資料將作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。
        </p>
        <Field rule="fit.sigConsent" label="確認以上資料正確無誤。" validateOnBlur={false}>
          <SignatureField name="fit.sigConsent" signer="受檢者本人" />
        </Field>
      </StepCard>
    </>
  );
}
