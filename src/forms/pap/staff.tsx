'use client';

import { Checks, Choices, Field, ShowIf, TextArea, TextInput } from '@/components/forms/fields';
import { DateField, Req, StaffCard } from '@/components/forms/sections';
import { SignatureField } from '@/components/forms/signature';
import { PAP_DX, PAP_STAFF_OPTIONS as O } from '@/lib/forms/defs/pap';
import type { Option } from '@/lib/forms/profile';

/** 細胞病理診斷依原表單分類：分類標題下的選項一組，不屬於分類的項目另成一組 */
const DX_GROUPS = (() => {
  const groups: { head?: string; items: Option[] }[] = [];
  let inTop = false;
  for (const row of PAP_DX) {
    if ('head' in row) {
      groups.push({ head: row.head, items: [] });
      inTop = false;
    } else {
      if (row.top && !inTop) {
        groups.push({ items: [] });
        inTop = true;
      }
      groups[groups.length - 1].items.push([row.value, row.label]);
    }
  }
  return groups;
})();

/** 機構名稱與 10 碼代碼 */
function OrgFields({ prefix, label }: { prefix: string; label: string }) {
  return (
    <div className="grid2">
      <Field label={<><Req />{label}名稱</>} htmlFor={`s-${prefix}-name`}>
        <TextInput name={`pap.${prefix}Name`} id={`s-${prefix}-name`} maxLength={30} />
      </Field>
      <Field label={<><Req />代碼（10 碼）</>} htmlFor={`s-${prefix}-code`}>
        <TextInput name={`pap.${prefix}Code`} id={`s-${prefix}-code`} maxLength={10} digits />
      </Field>
    </div>
  );
}

