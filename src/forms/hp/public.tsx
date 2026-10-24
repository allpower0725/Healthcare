'use client';

import type { ReactNode } from 'react';
import { Checks, Choices, Field, Flag, ShowIf, TextInput } from '@/components/forms/fields';
import { MobileField, ProfileSection, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { HP_FAMILY, HP_LIFESTYLE, HP_OPTIONS as O, PMH_DISEASE } from '@/lib/forms/defs/hp';
import { SEX } from '@/lib/forms/profile';

const no = (n: number, title: ReactNode) => (
  <>
    <span className="q__no">{n}</span>
    {title}
  </>
);

/** 「其他」等選填說明 */
function Extra({ when, name, max, placeholder, label }: { when: string; name: string; max: number; placeholder: string; label: string }) {
  return (
    <ShowIf when={when}>
      <TextInput name={name} maxLength={max} placeholder={placeholder} ariaLabel={label} className="input--sub" />
    </ShowIf>
  );
}

/** 民國年份（選填）＋不詳 */
function YearOrUnknown({ when, caption, name, aria }: { when: string; caption: string; name: string; aria: string }) {
  return (
    <ShowIf when={when}>
      <div className="inline-fields" role="group" aria-label={`${caption}（選填）`}>
        <span className="field__hint" style={{ margin: 0 }}>
          {caption}（選填）
        </span>
        <span className="affix">
          <span className="affix__text">民國</span>
          <TextInput name={name} maxLength={3} digits ariaLabel={aria} />
          <span className="affix__text">年</span>
        </span>
        <Flag name={`${name}U`}>不詳</Flag>
      </div>
    </ShowIf>
  );
}

/** 某位家人的人數（或稱謂與人數）；胃癌家族史可勾「人數不詳」 */
function RelativeCount({ k, rel, unknownCount }: { k: string; rel: 'sibling' | 'child' | 'other'; unknownCount?: boolean }) {
  const count = (name: string, before: string, aria: string) => (
    <span className="affix">
      <span className="affix__text">{before}</span>
      <TextInput name={name} maxLength={2} digits ariaLabel={aria} />
      <span className="affix__text">人</span>
    </span>
  );
  return (
    <ShowIf when={`${k}Rel=${rel}`}>
      <div className="inline-fields">
        {rel === 'sibling' && count(`${k}Sib`, '兄弟姊妹共', '兄弟姊妹人數')}
        {rel === 'child' && count(`${k}Child`, '子女共', '子女人數')}
        {rel === 'other' && (
          <>
            <span className="affix affix--wide">
              <span className="affix__text">其他：</span>
              <TextInput name={`${k}Other`} maxLength={10} placeholder="例：祖父" ariaLabel="其他家人稱謂" />
            </span>
            {count(`${k}OtherN`, '共', '其他家人人數')}
          </>
        )}
        {unknownCount && (
          <Flag name={`${k}${rel === 'sibling' ? 'SibU' : rel === 'child' ? 'ChildU' : 'OtherU'}`}>人數不詳</Flag>
        )}
      </div>
    </ShowIf>
  );
}

/** 胃幽門螺旋桿菌民眾填寫區：基本資料 → 其他個人資料 → 個人病史 → 家族病史 → 用藥史 → 生活型態 → 同意與簽名 */
export function HpPublic({ prefilled }: { prefilled: boolean }) {
  return (
    <>
      <ProfileSection step={1} prefilled={prefilled} />

      <StepCard no={2} title="其他個人資料" desc="其他表單有相同欄位時，也會自動帶入。">
        <Field rule="profile.sex" label="性別" role="radiogroup" validateOnBlur={false}>
          <Choices name="profile.sex" options={SEX} />
        </Field>
        <Field rule="profile.aboriginal" label="是否為原住民" role="radiogroup" validateOnBlur={false}>
          <Choices name="profile.aboriginal" options={O.aboriginal} />
        </Field>
        <ShowIf when="profile.aboriginal=Y">
          <Field rule="profile.tribe" label="族別" htmlFor="h-tribe">
            <TextInput name="profile.tribe" id="h-tribe" maxLength={12} placeholder="例：阿美族" />
          </Field>
        </ShowIf>
        <MobileField id="h-mobile" />
        <Field rule="hp.religion" label="宗教" role="radiogroup" validateOnBlur={false}>
          <Choices name="hp.religion" options={O.religion} />
          <Extra when="hp.religion=9" name="hp.religionOther" max={20} placeholder="請填寫宗教（選填）" label="其他宗教" />
        </Field>
        <Field rule="hp.job" label="職業" role="radiogroup" validateOnBlur={false}>
          <Choices name="hp.job" options={O.job} />
          <Extra when="hp.job=Y" name="hp.jobName" max={20} placeholder="請填寫職業（選填）" label="職業名稱" />
        </Field>
        <Field rule="hp.marital" label="婚姻狀況" role="radiogroup" validateOnBlur={false}>
          <Choices name="hp.marital" options={O.marital} />
        </Field>
      </StepCard>

      <StepCard no={3} title="個人病史" desc="請依您過去的實際情況回答。">
        <Field rule="hp.pmh" className="q" role="group" label={no(1, '您曾經罹患下列疾病嗎？（可複選）')} validateOnBlur={false}>
          <Checks name="hp.pmh" options={O.pmh} />
          <Extra when="hp.pmh=other" name="hp.pmhOther" max={20} placeholder="請填寫其他疾病（選填）" label="其他疾病" />
          <YearOrUnknown when={PMH_DISEASE} caption="發生年份" name="hp.pmhYear" aria="發生年份（民國年）" />
        </Field>
        <Field rule="hp.eradicate" className="q" role="radiogroup" label={no(2, '曾接受胃幽門桿菌除菌治療')} validateOnBlur={false}>
          <Choices name="hp.eradicate" options={O.noYes} />
        </Field>
        <Field rule="hp.endoscopy" className="q" role="radiogroup" label={no(3, '曾接受過胃鏡檢查')} validateOnBlur={false}>
          <Choices name="hp.endoscopy" options={O.noYes} />
          <YearOrUnknown when="hp.endoscopy=Y" caption="檢查年份" name="hp.endoYear" aria="胃鏡檢查年份（民國年）" />
        </Field>
        <Field
          rule="hp.ppi"
          className="q"
          role="radiogroup"
          label={no(4, '近一個月內是否使用潰瘍／胃食道逆流特效藥（一日一顆）')}
          validateOnBlur={false}
        >
          <Choices name="hp.ppi" options={O.noYes} />
        </Field>
        <Field rule="hp.allergy" className="q" role="radiogroup" label={no(5, '藥物過敏')} validateOnBlur={false}>
          <Choices name="hp.allergy" options={O.noYes} />
          <Extra when="hp.allergy=Y" name="hp.allergyDrug" max={30} placeholder="過敏藥物名稱（選填）" label="過敏藥物名稱" />
        </Field>
      </StepCard>

      <StepCard no={4} title="家族病史" desc="家人中是否有人得過下列疾病；選「有」後請勾選是哪些家人。">
        {HP_FAMILY.map((f, i) => {
          const k = `hp.${f.key}`;
          return (
            <Field key={k} rule={k} className="q" role="radiogroup" label={no(i + 1, f.title)} validateOnBlur={false}>
              <Choices name={k} options={O.family} />
              <ShowIf when={`${k}=Y`}>
                <div className="sub">
                  <Field rule={`${k}Rel`} role="group" label="哪些家人？（可複選）" validateOnBlur={false}>
                    <Checks name={`${k}Rel`} options={O.relatives} />
                  </Field>
                  <RelativeCount k={k} rel="sibling" unknownCount={f.unknownCount} />
                  <RelativeCount k={k} rel="child" unknownCount={f.unknownCount} />
                  <RelativeCount k={k} rel="other" unknownCount={f.unknownCount} />
                </div>
              </ShowIf>
            </Field>
          );
        })}
      </StepCard>

      <StepCard no={5} title="用藥史" desc="最近三個月內的用藥情形。">
        <Field rule="hp.meds" className="q" role="radiogroup" label="最近三個月有無服用下列藥物？" validateOnBlur={false}>
          <Choices name="hp.meds" options={O.noYes} />
          <ShowIf when="hp.meds=Y">
            <div className="sub">
              <Field rule="hp.medList" role="group" label="請勾選有服用的藥物（可複選）" validateOnBlur={false}>
                <Checks name="hp.medList" options={O.medList} className="choices choices--list" />
              </Field>
              <ShowIf when="hp.medList=3">
                <Field role="group" label="抗血小板藥物（可複選，選填）">
                  <Checks name="hp.antiplatelet" options={O.antiplatelet} />
                  <Extra when="hp.antiplatelet=3" name="hp.antiplateletOther" max={20} placeholder="藥名（選填）" label="其他抗血小板藥物" />
                </Field>
              </ShowIf>
              <ShowIf when="hp.medList=4">
                <Field role="group" label="抗凝血劑（可複選，選填）">
                  <Checks name="hp.anticoag" options={O.anticoag} />
                  <Extra when="hp.anticoag=2" name="hp.anticoagOther" max={20} placeholder="藥名（選填）" label="其他抗凝血劑" />
                </Field>
              </ShowIf>
              <ShowIf when="hp.medList=5">
                <Field role="group" label="糖尿病用藥（可複選，選填）">
                  <Checks name="hp.dm" options={O.dm} />
                </Field>
              </ShowIf>
            </div>
          </ShowIf>
        </Field>
      </StepCard>

      <StepCard no={6} title="生活型態" desc="「常常」指每週三次或以上。">
        {HP_LIFESTYLE.map((q, i) => (
          <Field key={q.key} rule={q.key} className="q" role="radiogroup" label={no(i + 1, q.title)} validateOnBlur={false}>
            <Choices name={q.key} options={q.options} />
            {q.other && (
              <Extra when={`${q.key}=3`} name={`${q.key}Other`} max={20} placeholder="請說明（選填）" label={q.other} />
            )}
          </Field>
        ))}
      </StepCard>

      <StepCard no={7} title="同意與簽名" desc="請確認以上資料無誤後簽名。">
        <p className="statement">
          本人同意接受以糞便抗原檢測胃幽門螺旋桿菌檢查，相關資料將作為衛生單位政策評估或個案追蹤健康管理使用。
        </p>
        <Field rule="hp.sigConsent" label="確認以上資料正確無誤。" validateOnBlur={false}>
          <SignatureField name="hp.sigConsent" signer="受檢者本人" />
        </Field>
      </StepCard>
    </>
  );
}
