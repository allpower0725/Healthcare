'use client';

import { useFormContext, useText } from '@/components/forms/context';
import { Choices, Field, Flag, ShowIf, TextInput } from '@/components/forms/fields';
import { DateField, StepCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { LABOR_UPLOAD_CONSENT, LABOR_UPLOAD_REPRESENTATIVE, LABOR_UPLOAD_USE, LABOR_UPLOAD_YEARS } from '@/lib/forms/defs/labor-upload';
import { HOSPITAL_NAME } from '@/lib/forms/hospital';

function YearsField({ name, label }: { name: string; label: string }) {
  return <Field rule={name} label={label} htmlFor={name} hint="請填 1–999 的整數年數。">
    <div className="rocdate"><span className="date-part date-part--year">
      <TextInput name={name} id={name} digits maxLength={3} /><span className="rocdate__unit">年</span>
    </span></div>
  </Field>;
}

/** 原文完整保留；以段落呈現供手機閱讀，期間等選擇在下方逐項填寫。 */
function ConsentTerms() {
  return <details className="labor-consent__terms">
    <summary>閱讀完整同意書與個人資料權利</summary>
    <h3>個人自費檢驗（查）、藥品、醫材資料蒐集處理及利用同意書</h3>
    <p>本人＿＿＿＿同意{HOSPITAL_NAME}（機構名稱）將本人自民國＿＿年＿＿月＿＿日起算 □7 年或 □＿＿年內，於該機構接受自費檢驗（查）、藥品、醫材等資料之下列個人資料（包括姓名、身分證字號、生日、性別、自費檢驗（查）結果、藥品、醫材等資料），於本人簽署本同意書日期起算 □永久或 □＿＿年內，提供予衛生福利部中央健康保險署（下稱健保署），做為載入本人之健康存摺及 □健保醫療資訊雲端查詢系統，並得於本人醫療需要範圍內予以蒐集、處理或利用。</p>
    <p>本人已瞭解就提供之個人資料得依個人資料保護法第 3 條規定，保留隨時取消本同意書之權利，並得行使：申請查詢或請求閱覽、製給複製本、補充、更正、停止蒐集、處理或利用及請求刪除等權利。</p>
    <p>此致　{HOSPITAL_NAME}、衛生福利部中央健康保險署</p>
    <p className="field__hint">原稿的姓名、出生日期、證件號會由基本資料帶入；同意後請在下方選擇各項期間，並完成本人及適用時的法定代理人簽署。</p>
  </details>;
}

export function LaborUploadConsent() {
  const { readOnly } = useFormContext();
  const consent = useText('labor.uploadConsent');
  const name = useText('profile.name');
  const idNo = useText('profile.idNo');
  const birth = [useText('profile.birthY'), useText('profile.birthM'), useText('profile.birthD')];
  const representativeName = useText('labor.uploadRepresentativeName');
  return <StepCard no={6} title="資料上傳同意書" className="labor-consent" desc="由您決定是否提供自費檢驗（查）、藥品及醫材資料，以及提供的範圍與期間。">
    <p className="notice">同意後，本院可依您選擇的範圍與期間，將相關資料提供予健保署，載入健康存摺，方便您查閱。另可選擇提供至健保醫療資訊雲端查詢系統，供醫療需要範圍內使用。</p>
    <ConsentTerms />
    {readOnly && !consent && <p className="notice">資料上傳同意書：尚未填寫。</p>}
    <Field rule="labor.uploadConsent" label="是否同意上述個人資料蒐集、處理及利用？" role="radiogroup" validateOnBlur={false} hint="請擇一；選擇不同意，仍可完成本份健檢問卷。">
      <Choices name="labor.uploadConsent" options={LABOR_UPLOAD_CONSENT} className="choices--list" />
    </Field>
    <ShowIf when="labor.uploadConsent=Y">
      <div className="labor-consent__section">
        <h3>資料範圍</h3>
        <p className="field__hint">提供機構：{HOSPITAL_NAME}。資料包含姓名、身分證字號、生日、性別，以及自費檢驗（查）結果、藥品及醫材等資料。</p>
        <DateField prefix="labor.uploadFrom" label="資料起算日期" req hint="從哪一天開始計算欲提供的資料期間。" />
        <Field rule="labor.uploadYearsMode" label="自起算日起，涵蓋幾年內的資料？" role="radiogroup" validateOnBlur={false}>
          <Choices name="labor.uploadYearsMode" options={LABOR_UPLOAD_YEARS} />
        </Field>
        <ShowIf when="labor.uploadYearsMode=custom"><YearsField name="labor.uploadYears" label="涵蓋資料的年數" /></ShowIf>
      </div>
      <div className="labor-consent__section">
        <h3>利用期間與提供系統</h3>
        <Field rule="labor.uploadUseMode" label="自簽署日起，同意提供健保署利用多久？" role="radiogroup" validateOnBlur={false}>
          <Choices name="labor.uploadUseMode" options={LABOR_UPLOAD_USE} className="choices--list" />
        </Field>
        <ShowIf when="labor.uploadUseMode=custom"><YearsField name="labor.uploadUseYears" label="自簽署日起的利用年數" /></ShowIf>
        <Field label={<>提供至健保醫療資訊雲端查詢系統 <span className="opt">選填</span></>} hint="同意書已包含健康存摺；如也同意提供至健保醫療資訊雲端查詢系統，請另勾選。" validateOnBlur={false}>
          <Flag name="labor.uploadCloud">另同意提供至健保醫療資訊雲端查詢系統</Flag>
        </Field>
      </div>
      <div className="labor-consent__section">
        <h3>確認身分與簽署</h3>
        <dl className="labor-consent__identity">
          <div><dt>姓名</dt><dd>{name || '尚未填寫'}</dd></div>
          <div><dt>出生日期</dt><dd>{birth.every(Boolean) ? `民國 ${birth[0]} 年 ${birth[1]} 月 ${birth[2]} 日` : '尚未完整填寫'}</dd></div>
          <div><dt>證件號碼</dt><dd>{idNo}</dd></div>
          <div><dt>機構名稱</dt><dd>{HOSPITAL_NAME}</dd></div>
        </dl>
        <p className="field__hint">已沿用本次健檢的基本資料；如有誤，請回上方基本資料修正。</p>
        <DateField prefix="labor.uploadSigned" label="簽署日期" req />
        <Field rule="labor.uploadHasRepresentative" label="是否有法定代理人？" role="radiogroup" validateOnBlur={false}>
          <Choices name="labor.uploadHasRepresentative" options={LABOR_UPLOAD_REPRESENTATIVE} />
        </Field>
        <ShowIf when="labor.uploadHasRepresentative=Y">
          <Field rule="labor.uploadRepresentativeName" label="法定代理人姓名" htmlFor="labor-representative-name">
            <TextInput name="labor.uploadRepresentativeName" id="labor-representative-name" maxLength={40} />
          </Field>
          <Field rule="labor.uploadRepresentativeIdNo" label="法定代理人身分證號／證件號" htmlFor="labor-representative-id">
            <TextInput name="labor.uploadRepresentativeIdNo" id="labor-representative-id" uppercase maxLength={20} />
          </Field>
        </ShowIf>
        <p className="notice">本人已瞭解並同意上述內容，保留隨時取消同意，以及查詢、閱覽、取得複製本、補充、更正、停止蒐集、處理或利用及請求刪除等權利。</p>
        <Field rule="labor.uploadSignature" label="立同意書人簽名" validateOnBlur={false} hint="請為本同意書獨立簽名；修改同意範圍、身分資料或簽署日期後，需重新簽名。">
          <SignatureField name="labor.uploadSignature" signer={name || '立同意書人'} />
        </Field>
        <ShowIf when="labor.uploadHasRepresentative=Y">
          <Field rule="labor.uploadRepresentativeSignature" label="法定代理人簽名" validateOnBlur={false}>
            <SignatureField name="labor.uploadRepresentativeSignature" signer={representativeName || '法定代理人'} />
          </Field>
        </ShowIf>
      </div>
    </ShowIf>
  </StepCard>;
}