/** 子宮頸抹片院所填寫區：收案資訊 → 抹片資料（採檢、病理）→ 抹片判讀結果 → 檢驗者 */
export function PapStaff() {
  return (
    <>
      <StaffCard title="收案資訊">
        <Field role="radiogroup" label={<><Req />國籍</>}>
          <Choices name="pap.nationality" options={O.nationality} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />抹片車或社區巡迴服務</>}>
          <Choices name="pap.van" options={O.van} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />支付方式</>}>
          <Choices name="pap.pay" options={O.pay} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />難判重做？</>}>
          <Choices name="pap.redo" options={O.yesNo} codes />
        </Field>
        <div className="grid2">
          <Field label="時程代碼" htmlFor="s-schedule">
            <TextInput name="pap.schedule" id="s-schedule" maxLength={2} />
          </Field>
        </div>
      </StaffCard>

      <StaffCard title="抹片資料" note="採檢醫療機構填寫">
        <div className="grid2">
          <Field label="病歷號" htmlFor="s-chart">
            <TextInput name="pap.chartNo" id="s-chart" maxLength={20} />
          </Field>
        </div>
        <Field role="radiogroup" label={<><Req />雙子宮頸？</>}>
          <Choices name="pap.doubleCervix" options={O.yesNo} codes />
        </Field>
        <DateField prefix="pap.collect" label="抹片檢體取樣日期" req />
        <OrgFields prefix="collectOrg" label="抹片檢體取樣機構" />
        <Field label={<><Req />抹片檢體取樣醫事人員簽名（或蓋章）</>}>
          <SignatureField name="pap.sigCollector" signer="抹片檢體取樣醫事人員" />
        </Field>
        <Field role="radiogroup" label="抹片檢體取樣人員身分別">
          <Choices name="pap.collectorRole" options={O.collectorRole} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />本次檢查是否合併 HPV 檢測服務？</>}>
          <Choices name="pap.withHpv" options={O.withHpv} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />做抹片目的</>}>
          <Choices name="pap.purpose" options={O.purpose} codes />
        </Field>
        <Field label="臨床所見（含骨盆腔檢查結果）" htmlFor="s-finding">
          <TextArea name="pap.finding" id="s-finding" maxLength={100} />
        </Field>
      </StaffCard>

      <StaffCard title="抹片資料" note="病理醫療機構填寫">
        <Field label={<><Req />抹片細胞病理編號</>} htmlFor="s-cyto">
          <TextInput name="pap.cytoNo" id="s-cyto" maxLength={30} />
        </Field>
        <OrgFields prefix="readOrg" label="抹片判讀機構" />
        <DateField prefix="pap.recv" label="抹片收到日期" req />
        <Field role="radiogroup" label={<><Req />檢體種類</>}>
          <Choices name="pap.specimenType" options={O.specimenType} codes />
        </Field>
      </StaffCard>

      <StaffCard title="抹片判讀結果" note="病理醫療機構填寫">
        <Field role="radiogroup" label={<><Req />閱片方式</>}>
          <Choices name="pap.readMethod" options={O.readMethod} codes />
        </Field>
        <Field role="radiogroup" label={<><Req />抹片品質</>}>
          <Choices name="pap.quality" options={O.quality} codes />
          <ShowIf when="pap.quality=2|3">
            <div className="sub" role="group" aria-label="抹片尚可或難以判讀之原因">
              <p className="sub__title">
                <Req />
                抹片尚可或難以判讀之原因（最多可選二個）
              </p>
              <Checks name="pap.qualityReason" options={O.qualityReason} codes />
              <ShowIf when="pap.qualityReason=8">
                <TextInput
                  name="pap.qualityReasonOther"
                  maxLength={30}
                  placeholder="請說明其他原因"
                  ariaLabel="其他抹片品質原因"
                  className="input--sub"
                />
              </ShowIf>
            </div>
          </ShowIf>
        </Field>
        <Field role="group" label={<><Req />可能的感染（可複選）</>}>
          <Checks name="pap.infection" options={O.infection} codes className="choices choices--list" />
          <ShowIf when="pap.infection=6">
            <TextInput
              name="pap.infectionOther"
              maxLength={30}
              placeholder="請說明其他感染"
              ariaLabel="其他感染"
              className="input--sub"
            />
          </ShowIf>
        </Field>
        <Field role="radiogroup" label={<><Req />細胞病理診斷（只可單選）</>}>
          {DX_GROUPS.map((g, i) => (
            <div key={i}>
              {g.head ? <p className="dx__head">{g.head}</p> : <div className="dx__gap" />}
              <Choices name="pap.dx" options={g.items} codes className="choices--list" />
            </div>
          ))}
          <ShowIf when="pap.dx=14">
            <TextInput
              name="pap.dxOther"
              maxLength={30}
              placeholder="請說明"
              ariaLabel="其他細胞病理診斷"
              className="input--sub"
            />
          </ShowIf>
        </Field>
        <Field role="radiogroup" label="子宮內膜細胞出現於 40 歲以上婦女">
          <Choices name="pap.endometrial" options={O.yesNo} codes />
        </Field>
        <Field role="group" label="建議（可複選）">
          <Checks name="pap.advice" options={O.advice} codes className="choices choices--list" />
          <ShowIf when="pap.advice=4">
            <div className="input--sub">
              <TextArea name="pap.adviceOther" maxLength={80} placeholder="請填寫其他建議" ariaLabel="其他建議" />
            </div>
          </ShowIf>
        </Field>
      </StaffCard>

      <StaffCard title="檢驗者" note="請簽名及填寫代碼">
        <div className="signer" role="group" aria-label="Cytotechnologist">
          <p className="sub__title">Cytotechnologist</p>
          <SignatureField name="pap.sigCt" signer="Cytotechnologist" />
          <div className="inline-fields">
            <span className="affix">
              <span className="affix__text">代碼</span>
              <TextInput name="pap.ctCode" maxLength={2} uppercase ariaLabel="Cytotechnologist 代碼" />
            </span>
          </div>
        </div>
        <div className="signer" role="group" aria-label="Cytopathologist">
          <p className="sub__title">
            <Req />
            Cytopathologist
          </p>
          <SignatureField name="pap.sigCp" signer="Cytopathologist" />
          <div className="inline-fields">
            <span className="affix">
              <span className="affix__text">代碼</span>
              <TextInput name="pap.cpCode" maxLength={2} uppercase ariaLabel="Cytopathologist 代碼" />
            </span>
            <span className="affix">
              <span className="affix__text">
                <Req />
                確診日期
              </span>
              <TextInput name="pap.cpM" maxLength={2} digits ariaLabel="確診日期（月）" />
              <span className="affix__text">月</span>
              <TextInput name="pap.cpD" maxLength={2} digits ariaLabel="確診日期（日）" />
              <span className="affix__text">日</span>
            </span>
          </div>
        </div>
      </StaffCard>
    </>
  );
}
