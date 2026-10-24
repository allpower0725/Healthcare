// 健康署成人預防保健服務檢查紀錄結果表單（依原紙本格式，A4 兩頁；紅框內為服務對象填寫的欄位）
import { Fragment } from 'react';
import { type PrintData, printKit } from '@/components/forms/print-kit';
import {
  ADULT_LABS,
  ADULT_LABS2,
  ADULT_OPTIONS,
  ADULT_RESULTS,
  ADULT_RISKS,
  ADULT_STAFF,
  adultCalc,
  resultOptions,
} from '@/lib/forms/defs/adult';
import { splitSuffix } from '@/lib/forms/format';
import { EDUCATION } from '@/lib/forms/profile';

const TRI = '"△"';
const text = (v: number | null) => (v == null ? '' : String(v));

export function AdultPrint({ data: raw }: { data: PrintData }) {
  const calc = adultCalc(raw);
  const town = typeof raw['profile.addrTown'] === 'string' ? raw['profile.addrTown'] : '';
  const data: PrintData = {
    ...raw,
    'x.era': raw['profile.birthY'] ? '後' : '',
    'x.age': text(calc.age),
    'x.bmi': text(calc.bmi),
    'x.ldl': calc.ldlNa ? '不適用' : text(calc.ldl),
    'x.egfr': text(calc.egfr),
    // 原表單的鄉、鎮、市、區分開圈選
    'd.townSfxRaw': splitSuffix(town, ['鄉', '鎮', '市', '區']).sfx,
  };
  const { Opt, Cb, Fill, Cells, Sign } = printKit(data);

  /** 勾選方框＋選項文字 */
  const cbs = (k: string, options: readonly (readonly [string, string])[]) =>
    options.map(([v, label]) => (
      <Fragment key={v}>
        <Cb k={k} v={v} />
        {label}{' '}
      </Fragment>
    ));
  const date = (prefix: string) => (
    <>
      民國<Fill k={`${prefix}Y`} w="8mm" />年<Fill k={`${prefix}M`} w="6mm" />月<Fill k={`${prefix}D`} w="6mm" />日
    </>
  );
  const opts = (k: string, options: readonly string[]) =>
    options.map((v) => (
      <Opt key={v} k={k} v={v}>
        {v}
      </Opt>
    ));
  const [dx1, dx2] = [ADULT_OPTIONS.diseases.slice(0, 6), ADULT_OPTIONS.diseases.slice(6)];
  const [fam1, fam2] = [ADULT_OPTIONS.family.slice(0, 5), ADULT_OPTIONS.family.slice(5)];
  const exam = ([code, name]: readonly [string, string]) => (
    <Fragment key={code}>
      {name}：<Cb k={`adult.ex_${code}`} v="1" />
      無明顯異常
      <Cb k={`adult.ex_${code}`} v="2" />
      異常：
      <Fill k={`adult.ex_${code}Note`} w="12mm" />{' '}
    </Fragment>
  );
  const lab = ([code, name, unit]: readonly [string, string, string]) => (
    <p className="pa-ind" key={code}>
      {name}：<Fill k={`adult.${code}`} w="12mm" />
      {unit}（參考值:
      <Fill k={`adult.${code}Ref`} w="16mm" />）
    </p>
  );
  const counsel = ADULT_STAFF.counsel;

  return (
    <div className="ps ps--adult">
      <article className="ps-page">
        <p className="pa-annex">附表六之四</p>
        <h1 className="ps-title">健康署成人預防保健服務檢查紀錄結果表單</h1>
        <p className="pa-dates">
          <span>
            {TRI}第一階段日期：{date('adult.s1')}
          </span>
          <span>第二階段日期：{date('adult.s2')}</span>
        </p>
        <p className="pa-bold">(加註{TRI}為提供 B、C 型肝炎檢查必填欄位)</p>
        <div className="pa-consent">
          <p>
            ◎
            成人預防保健服務補助時程為三十歲以上未滿四十歲者，每五年補助一次；四十歲以上未滿六十五歲，每三年補助一次；三十五歲以上小兒麻痺患者、五十五歲以上原住民或六十五歲以上者，每年補助一次。
          </p>
          <p className="pa-big">
            ◎ 本人同意接受成人預防保健服務。請簽名或蓋章（手印）：（第一階）
            <Sign k="adult.sigS1" />
            （第二階）
            <Sign k="adult.sigS2" />
          </p>
          <p>
            ◎ {TRI}成人預防保健服務 B、C 型肝炎檢查補助時程經機構查詢符合檢查條件者，終身一次。
            <span className="pa-big">本人同意接受檢查，請簽名或蓋章（手印）：</span>
            <Sign k="adult.sigHep" />
          </p>
          <p className="pa-big pa-center">（相關資料將作為衛生單位政策評估及查詢或個案追蹤健康管理使用）</p>
        </div>
        <p className="pa-hint">下列紅框內之欄位請醫護人員協助服務對象於檢查前先行詳細填寫，以供醫師參考。</p>

        <table className="ps-table pa-t pa-red">
          <tbody>
            <tr>
              <th>{TRI}基本資料</th>
              <td className="pa-np">
                <table className="pa-in">
                  <colgroup>
                    <col style={{ width: '22mm' }} />
                    <col style={{ width: '53mm' }} />
                    <col style={{ width: '12mm' }} />
                    <col />
                    <col style={{ width: '10mm' }} />
                    <col style={{ width: '10mm' }} />
                    <col style={{ width: '13mm' }} />
                    <col style={{ width: '10mm' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="c">身分證統一編號</td>
                      <td>
                        <Cells k="profile.idNo" n={10} />
                      </td>
                      <td className="c">姓名</td>
                      <td className="c">
                        <b>
                          <Fill k="profile.name" style={{ border: 0 }} />
                        </b>
                      </td>
                      <td className="c">性別</td>
                      <td>
                        <Cb k="profile.sex" v="M" />男
                        <br />
                        <Cb k="profile.sex" v="F" />女
                      </td>
                      <td className="c">原住民</td>
                      <td>
                        <Cb k="profile.aboriginal" v="Y" />是
                        <br />
                        <Cb k="profile.aboriginal" v="N" />否
                      </td>
                    </tr>
                    <tr>
                      <td className="c">生日</td>
                      <td colSpan={3}>
                        民國前/<Opt k="x.era" v="後">後</Opt>
                        <Fill k="profile.birthY" w="8mm" />年<Fill k="profile.birthM" w="6mm" />月
                        <Fill k="profile.birthD" w="6mm" />日（<Fill k="x.age" w="7mm" />足歲）
                      </td>
                      <td className="c">電話</td>
                      <td colSpan={3}>
                        （<Fill k="d.phoneArea" w="7mm" style={{ border: 0 }} />）<Fill k="d.phoneNum" style={{ border: 0 }} />
                      </td>
                    </tr>
                    <tr>
                      <td className="c">現地址</td>
                      <td colSpan={7} className="pa-addr">
                        <p>
                          <Fill k="d.countyBase" w="14mm" />
                          <Opt k="d.countySfx" v="縣">縣</Opt>（<Opt k="d.countySfx" v="市">市</Opt>）
                          <Fill k="d.townBase" w="14mm" />
                          {opts('d.townSfxRaw', ['鄉', '鎮', '市', '區'])}
                          <Fill k="d.villageBase" w="16mm" />
                          {opts('d.villageSfx', ['村', '里'])}
                          <Fill k="profile.addrLin" w="12mm" />鄰
                        </p>
                        <p>
                          <Fill k="d.roadBase" w="16mm" />
                          <Opt k="d.roadSfx" v="路">路</Opt>（<Opt k="d.roadSfx" v="街">街</Opt>）
                          <Fill k="profile.addrSec" w="8mm" />段<Fill k="profile.addrLane" w="10mm" />巷
                          <Fill k="profile.addrAlley" w="10mm" />弄<Fill k="profile.addrNo" w="12mm" />號
                          <Fill k="profile.addrFloor" w="12mm" />樓
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="c">戶籍地</td>
                      <td>
                        <Fill k="d.regCountyBase" w="20mm" />
                        <Opt k="d.regCountySfx" v="縣">縣</Opt>（<Opt k="d.regCountySfx" v="市">市</Opt>）
                      </td>
                      <td className="c">教育程度</td>
                      <td colSpan={5}>
                        {cbs('profile.edu', EDUCATION.slice(0, 4))}
                        <br />
                        {cbs('profile.edu', EDUCATION.slice(4, 6))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <th>疾病史</th>
              <td>
                <p>{cbs('adult.dx', dx1)}</p>
                <p>
                  {dx2.map(([v, label]) => (
                    <Fragment key={v}>
                      <Cb k="adult.dx" v={v} />
                      {v === 'other' ? (
                        <>
                          其他：
                          <Fill k="adult.dxOther" w="20mm" />
                        </>
                      ) : (
                        label
                      )}{' '}
                    </Fragment>
                  ))}
                </p>
              </td>
            </tr>
            <tr>
              <th>長期服藥</th>
              <td>
                <Cb k="adult.med" v="0" />
                無
                <Cb k="adult.med" v="1" />
                有，病因
                <Fill k="adult.medCause" w="36mm" />
              </td>
            </tr>
            <tr>
              <th>家族史</th>
              <td>
                <p>{cbs('adult.fam', fam1)}</p>
                <p>
                  {fam2.map(([v, label]) => (
                    <Fragment key={v}>
                      <Cb k="adult.fam" v={v} />
                      {v === 'cancer' ? (
                        <>
                          癌症
                          <Fill k="adult.famCancer" w="18mm" />
                        </>
                      ) : v === 'other' ? (
                        <>
                          其他：
                          <Fill k="adult.famOther" w="18mm" />
                        </>
                      ) : (
                        label
                      )}{' '}
                    </Fragment>
                  ))}
                </p>
              </td>
            </tr>
            <tr>
              <th>健康行為</th>
              <td>
                <p>一、最近半年來，您吸菸的情形是？</p>
                <p className="pa-ind">
                  <Cb k="adult.smoke" v="1" />
                  不吸菸 <Cb k="adult.smoke" v="2" />
                  朋友敬菸或應酬才吸菸 <Cb k="adult.smoke" v="3" />
                  平均一天約吸一包菸（含以下）
                </p>
                <p className="pa-ind">
                  <Cb k="adult.smoke" v="4" />
                  平均一天約吸一包菸以上
                </p>
                <p>二、最近半年來，您喝酒的情形是？</p>
                <p className="pa-ind">
                  <Cb k="adult.drink" v="1" />
                  不喝酒 <Cb k="adult.drink" v="2" />
                  偶爾喝酒或應酬才喝 <Cb k="adult.drink" v="3" />
                  經常喝酒
                </p>
                <p>三、最近半年來，您嚼檳榔的情形是？</p>
                <p className="pa-ind">
                  <Cb k="adult.betel" v="1" />
                  不嚼檳榔 <Cb k="adult.betel" v="2" />
                  偶爾會嚼或應酬才嚼 <Cb k="adult.betel" v="3" />
                  經常嚼或習慣在嚼
                </p>
                <p>四、最近二週，您是否有運動（每週達150分鐘以上）？</p>
                <p className="pa-ind">
                  <Cb k="adult.exercise" v="1" />
                  沒有 <Cb k="adult.exercise" v="2" />
                  有，但未達每週150分鐘（2.5小時） <Cb k="adult.exercise" v="3" />
                  有，且每週達150分鐘以上（2.5小時）
                </p>
                <p>
                  五、您是否出現咳嗽超過二週的情形？ <Cb k="adult.cough" v="1" />
                  沒有 <Cb k="adult.cough" v="2" />有
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="ps-table pa-t">
          <tbody>
            <tr>
              <th>身體檢查</th>
              <td>
                <p>
                  身高：<Fill k="adult.height" w="10mm" />
                  公分　體重：<Fill k="adult.weight" w="10mm" />
                  公斤　脈搏：<Fill k="adult.pulse" w="10mm" />
                  次/分
                </p>
                <p>
                  血壓：<Fill k="adult.sbp" w="9mm" />／<Fill k="adult.dbp" w="9mm" />
                  mmHg　腰圍：<Fill k="adult.waist" w="10mm" />
                  公分
                </p>
                <p>
                  身體質量指數（BMI）：<Fill k="x.bmi" w="24mm" />【理想值：18.5≦BMI＜24 】
                </p>
                <p>
                  ◎計算方式：體重（公斤）/身高（公尺）<span className="pa-sup">2</span>
                </p>
                <p>眼睛</p>
                <p className="pa-ind">
                  右眼裸眼視力：<Fill k="adult.vaR" w="10mm" /> 左眼裸眼視力：<Fill k="adult.vaL" w="10mm" />
                </p>
                <p className="pa-ind">
                  右眼矯正視力：<Fill k="adult.vcR" w="10mm" /> 左眼矯正視力：<Fill k="adult.vcL" w="10mm" />
                </p>
                <p>耳鼻喉及口腔</p>
                <p className="pa-ind">
                  <Cb k="adult.ent" v="1" />
                  無明顯異常
                </p>
                <p className="pa-ind">
                  <Cb k="adult.ent" v="2" />
                  異常：{cbs('adult.entAbn', ADULT_STAFF.entAbn)}
                </p>
                <p>頸部</p>
                <p className="pa-ind">
                  淋巴腺腫大：<Cb k="adult.lymph" v="Y" />有 <Cb k="adult.lymph" v="N" />無　　甲狀腺腫大：
                  <Cb k="adult.thyroid" v="Y" />有 <Cb k="adult.thyroid" v="N" />無
                </p>
                <p>
                  {exam(['chest', '胸　部'])}
                  {exam(['heart', '心臟聽診'])}
                </p>
                <p>
                  {exam(['lung', '呼吸聽診'])}
                  {exam(['abd', '腹　部'])}
                </p>
                <p>
                  {exam(['limb', '四　肢'])}
                  其他異常：
                  <Fill k="adult.otherAbn" w="40mm" />
                </p>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="pa-foot">
          ※服務對象如有任何不適異狀、曾患疾病或目前病症，務必於問診時詳細告知醫師。
          <br />
          　第一聯　特約醫事服務機構通知保險對象檢查結果聯。
          <br />
          　第二聯　特約醫事服務機構留存聯（本資料請留存於病歷）。
        </p>
      </article>

      <article className="ps-page">
        <table className="ps-table pa-t">
          <tbody>
            <tr>
              <th>
                <span className="pa-vert">實驗室檢查</span>
              </th>
              <td>
                <p>尿液檢查</p>
                <p className="pa-ind">
                  蛋白質：定性：
                  {ADULT_STAFF.uproQual.map(([v, label]) => (
                    <Fragment key={v}>
                      <Cb k="adult.uproQual" v={v} />：{label}{' '}
                    </Fragment>
                  ))}
                </p>
                <p className="pa-ind2">
                  或定量：<Fill k="adult.uproQuant" w="10mm" />
                  mg/dl（參考值:<Fill k="adult.uproQuantRef" w="14mm" />
                  ）【定性或定量可擇一填寫】
                </p>
                <p>生化檢查</p>
                {ADULT_LABS.map(lab)}
                <p className="pa-ind">
                  低密度脂蛋白膽固醇計算：<Fill k="x.ldl" w="12mm" />
                  mg/dl（參考值:<Fill k="adult.ldlRef" w="16mm" />
                  ）（僅適用三酸甘油脂≦400 mg∕dl）
                </p>
                <p>◎計算方式：總膽固醇－高密度脂蛋白膽固醇－（三酸甘油脂÷5）</p>
                {ADULT_LABS2.map(lab)}
                <p className="pa-ind">
                  腎絲球過濾率（eGFR）：<Fill k="x.egfr" w="26mm" />
                  ml/min/1.73 m<span className="pa-sup">2</span>
                </p>
                <p className="pa-ind">
                  尿酸：<Fill k="adult.ua" w="12mm" />
                  mg/dl
                </p>
                <p>
                  ◎計算方式：男性：186×（血清肌酸酐）<span className="pa-sup">-1.154</span>×（年齡）
                  <span className="pa-sup">-0.203</span>
                </p>
                <p style={{ paddingLeft: '5em' }}>
                  女性：186×（血清肌酸酐）<span className="pa-sup">-1.154</span>×（年齡）
                  <span className="pa-sup">-0.203</span>×0.742
                </p>
                <p>
                  {TRI}B 型肝炎表面抗原（HBsAg）：{cbs('adult.hbsag', ADULT_STAFF.hepatitis)}
                </p>
                <p>
                  {TRI}C 型肝炎抗體（Anti-HCV）：{cbs('adult.hcv', ADULT_STAFF.hepatitis)}
                </p>
              </td>
            </tr>
            <tr>
              <th>健康諮詢</th>
              <td>
                <p>{cbs('adult.counsel', counsel.slice(0, 5))}</p>
                <p>{cbs('adult.counsel', counsel.slice(5, 8))}</p>
                <p>{cbs('adult.counsel', counsel.slice(8, 9))}</p>
                <p>{cbs('adult.counsel', counsel.slice(9))}</p>
              </td>
            </tr>
            <tr>
              <th>
                <span className="pa-vert">檢查結果與建議</span>
              </th>
              <td>
                <p>身體檢查部分：</p>
                {ADULT_RESULTS.map(([code, name]) => {
                  const [ok, bad] = resultOptions(code);
                  return (
                    <p key={code}>
                      {code === 'bp' ? '血　壓' : name}：<Cb k={`adult.res_${code}`} v="1" />
                      {ok[1]}
                      <Cb k={`adult.res_${code}`} v="2" />
                      {bad[1]}：
                      {code === 'renal' && (
                        <>
                          期別
                          <Fill k="adult.res_renalStage" w="6mm" />{' '}
                        </>
                      )}
                      建議
                      <Cb k={`adult.res_${code}Adv`} v="life" />
                      生活型態改善，並定期
                      <Fill k={`adult.res_${code}Mon`} w="6mm" />
                      個月追蹤
                      <Cb k={`adult.res_${code}Adv`} v="exam" />
                      進一步檢查
                      <Cb k={`adult.res_${code}Adv`} v="treat" />
                      接受治療
                    </p>
                  );
                })}
                <p>（代謝症候群定義:腰圍、血壓、空腹血糖、三酸甘油脂、高密度脂蛋白膽固醇，其中三項或超過三項異常）</p>
                <p>
                  慢性疾病風險值：
                  {ADULT_RISKS.map(([code, name], i) => (
                    <Fragment key={code}>
                      {i > 0 && '、'}
                      {name}(1.
                      <Fill k={`adult.risk_${code}`} w="7mm" />
                      %；
                      <Opt k={`adult.risk_${code}NA`} v="1">
                        2.不適用
                      </Opt>
                      )
                    </Fragment>
                  ))}
                </p>
                <p>
                  {TRI}B 型肝炎表面抗原：{cbs('adult.resHbv', ADULT_STAFF.hepResult)}
                </p>
                <p>
                  {TRI}C 型肝炎抗體　：{cbs('adult.resHcv', ADULT_STAFF.hepResult)}
                </p>
                <p>咳嗽症狀：{cbs('adult.resCough', ADULT_STAFF.resCough)}</p>
              </td>
            </tr>
          </tbody>
        </table>
        <table className="ps-table pa-t pa-signrow">
          <tbody>
            <tr>
              <td>
                {TRI}特約醫事服務機構名稱及代號（蓋章）
                <br />
                <b>
                  <Fill k="adult.org" style={{ border: 0 }} />
                </b>
              </td>
              <td>
                {TRI}檢查醫師簽名（蓋章）
                <Sign k="adult.sigDoctor" />
              </td>
            </tr>
          </tbody>
        </table>
        <p className="pa-dual">
          ※服務對象如為特約醫事檢驗機構依雙軌作業方式提供第一階段檢驗檢查服務者，其自行選定第二階段服務的特約醫事服務機構名稱：
          <Fill k="adult.dualOrg" w="40mm" />
          地址：
          <Fill k="adult.dualAddr" w="40mm" />
        </p>
      </article>
    </div>
  );
}
