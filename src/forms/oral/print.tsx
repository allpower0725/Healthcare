// 衛生福利部口腔黏膜檢查服務檢查紀錄結果表單（依原紙本格式，A4 一頁兩欄；原第一聯存檢查醫療機構）
import { Fragment, type ReactNode } from 'react';
import { type PrintData, printKit } from '@/components/forms/print-kit';
import { ORAL_MAP, ORAL_MAP_LEGEND } from '@/lib/forms/defs/oral';

/** 兩位數代碼外加圓圈 */
const nc = (v: string) => <span className="ps-nc">{v}</span>;

export function OralPrint({ data }: { data: PrintData }) {
  const { Opt, Cb, Fill, Cells, Sign } = printKit(data);
  const marks = typeof data['oral.mapMarks'] === 'string' ? data['oral.mapMarks'] : '';
  /** 勾選方框＋代碼與文字，以「；」分隔 */
  const cbs = (k: string, items: readonly (readonly [string, ReactNode])[], end = '；') =>
    items.map(([v, label], i) => (
      <Fragment key={v}>
        <Cb k={k} v={v} />
        {label}
        {i < items.length - 1 ? '；' : end}
      </Fragment>
    ));
  const date = (prefix: string) => (
    <>
      民國<Fill k={`${prefix}Y`} w="9mm" />年<Fill k={`${prefix}M`} w="7mm" />月<Fill k={`${prefix}D`} w="7mm" />日
    </>
  );
  const habit = (k: string, verb: string, unit: string) =>
    (
      [
        ['0', '⓿無；'],
        ['1', '❶已戒；'],
        ['2', `❷${verb}10年以下，每天少於20${unit}；`],
        ['3', `❸${verb}10年以下，每天20${unit}及以上；`],
        ['4', `❹${verb}超過10年，每天少於20${unit}；`],
        ['5', `❺${verb}超過10年，每天20${unit}及以上。`],
      ] as const
    ).map(([v, label]) => (
      <p key={v}>
        <Cb k={k} v={v} />
        {label}
      </p>
    ));

  return (
    <div className="ps ps--oral">
      <article className="ps-page">
        <h1 className="ps-title">
          衛生福利部口腔黏膜檢查服務檢查紀錄結果表單 <span className="po-rev">（113年11月修訂）</span>
        </h1>
        <p className="po-copy">
          <span>第一聯：存檢查醫療機構</span>
        </p>
        <p className="po-elig">
          篩檢補助對象：30歲以上有嚼檳榔（含已戒）或吸菸習慣之民眾、18歲以上未滿30歲有嚼檳榔（含已戒）習慣之原住民，每2年1次。
        </p>

        <div className="ps-cols po-cols">
          <div>
            <p>
              <b>支付方式：</b>
              {cbs(
                'oral.pay',
                [
                  ['1', '❶預防保健'],
                  ['3', '❸健保醫療給付'],
                  ['4', '❹其他公務預算補助'],
                  ['5', '❺自費健康檢查'],
                  ['9', '❾其他'],
                ],
                '。',
              )}
            </p>
            <p>
              <b>篩檢地點：</b>
              {cbs(
                'oral.site',
                [
                  ['1', '❶社區或職場設站篩檢'],
                  ['2', '❷醫療院所'],
                ],
                '。',
              )}
            </p>
            <p>
              <b>檢查醫師科別：</b>
              {cbs(
                'oral.dept',
                [
                  ['1', '❶牙科'],
                  ['2', '❷耳鼻喉科'],
                  ['3', '❸經衛生福利部核可之其他科別專科醫師/專案許可之西醫師'],
                ],
                '。',
              )}
            </p>

            <p className="po-sec">
              <b>A:</b>
              <span className="ps-boxed">基本資料</span>
              <b> (受檢者自填)</b>　　原住民:<Cb k="profile.aboriginal" v="Y" />是 <Cb k="profile.aboriginal" v="N" />否
            </p>
            <p className="ps-ind">
              姓名：<Fill k="profile.name" w="30mm" />　性別：<Cb k="profile.sex" v="M" />男 <Cb k="profile.sex" v="F" />女
            </p>
            <p className="ps-ind">
              出生日期：民國<Fill k="profile.birthY" w="9mm" />年<Fill k="profile.birthM" w="7mm" />月
              <Fill k="profile.birthD" w="7mm" />日
            </p>
            <p className="ps-ind">身分證統一編號</p>
            <p className="ps-ind">
              統一證號(外籍): <Cells k="profile.idNo" n={10} />
            </p>
            <p className="ps-ind">
              聯絡電話：（<Fill k="d.phoneArea" w="9mm" />）<Fill k="d.phoneNum" w="34mm" />
            </p>
            <p className="ps-ind">
              手機：<Fill k="d.mobile" w="42mm" />
            </p>
            <p className="ps-ind">
              現居住地址：（鄉鎮市區代碼：<Cells n={4} line />）
            </p>
            <p className="ps-ind2">
              <Fill k="d.countyBase" w="10mm" />
              <span className="ps-stack">
                <Opt k="d.countySfx" v="縣">縣</Opt>
                <Opt k="d.countySfx" v="市">市</Opt>
              </span>
              <Fill k="d.townBase" w="10mm" />
              <span className="ps-stack">
                <Opt k="d.townSfx" v="鄉鎮">鄉鎮</Opt>
                <Opt k="d.townSfx" v="市區">市區</Opt>
              </span>
              <Fill k="d.villageBase" w="10mm" />
              <span className="ps-stack">
                <Opt k="d.villageSfx" v="村">村</Opt>
                <Opt k="d.villageSfx" v="里">里</Opt>
              </span>
              <Fill k="d.roadBase" w="11mm" />
              <span className="ps-stack">
                <Opt k="d.roadSfx" v="路">路</Opt>
                <Opt k="d.roadSfx" v="街">(街)</Opt>
              </span>
            </p>
            <p className="ps-ind2">
              <Fill k="profile.addrSec" w="7mm" />段<Fill k="profile.addrLane" w="8mm" />巷
              <Fill k="profile.addrAlley" w="8mm" />弄<Fill k="profile.addrNo" w="10mm" />號
              <Fill k="profile.addrFloor" w="7mm" />樓
            </p>
            <p>
              教育：
              {cbs(
                'profile.edu',
                [
                  ['1', '❶無'],
                  ['2', '❷小學'],
                  ['3', '❸國(初)中'],
                  ['4', '❹高中(職)'],
                  ['5', '❺專科、大學'],
                  ['6', '❻研究所以上'],
                  ['7', '❼拒答'],
                ],
                '',
              )}
            </p>

            <p className="po-sec">
              <span className="ps-boxed">菸檳習慣</span>
            </p>
            <p>1.嚼檳榔習慣:</p>
            {habit('oral.betel', '嚼', '顆')}
            <p>2.吸菸習慣：</p>
            {habit('oral.smoke', '吸', '支')}

            <p className="po-sec">
              <span className="ps-boxed">有無症狀</span>
            </p>
            <p>
              自覺口腔黏膜有無異常症狀?如異常顏色斑塊、口腔黏膜疼痛、難癒合之潰瘍及腫塊症狀
              <Cb k="oral.symptom" v="0" />⓿無；<Cb k="oral.symptom" v="1" />❶有
            </p>
            <p>*本人同意接受口腔黏膜檢查，相關資料將作為衛生單位政策評估或個案追蹤健康管理使用。</p>
            <p>確認以上資料及菸檳習慣資料正確無誤：</p>
            <p style={{ textAlign: 'right' }}>
              <Sign k="oral.sigConsent" style={{ width: '48mm' }} />
              <b>（簽名）</b>
            </p>

            <p className="po-sec">
              <span className="ps-boxed">口腔黏膜檢查情形</span>
              <b>（初檢醫師填寫）</b>
            </p>
            <p>
              1.檢查醫療院所名稱及代碼：<Fill k="oral.clinic" w="40mm" />
            </p>
            <p className="ps-ind">門診日期：{date('oral.visit')}。</p>
            <p>2.檢查結果：</p>
            <p>
              <Cb k="oral.result" v="0" />⓿未發現以下需轉介之異常；
            </p>
            <p>
              需轉介，轉介原因（單選；或同時出現兩種(含)以上原因，請將轉介原因代碼標示於<b>口腔黏膜初檢異常部位標示圖</b>
              並勾選<b>編碼較小者</b>）
            </p>
            <p>
              {cbs('oral.result', [
                ['1', '❶疑似口腔癌'],
                ['2', '❷口腔內外不明原因之持續性腫塊'],
                ['3', '❸紅斑'],
                ['4', '❹紅白斑'],
                ['5', '❺疣狀增生'],
                ['71', <>{nc('71')}非均質性白斑</>],
                ['72', <>{nc('72')}均質性厚白斑</>],
                ['73', <>{nc('73')}均質性薄白斑</>],
                ['76', <>{nc('76')}口腔黏膜下纖維化症(張口不易或舌頭活動困難)</>],
                ['8', '❽約兩星期仍不癒之口腔潰瘍/糜爛'],
                ['9', '❾扁平苔癬'],
                ['10', '❿口腔黏膜不正常，但診斷未明'],
              ])}
            </p>
            <p>
              <Cb k="oral.result" v="99" />
              {nc('99')}其他：<Fill k="oral.resultOther" w="56mm" />。
            </p>
          </div>

          <div className="po-right">
            <p>
              <b>口腔黏膜初檢異常部位標示圖</b>
            </p>
            <div className="po-map">
              <span className="ps-map">
                <img src={ORAL_MAP.src} alt="" />
                {marks.startsWith('data:image/png;base64,') && <img src={marks} alt="" />}
              </span>
              <div className="po-legend">
                {ORAL_MAP_LEGEND.map(([code, name]) => (
                  <Fragment key={code}>
                    {code}:{name.replace('／', '/')}
                    <br />
                  </Fragment>
                ))}
              </div>
            </div>
            <p>
              <b>檢查醫師簽名或(蓋章)：</b>
              <Sign k="oral.sigDoctor" style={{ width: '44mm' }} />
            </p>
            <p>
              <b>醫師執業執照號碼：</b>
              <Fill k="oral.license" w="44mm" />
            </p>

            <div className="po-refer">
              <p>
                <b>初篩疑似異常個案轉診單(建議轉介確認診斷醫院科別：口腔顎面外科、耳鼻喉科、口腔病理科、一般病理科)</b>
              </p>
              <p>
                1.前項檢查疑似異常個案轉至<Fill k="oral.referHospital" w="32mm" />醫院接受確診
              </p>
              <p>
                2.轉診醫師：<Fill k="oral.referDoctor" w="22mm" />，聯絡電話：<Fill k="oral.referPhone" w="26mm" />
              </p>
            </div>
            <p className="ps-small">
              註:預防保健口腔黏膜檢查確認診斷及治療醫院查詢：請至衛生福利部網站/本部各單位及所屬機關/口腔健康司/醫療保健/預防保健/口腔癌確認診斷及治療醫院名單
            </p>

            <p className="po-sec">
              <b>B:</b>
              <span className="ps-boxed">個案複檢(確診)結果</span>
              <span className="ps-small">（由篩檢單位依據確診單位通知之確診結果後填寫）</span>
            </p>
            <p className="ps-q">
              1.前項檢查疑似異常個案於檢查後<b>2個月內</b>有沒有接受後續複檢(確診)？
              <Cb k="oral.followed" v="0" />⓿沒有；<Cb k="oral.followed" v="1" />❶有。
            </p>
            <p className="ps-q">
              2.沒有接受複檢(確診)理由為：
              {cbs(
                'oral.noReason',
                [
                  ['1', '❶無法聯繫'],
                  ['2', '❷出國'],
                  ['3', '❸搬家'],
                  ['4', '❹死亡'],
                  ['5', '❺拒做'],
                  ['6', '❻其他'],
                ],
                '',
              )}
              <Fill k="oral.noReasonOther" w="16mm" />
            </p>
            <p className="ps-q">
              3.複檢（確診）醫院名稱及代碼：<Fill k="oral.confirmHospital" w="36mm" />
            </p>
            <p className="ps-ind">複檢（確診）日期：{date('oral.confirm')}</p>
            <p>
              4.病理切片：<Cb k="oral.biopsy" v="0" />⓿無；<Cb k="oral.biopsy" v="1" />❶有。
            </p>
            <p>5.診斷結果：</p>
            <p className="ps-ind">
              <b>經臨床診斷（複檢）為非口腔癌之其他口腔病變：</b>
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="00" />
              {nc('00')}無明顯異常
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="20" />
              {nc('20')}疑似口腔癌；<Cb k="oral.clinDx" v="12" />
              {nc('12')}紅斑；<Cb k="oral.clinDx" v="13" />
              {nc('13')}紅白斑；
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="08" />
              {nc('08')}非均質性白斑；<Cb k="oral.clinDx" v="09" />
              {nc('09')}均質性厚白斑；
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="10" />
              {nc('10')}均質性薄白斑；<Cb k="oral.clinDx" v="14" />
              {nc('14')}疣狀增生；
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="15" />
              {nc('15')}口腔黏膜下纖維化症；<Cb k="oral.clinDx" v="16" />
              {nc('16')}扁平苔癬或類扁平苔癬反應；
            </p>
            <p className="ps-ind">
              <Cb k="oral.clinDx" v="99" />
              {nc('99')}其他：<Fill k="oral.clinDxOther" w="40mm" />。
            </p>
            <p className="ps-ind">
              <b>經病理診斷(確診)為：</b>
            </p>
            <p className="ps-ind">
              <Cb k="oral.pathDx" v="21" />
              {nc('21')}口腔癌；
            </p>
            <p className="ps-ind">
              <Cb k="oral.pathDx" v="22" />
              {nc('22')}上皮變異（<Cb k="oral.pathGrade" v="23" />
              {nc('23')}輕度<Cb k="oral.pathGrade" v="24" />
              {nc('24')}中度<Cb k="oral.pathGrade" v="25" />
              {nc('25')}重度）；
            </p>
            <p className="ps-ind">
              <Cb k="oral.pathDx" v="99" />
              {nc('99')}其他：<Fill k="oral.pathDxOther" w="40mm" />。
            </p>
            <p>6.治療:</p>
            <p className="ps-q ps-ind">
              <Cb k="oral.treat" v="0" />⓿無，個案僅需定期追蹤，目前無需治療，已給予衛教介入
            </p>
            <p className="ps-q ps-ind">
              <Cb k="oral.treat" v="1" />❶有做手術、放療、化療或其他治療，治療醫院名稱及代碼：
              <Fill k="oral.treatHospital" w="34mm" />
            </p>
            <p className="ps-q ps-ind">
              <Cb k="oral.treat" v="2" />❷個案拒絕治療，理由<Fill k="oral.refuseReason" w="40mm" />
            </p>
            <p className="ps-q ps-ind">
              <Cb k="oral.treat" v="99" />
              {nc('99')}其他：<Fill k="oral.treatOther" w="40mm" />。
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

