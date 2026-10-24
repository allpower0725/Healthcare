'use client';

import { useText } from '@/components/forms/context';
import { Choices, Field, ShowIf, TextInput } from '@/components/forms/fields';
import { DateField, StaffCard } from '@/components/forms/sections';
import { MapField, SignatureField } from '@/components/forms/signature';
import { ORAL_MAP, ORAL_MAP_LEGEND, ORAL_OPTIONS as O, ORAL_REFER } from '@/lib/forms/defs/oral';
import { codeOf } from '@/lib/forms/format';

/** 「其他」選項的說明欄 */
function Other({ when, name, label, max = 30 }: { when: string; name: string; label: string; max?: number }) {
  return (
    <ShowIf when={when}>
      <TextInput name={name} maxLength={max} placeholder="請說明" ariaLabel={label} className="input--sub" />
    </ShowIf>
  );
}

/** 標示視窗的說明帶出目前選的轉介原因 */
function useMapHint() {
  const result = useText('oral.result');
  const picked = O.result.find(([v]) => v === result && v !== '0');
  return picked ? `轉介原因：${codeOf(picked[0])}${picked[1]}。請在異常部位畫圈，並寫上轉介原因代碼` : '請在異常部位畫圈，並寫上轉介原因代碼';
}

function OralMap() {
  const hint = useMapHint();
  return (
    <Field label="口腔黏膜初檢異常部位標示圖">
      <MapField name="oral.mapMarks" bg={ORAL_MAP.src} aspect={ORAL_MAP.aspect} hint={hint} />
      <div className="legend" aria-label="部位代碼">
        {ORAL_MAP_LEGEND.map(([code, name]) => (
          <span key={code}>
            <b>{code}</b>
            {name}
          </span>
        ))}
      </div>
    </Field>
  );
}

