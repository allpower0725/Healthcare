'use client';

import type { ReactNode } from 'react';
import { useFormContext } from '@/components/forms/context';
import { Checks, Choices, Field, Flag, RocDateInputs, ShowIf, TextInput, TodayButton } from '@/components/forms/fields';
import { StaffCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import type { FormValues } from '@/db/schema';
import {
  ADULT_EXAMS,
  ADULT_LABS,
  ADULT_LABS2,
  ADULT_RESULTS,
  ADULT_RISKS,
  ADULT_STAFF as S,
  adultCalc,
  resultOptions,
} from '@/lib/forms/defs/adult';

/** 原表單的「△」：提供 B、C 型肝炎檢查時的必填欄位 */
function Tri() {
  return <span className="req">△ </span>;
}

function DateField({ prefix, label, tri }: { prefix: string; label: string; tri?: boolean }) {
  return (
    <Field
      rule={prefix}
      role="group"
      label={
        <>
          {tri && <Tri />}
          {label}
        </>
      }
      aside={<TodayButton prefix={prefix} />}
    >
      <RocDateInputs prefix={prefix} label={label} />
    </Field>
  );
}

function Value(props: { name: string; caption: string; unit: string; maxLength: number; digits?: boolean }) {
  return (
    <label className="field">
      <span className="vals__cap">{props.caption}</span>
      <span className="affix">
        <TextInput name={props.name} maxLength={props.maxLength} digits={props.digits} decimal={!props.digits} />
        <span className="affix__text">{props.unit}</span>
      </span>
    </label>
  );
}

function LabRow({ code, name, unit }: { code: string; name: string; unit: string }) {
  return (
    <div className="labrow">
      <p className="labrow__name">{name}</p>
      <div className="labrow__inputs">
        <span className="affix">
          <TextInput name={`adult.${code}`} maxLength={6} decimal ariaLabel={name} />
          <span className="affix__text">{unit}</span>
        </span>
        <span className="affix">
          <span className="affix__text">參考值</span>
          <TextInput name={`adult.${code}Ref`} maxLength={12} ariaLabel={`${name}參考值`} />
        </span>
      </div>
    </div>
  );
}

function Calc({ value, children, note }: { value: ReactNode; children?: ReactNode; note?: ReactNode }) {
  return (
    <p className="calc">
      <span className="calc__val">{value ?? '—'}</span>
      {children}
      {note && <span className="calc__note">{note}</span>}
    </p>
  );
}

/** 成人預防保健院所填寫區 */
export function AdultStaff({ publicData }: { publicData: FormValues }) {
  const { values } = useFormContext();
  const calc = adultCalc({ ...publicData, ...values });

  return (
    <>
      <p className="staff__note">
        標「<span className="req">△</span>」者為提供 B、C 型肝炎檢查時的必填欄位。
      </p>

      <StaffCard title="檢查日期">
        <DateField prefix="adult.s1" label="第一階段日期" tri />
        <DateField prefix="adult.s2" label="第二階段日期" />
      </StaffCard>

      <StaffCard title="服務對象同意簽名" note="請將裝置交給服務對象本人簽名">
        <p className="staff__note">
          成人預防保健服務補助時程：30 歲以上未滿 40 歲每 5 年 1 次；40 歲以上未滿 65 歲每 3 年 1 次；35 歲以上小兒麻痺患者、55
          歲以上原住民或 65 歲以上每年 1 次。相關資料將作為衛生單位政策評估及查詢或個案追蹤健康管理使用。
        </p>
        <Field label="本人同意接受成人預防保健服務（第一階）">
          <SignatureField name="adult.sigS1" signer="服務對象本人（第一階）" />
        </Field>
        <Field label="本人同意接受成人預防保健服務（第二階）">
          <SignatureField name="adult.sigS2" signer="服務對象本人（第二階）" />
        </Field>
        <Field
          label={
            <>
              <Tri />
              本人同意接受 B、C 型肝炎檢查
            </>
          }
          hint="經機構查詢符合檢查條件者，終身一次。"
        >
          <SignatureField name="adult.sigHep" signer="服務對象本人（B、C 型肝炎檢查）" />
        </Field>
      </StaffCard>

      <StaffCard title="身體檢查">
        <div className="vals">
          <Value name="adult.height" caption="身高" unit="公分" maxLength={5} />
          <Value name="adult.weight" caption="體重" unit="公斤" maxLength={5} />
          <Value name="adult.pulse" caption="脈搏" unit="次/分" maxLength={3} digits />
          <Value name="adult.waist" caption="腰圍" unit="公分" maxLength={5} />
        </div>
        <Field label="血壓" role="group">
          <span className="affix affix--bp">
            <TextInput name="adult.sbp" maxLength={3} digits ariaLabel="收縮壓" />
            <span className="affix__text">／</span>
            <TextInput name="adult.dbp" maxLength={3} digits ariaLabel="舒張壓" />
            <span className="affix__text">mmHg</span>
          </span>
        </Field>
        <Field label="身體質量指數（BMI）">
          <Calc value={calc.bmi} note="依身高、體重自動計算：體重（公斤）／身高（公尺）²">
            <span>理想值：18.5 ≦ BMI ＜ 24</span>
          </Calc>
        </Field>

        <Field label="眼睛（視力）" role="group">
          {/* 同一隻眼睛在同一欄：左欄右眼、右欄左眼，與原表單相同 */}
          <div className="eyes">
            <span aria-hidden="true" />
            <span className="eyes__head" aria-hidden="true">
              右眼
            </span>
            <span className="eyes__head" aria-hidden="true">
              左眼
            </span>
            <span className="eyes__row" aria-hidden="true">
              裸眼視力
            </span>
            <TextInput name="adult.vaR" maxLength={5} decimal ariaLabel="右眼裸眼視力" />
            <TextInput name="adult.vaL" maxLength={5} decimal ariaLabel="左眼裸眼視力" />
            <span className="eyes__row" aria-hidden="true">
              矯正視力
            </span>
            <TextInput name="adult.vcR" maxLength={5} decimal ariaLabel="右眼矯正視力" />
            <TextInput name="adult.vcL" maxLength={5} decimal ariaLabel="左眼矯正視力" />
          </div>
        </Field>

        <Field label="耳鼻喉及口腔" role="radiogroup">
          <Choices name="adult.ent" options={S.normal} />
          <ShowIf when="adult.ent=2">
            <Checks name="adult.entAbn" options={S.entAbn} className="choices choices--sub" ariaLabel="耳鼻喉及口腔異常項目" />
          </ShowIf>
        </Field>
        <Field label="頸部：淋巴腺腫大" role="radiogroup">
          <Choices name="adult.lymph" options={S.yesNo} />
        </Field>
        <Field label="頸部：甲狀腺腫大" role="radiogroup">
          <Choices name="adult.thyroid" options={S.yesNo} />
        </Field>
        {ADULT_EXAMS.map(([code, name]) => (
          <Field key={code} label={name} role="radiogroup">
            <Choices name={`adult.ex_${code}`} options={S.normal} />
            <ShowIf when={`adult.ex_${code}=2`}>
              <TextInput
                name={`adult.ex_${code}Note`}
                maxLength={20}
                placeholder="異常說明"
                ariaLabel={`${name}異常說明`}
                className="input--sub"
              />
            </ShowIf>
          </Field>
        ))}
        <Field label="其他異常" htmlFor="s-otherabn">
          <TextInput name="adult.otherAbn" id="s-otherabn" maxLength={40} />
        </Field>
      </StaffCard>

      <StaffCard title="實驗室檢查">
        <Field label="尿液檢查：蛋白質（定性）" role="radiogroup" hint="定性或定量可擇一填寫。">
          <Choices name="adult.uproQual" options={S.uproQual} />
        </Field>
        <div className="labs">
          <LabRow code="uproQuant" name="尿液蛋白質（定量）" unit="mg/dl" />
          {ADULT_LABS.map(([code, name, unit]) => (
            <LabRow key={code} code={code} name={name} unit={unit} />
          ))}
          <div className="labrow">
            <p className="labrow__name">低密度脂蛋白膽固醇計算</p>
            <div className="labrow__inputs">
              <Calc value={calc.ldlNa ? '不適用' : calc.ldl}>
                <span>{calc.ldlNa ? '三酸甘油脂 > 400' : 'mg/dl'}</span>
              </Calc>
              <span className="affix">
                <span className="affix__text">參考值</span>
                <TextInput name="adult.ldlRef" maxLength={12} ariaLabel="低密度脂蛋白膽固醇參考值" />
              </span>
            </div>
            <p className="field__hint">
              依總膽固醇、高密度脂蛋白膽固醇、三酸甘油脂自動計算：總膽固醇－高密度脂蛋白膽固醇－（三酸甘油脂÷5）；僅適用三酸甘油脂
              ≦ 400 mg/dl。
            </p>
          </div>
          {ADULT_LABS2.map(([code, name, unit]) => (
            <LabRow key={code} code={code} name={name} unit={unit} />
          ))}
          <div className="labrow">
            <p className="labrow__name">腎絲球過濾率（eGFR）</p>
            <Calc
              value={calc.egfr}
              note={
                <>
                  依肌酸酐、性別及第一階段日期的年齡（{calc.age ?? '—'} 歲）自動計算：186 ×（血清肌酸酐）<sup>-1.154</sup> ×（年齡）
                  <sup>-0.203</sup>，女性再 × 0.742
                </>
              }
            >
              <span>ml/min/1.73 m²</span>
            </Calc>
          </div>
          <div className="labrow">
            <p className="labrow__name">尿酸</p>
            <div className="labrow__inputs">
              <span className="affix">
                <TextInput name="adult.ua" maxLength={6} decimal ariaLabel="尿酸" />
                <span className="affix__text">mg/dl</span>
              </span>
            </div>
          </div>
        </div>
        <Field
          label={
            <>
              <Tri />B 型肝炎表面抗原（HBsAg）
            </>
          }
          role="radiogroup"
        >
          <Choices name="adult.hbsag" options={S.hepatitis} />
        </Field>
        <Field
          label={
            <>
              <Tri />C 型肝炎抗體（Anti-HCV）
            </>
          }
          role="radiogroup"
        >
          <Choices name="adult.hcv" options={S.hepatitis} />
        </Field>
      </StaffCard>

      <StaffCard title="健康諮詢" note="可複選">
        <Checks name="adult.counsel" options={S.counsel} className="choices choices--wide" ariaLabel="健康諮詢" />
      </StaffCard>

      <StaffCard title="檢查結果與建議">
        {ADULT_RESULTS.map(([code, name]) => (
          <Field key={code} label={name} role="group">
            <Choices name={`adult.res_${code}`} options={resultOptions(code)} />
            <ShowIf when={`adult.res_${code}=2`}>
              <div className="sub">
                {code === 'renal' && (
                  <div className="inline-fields inline-fields--top">
                    <span className="affix">
                      <span className="affix__text">期別</span>
                      <TextInput name="adult.res_renalStage" maxLength={3} ariaLabel="腎功能期別" />
                    </span>
                  </div>
                )}
                <p className="sub__title">建議（可複選）</p>
                <Checks
                  name={`adult.res_${code}Adv`}
                  options={S.advice}
                  className="choices choices--list"
                  ariaLabel={`${name}建議`}
                />
                <ShowIf when={`adult.res_${code}Adv=life`}>
                  <div className="inline-fields">
                    <span className="affix">
                      <span className="affix__text">定期</span>
                      <TextInput name={`adult.res_${code}Mon`} maxLength={2} digits ariaLabel={`${name}追蹤間隔（月）`} />
                      <span className="affix__text">個月追蹤</span>
                    </span>
                  </div>
                </ShowIf>
              </div>
            </ShowIf>
          </Field>
        ))}
        <p className="staff__note">
          代謝症候群定義：腰圍、血壓、空腹血糖、三酸甘油脂、高密度脂蛋白膽固醇，其中三項或超過三項異常。
        </p>

        <Field label="慢性疾病風險值" role="group">
          {ADULT_RISKS.map(([code, name]) => (
            <div className="riskrow" key={code}>
              <span className="riskrow__name">{name}</span>
              <ShowIf when={`adult.risk_${code}NA!=1`}>
                <span className="affix">
                  <TextInput name={`adult.risk_${code}`} maxLength={5} decimal ariaLabel={`${name}風險值`} />
                  <span className="affix__text">%</span>
                </span>
              </ShowIf>
              <Flag name={`adult.risk_${code}NA`}>不適用</Flag>
            </div>
          ))}
        </Field>

        <Field
          label={
            <>
              <Tri />B 型肝炎表面抗原
            </>
          }
          hint="檢驗結果選陰性或陽性時會自動帶入。"
        >
          <Checks name="adult.resHbv" options={S.hepResult} ariaLabel="B 型肝炎表面抗原結果" />
        </Field>
        <Field
          label={
            <>
              <Tri />C 型肝炎抗體
            </>
          }
        >
          <Checks name="adult.resHcv" options={S.hepResult} ariaLabel="C 型肝炎抗體結果" />
        </Field>
        <Field label="咳嗽症狀" role="radiogroup" hint="預設為民眾填寫的回答。">
          <Choices name="adult.resCough" options={S.resCough} className="choices--list" />
        </Field>
      </StaffCard>

      <StaffCard title="特約醫事服務機構與檢查醫師">
        <Field
          label={
            <>
              <Tri />
              特約醫事服務機構名稱及代號
            </>
          }
          htmlFor="s-orgname"
        >
          <TextInput name="adult.org" id="s-orgname" maxLength={40} />
        </Field>
        <Field
          label={
            <>
              <Tri />
              檢查醫師簽名（蓋章）
            </>
          }
        >
          <SignatureField name="adult.sigDoctor" signer="檢查醫師" />
        </Field>
        <div className="sub">
          <p className="sub__title">雙軌作業（選填）</p>
          <p className="field__hint">
            服務對象如為特約醫事檢驗機構依雙軌作業方式提供第一階段檢驗檢查服務者，請填其自行選定的第二階段服務機構。
          </p>
          <Field label="第二階段特約醫事服務機構名稱" htmlFor="s-dualorg">
            <TextInput name="adult.dualOrg" id="s-dualorg" maxLength={30} />
          </Field>
          <Field label="地址" htmlFor="s-dualaddr">
            <TextInput name="adult.dualAddr" id="s-dualaddr" maxLength={60} />
          </Field>
        </div>
      </StaffCard>
    </>
  );
}