/** 口腔黏膜檢查院所填寫區：收案資訊 → 檢查情形 → 轉診單、複檢（確診）結果（需轉介時） */
export function OralStaff() {
  return (
    <>
      <StaffCard title="收案資訊">
        <Field role="radiogroup" label="支付方式">
          <Choices name="oral.pay" options={O.pay} codes />
        </Field>
        <Field role="radiogroup" label="篩檢地點">
          <Choices name="oral.site" options={O.site} codes />
        </Field>
        <Field role="radiogroup" label="檢查醫師科別">
          <Choices name="oral.dept" options={O.dept} codes className="choices--wide" />
        </Field>
      </StaffCard>

      <StaffCard title="口腔黏膜檢查情形" note="初檢醫師填寫">
        <Field label="1. 檢查醫療院所名稱及代碼" htmlFor="s-clinic">
          <TextInput name="oral.clinic" id="s-clinic" maxLength={40} />
        </Field>
        <DateField prefix="oral.visit" label="門診日期" />
        <Field role="radiogroup" label="2. 檢查結果">
          <Choices name="oral.result" options={O.result.slice(0, 1)} codes />
          <p className="choices__note">
            需轉介，轉介原因（單選；同時出現兩種以上原因時，請將代碼標示於下方部位圖，並勾選編碼較小者）：
          </p>
          <Choices name="oral.result" options={O.result.slice(1)} codes />
          <Other when="oral.result=99" name="oral.resultOther" label="其他轉介原因" />
        </Field>
        <ShowIf when={ORAL_REFER}>
          <OralMap />
        </ShowIf>
        <Field label="檢查醫師簽名或（蓋章）">
          <SignatureField name="oral.sigDoctor" signer="檢查醫師" />
        </Field>
        <div className="grid2">
          <Field label="醫師執業執照號碼" htmlFor="s-license">
            <TextInput name="oral.license" id="s-license" maxLength={20} />
          </Field>
        </div>
      </StaffCard>

      <ShowIf when={ORAL_REFER}>
        <StaffCard title="初篩疑似異常個案轉診單">
          <p className="choices__note">建議轉介確認診斷醫院科別：口腔顎面外科、耳鼻喉科、口腔病理科、一般病理科。</p>
          <Field label="1. 疑似異常個案轉至哪家醫院接受確診" htmlFor="s-rhosp">
            <TextInput name="oral.referHospital" id="s-rhosp" maxLength={30} />
          </Field>
          <div className="grid2">
            <Field label="2. 轉診醫師" htmlFor="s-rdoc">
              <TextInput name="oral.referDoctor" id="s-rdoc" maxLength={20} />
            </Field>
            <Field label="聯絡電話" htmlFor="s-rtel">
              <TextInput name="oral.referPhone" id="s-rtel" type="tel" inputMode="tel" maxLength={20} />
            </Field>
          </div>
          <p className="field__hint">
            確認診斷及治療醫院查詢：衛生福利部網站／本部各單位及所屬機關／口腔健康司／醫療保健／預防保健／口腔癌確認診斷及治療醫院名單。
          </p>
        </StaffCard>

        <StaffCard title="個案複檢（確診）結果" note="由篩檢單位依據確診單位通知之確診結果後填寫">
          <Field role="radiogroup" label="疑似異常個案於檢查後 2 個月內有沒有接受後續複檢（確診）？">
            <Choices name="oral.followed" options={O.followed} codes />
          </Field>
          <ShowIf when="oral.followed=0">
            <Field role="radiogroup" label="沒有接受複檢（確診）理由">
              <Choices name="oral.noReason" options={O.noReason} codes />
              <Other when="oral.noReason=6" name="oral.noReasonOther" label="其他未複檢理由" />
            </Field>
          </ShowIf>
          <ShowIf when="oral.followed=1">
            <Field label="複檢（確診）醫院名稱及代碼" htmlFor="s-chosp">
              <TextInput name="oral.confirmHospital" id="s-chosp" maxLength={40} />
            </Field>
            <DateField prefix="oral.confirm" label="複檢（確診）日期" />
          </ShowIf>
          <Field role="radiogroup" label="病理切片">
            <Choices name="oral.biopsy" options={O.noYes} codes />
          </Field>
          <Field label="診斷結果">
            <div className="sub" role="radiogroup" aria-label="經臨床診斷（複檢）為非口腔癌之其他口腔病變">
              <p className="sub__title">經臨床診斷（複檢）為非口腔癌之其他口腔病變</p>
              <Choices name="oral.clinDx" options={O.clinDx} codes />
              <Other when="oral.clinDx=99" name="oral.clinDxOther" label="其他臨床診斷" />
            </div>
            <div className="sub" role="radiogroup" aria-label="經病理診斷（確診）為">
              <p className="sub__title">經病理診斷（確診）為</p>
              <Choices name="oral.pathDx" options={O.pathDx} codes />
              <ShowIf when="oral.pathDx=22">
                <Choices name="oral.pathGrade" options={O.pathGrade} codes className="types" />
              </ShowIf>
              <Other when="oral.pathDx=99" name="oral.pathDxOther" label="其他病理診斷" />
            </div>
          </Field>
          <Field role="radiogroup" label="治療">
            <Choices name="oral.treat" options={O.treat} codes className="choices--wide" />
            <ShowIf when="oral.treat=1">
              <TextInput
                name="oral.treatHospital"
                maxLength={40}
                placeholder="治療醫院名稱及代碼"
                ariaLabel="治療醫院名稱及代碼"
                className="input--sub"
              />
            </ShowIf>
            <ShowIf when="oral.treat=2">
              <TextInput
                name="oral.refuseReason"
                maxLength={40}
                placeholder="拒絕治療理由"
                ariaLabel="拒絕治療理由"
                className="input--sub"
              />
            </ShowIf>
            <Other when="oral.treat=99" name="oral.treatOther" label="其他治療說明" max={40} />
          </Field>
        </StaffCard>
      </ShowIf>
    </>
  );
}
