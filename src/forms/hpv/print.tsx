// 健康署婦女人類乳突病毒檢測服務檢查紀錄結果表單（依原紙本格式，A4 一頁）
import { type PrintData, printKit } from '@/components/forms/print-kit';

export function HpvPrint({ data }: { data: PrintData }) {
  const { Opt, Cb, Fill, Cells, Sign } = printKit(data);
  const date = (prefix: string) => (
    <>
      民國<Fill k={`${prefix}Y`} w="10mm" />年<Fill k={`${prefix}M`} w="9mm" />月<Fill k={`${prefix}D`} w="9mm" />日
    </>
  );
  const hr = (values: string[]) =>
    values.map((v) => (
      <span key={v}>
        <Cb k="hpv.hrTypes" v={v} />
        {v}
      </span>
    ));
  const lr = (values: string[]) =>
    values.map((v) => (
      <span key={v}>
        <Cb k="hpv.lrTypes" v={v} />
        {v}
      </span>
    ));

  return (
    <div className="ps">
      <article className="ps-page">
        <h1 className="ps-title">健康署婦女人類乳突病毒檢測服務檢查紀錄結果表單</h1>
        <div className="ps-cols">
          <div>
            <p>
              <span className="ps-req">＊</span>國籍：<Opt k="hpv.nationality" v="1">①本國</Opt>{' '}
              <Opt k="hpv.nationality" v="2">②外籍人士</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>抹片車或社區巡迴服務：
            </p>
            <p className="ps-ind">
              <Opt k="hpv.van" v="1">①否</Opt> <Opt k="hpv.van" v="2">②抹片車</Opt>{' '}
              <Opt k="hpv.van" v="3">③社區巡迴服務</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>1.支付方式：<Opt k="hpv.pay" v="1">①預防保健</Opt>{' '}
              <Opt k="hpv.pay" v="2">②健保醫療給付</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="hpv.pay" v="3">③其他公務預算補助</Opt> <Opt k="hpv.pay" v="4">④其他</Opt>{' '}
              <Opt k="hpv.pay" v="6">⑥自費健康檢查</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>無法判讀重做？<Opt k="hpv.redo" v="1">①是</Opt>{' '}
              <Opt k="hpv.redo" v="2">②否</Opt>
            </p>
            <p className="ps-ind">
              時程代碼：<Cells k="hpv.schedule" n={2} line />
            </p>

            <h2 className="ps-h">一、個人基本資料（檢查婦女填寫）</h2>
            <p>
              <span className="ps-req">＊</span>2.姓名：<Fill k="profile.name" w="48mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>3.出生日期：民國<Fill k="profile.birthY" w="11mm" />年
              <Fill k="profile.birthM" w="9mm" />月<Fill k="profile.birthD" w="9mm" />日
            </p>
            <p>
              <span className="ps-req">＊</span>4.身分證統一編號或統一證號(外籍)：
            </p>
            <p className="ps-ind">
              <Cells k="profile.idNo" n={10} />
            </p>
            <p>
              <span className="ps-req">＊</span>5.電話：<Fill k="d.phoneArea" w="15mm" />－<Fill k="d.phoneNum" w="42mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>6.教育：<Opt k="profile.edu" v="1">①無</Opt> <Opt k="profile.edu" v="2">②小學</Opt>{' '}
              <Opt k="profile.edu" v="3">③國(初)中</Opt> <Opt k="profile.edu" v="4">④高中、高職</Opt>
            </p>
            <p style={{ paddingLeft: '4.6em' }}>
              <Opt k="profile.edu" v="5">⑤專科、大學</Opt> <Opt k="profile.edu" v="6">⑥研究所以上</Opt>{' '}
              <Opt k="profile.edu" v="7">⑦拒答</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>7.現住址：
            </p>
            <p className="ps-ind">
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
              <Fill k="profile.addrSec" w="7mm" />段
            </p>
            <p className="ps-ind">
              <Fill k="profile.addrLane" w="9mm" />巷<Fill k="profile.addrAlley" w="9mm" />弄
              <Fill k="profile.addrNo" w="10mm" />號<Fill k="profile.addrFloor" w="8mm" />樓-
              <Cells n={4} line />
            </p>
            <p className="ps-note">(鄉鎮代碼)</p>
            <p>
              <span className="ps-req">＊</span>8.戶籍住址：<Fill k="d.regCountyBase" w="10mm" />
              <span className="ps-stack">
                <Opt k="d.regCountySfx" v="縣">縣</Opt>
                <Opt k="d.regCountySfx" v="市">市</Opt>
              </span>
              <Fill k="d.regTownBase" w="10mm" />
              <span className="ps-stack">
                <Opt k="d.regTownSfx" v="鄉鎮">鄉鎮</Opt>
                <Opt k="d.regTownSfx" v="市區">市區</Opt>
              </span>
              -<Cells n={4} line />
            </p>
            <p className="ps-note">(鄉鎮代碼)</p>

            <div className="ps-box">
              本表資料將會作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。
            </div>

            <p className="ps-h">本人同意接受檢查，確認以上資料正確無誤：</p>
            <p>
              <Sign k="hpv.sigConsent" />
              <span className="ps-h">（簽名）</span>
            </p>

            <h2 className="ps-h">二、個案臨床資料（檢查婦女填寫）</h2>
            <p className="ps-q">
              9.最近一年使用口服避孕藥達 6 個月以上
              <br />
              <Opt k="hpv.q9" v="1">①無</Opt> <Opt k="hpv.q9" v="2">②有</Opt> <Opt k="hpv.q9" v="3">③不知道/拒答</Opt>
            </p>
            <p className="ps-q">
              10.最近一年因更年期症狀使用荷爾蒙補充療法達 6 個月以上 <Opt k="hpv.q10" v="1">①無</Opt>{' '}
              <Opt k="hpv.q10" v="2">②有</Opt> <Opt k="hpv.q10" v="3">③不知道/拒答</Opt>
            </p>
            <p className="ps-q">
              11.請問您是否使用免疫抑制劑藥物(如類固醇、抗移植排斥藥物等) <Opt k="hpv.q11" v="1">①無</Opt>{' '}
              <Opt k="hpv.q11" v="2">②有</Opt> <Opt k="hpv.q11" v="3">③不知道/拒答</Opt>
            </p>
            <p className="ps-q">
              12.最近一年性行為時曾經使用保險套 <Opt k="hpv.q12" v="1">①無</Opt> <Opt k="hpv.q12" v="2">②有</Opt>{' '}
              <Opt k="hpv.q12" v="3">③最近一年無性行為</Opt> <Opt k="hpv.q12" v="4">④不知道/拒答</Opt>
            </p>
            <p className="ps-q">
              13.最近一年平均每個月陰道灌洗頻率
              <br />
              <Opt k="hpv.q13" v="1">①從未灌洗</Opt> <Opt k="hpv.q13" v="2">②不到 1 次</Opt>{' '}
              <Opt k="hpv.q13" v="3">③1 次</Opt> <Opt k="hpv.q13" v="4">④2-4 次</Opt>{' '}
              <Opt k="hpv.q13" v="5">⑤至少 5 次</Opt> <Opt k="hpv.q13" v="6">⑥不知道/拒答</Opt>
            </p>
            <p className="ps-q">
              14.最近一年吸菸習慣(持續吸菸 6 個月以上)
              <br />
              <Opt k="hpv.q14" v="1">①無</Opt> <Opt k="hpv.q14" v="2">②已戒菸 6 個月以上</Opt>{' '}
              <Opt k="hpv.q14" v="3">③有吸菸</Opt>
            </p>
            <p className="ps-q">
              15.請問您接種的 HPV 疫苗是 <Opt k="hpv.q15" v="1">①未接種</Opt> <Opt k="hpv.q15" v="2">②保蓓(2 價)</Opt>{' '}
              <Opt k="hpv.q15" v="3">③嘉喜(4 價)</Opt> <Opt k="hpv.q15" v="4">④嘉喜(9 價)</Opt>{' '}
              <Opt k="hpv.q15" v="5">⑤不記得</Opt>
            </p>
            <p className="ps-q">
              16.最近一次 HPV 檢測時間 <Opt k="hpv.q16" v="1">①1 年內</Opt> <Opt k="hpv.q16" v="2">②1-2 年內</Opt>{' '}
              <Opt k="hpv.q16" v="3">③2-3 年內</Opt> <Opt k="hpv.q16" v="4">④3 年以上</Opt>{' '}
              <Opt k="hpv.q16" v="5">⑤從未檢查過</Opt>
            </p>
            <p className="ps-q">
              17.最近一次 HPV 檢測結果 <Opt k="hpv.q17" v="1">①未感染</Opt> <Opt k="hpv.q17" v="2">②有感染</Opt>{' '}
              <Opt k="hpv.q17" v="3">③不知道</Opt> <Opt k="hpv.q17" v="4">④從未檢查過</Opt>
            </p>
          </div>

          <div>
            <h2 className="ps-h" style={{ marginTop: 0 }}>
              三、採檢資料（採檢醫療機構填寫）
            </h2>
            <p>
              <span className="ps-req">＊</span>18.採檢醫療機構：<Fill k="hpv.collectOrg" w="34mm" />
              (機構代碼)
            </p>
            <p>
              <span className="ps-req">＊</span>19.採檢體日期：{date('hpv.collect')}
            </p>
            <p>
              <span className="ps-req">＊</span>20.檢體取樣醫事人員簽名（或蓋章）：
            </p>
            <p className="ps-ind">
              <Sign k="hpv.sigCollector" full />
            </p>
            <p className="ps-ind">檢體取樣醫事人員身分別：</p>
            <p className="ps-ind">
              <Opt k="hpv.collectorRole" v="1">①婦產科醫師</Opt> <Opt k="hpv.collectorRole" v="2">②家醫科醫師</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="hpv.collectorRole" v="3">③助產人員</Opt> <Opt k="hpv.collectorRole" v="4">④衛生所護理人員</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="hpv.collectorRole" v="5">⑤衛生所醫師(非屬①②)</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>21.本次是否同時進行抹片檢查：<Opt k="hpv.withPap" v="1">①否</Opt>{' '}
              <Opt k="hpv.withPap" v="2">②是</Opt>
            </p>
            <p className="ps-ind" style={{ paddingLeft: '1em' }}>
              22.做 HPV 檢查目的：<Opt k="hpv.purpose" v="1">①篩檢</Opt> <Opt k="hpv.purpose" v="2">②追蹤</Opt>{' '}
              <Opt k="hpv.purpose" v="3">③其他</Opt>
            </p>

            <h2 className="ps-h">四、檢驗資料（檢驗單位填寫）</h2>
            <p>
              <span className="ps-req">＊</span>23.檢驗實驗室：<Fill k="hpv.lab" w="36mm" />
              (機構代碼)
            </p>
            <p>
              <span className="ps-req">＊</span>24.檢體編號：<Fill k="hpv.specimenNo" w="52mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>25.檢體收到日期：{date('hpv.recv')}
            </p>
            <p>
              <span className="ps-req">＊</span>26.發報告日期：{date('hpv.report')}
            </p>
            <p>
              <span className="ps-req">＊</span>27.檢驗試劑
            </p>
            {(
              [
                ['1', '① Abbott RealTime HPV test'],
                ['2', '② BD Onclarity HPV Assay'],
                ['3', '③ Roche Cobas HPV test'],
                ['4', '④ CapitalBio HPV Genotyping Kit'],
                ['5', '⑤ DR. HPV Genotyping IVD kit'],
                ['6', '⑥ EASY CHIP HPV Blot'],
                ['8', '⑧ Xpert HPV'],
                ['9', '⑨ Alinity m HR HPV'],
                ['12', '⑫ Aptima HPV 16 18/45 Genotype Assay'],
              ] as const
            ).map(([v, label]) => (
              <p className="ps-ind" key={v}>
                <Opt k="hpv.reagent" v={v}>
                  {label}
                </Opt>
              </p>
            ))}
            <p className="ps-ind">
              <Opt k="hpv.reagent" v="99">
                <span className="ps-num99">99</span> Other :
              </Opt>
              <Fill k="hpv.reagentOther" w="46mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>28.檢驗結果
            </p>
            <p className="ps-ind">
              <Opt k="hpv.judge" v="1">①可判讀</Opt>
            </p>
            <p className="ps-ind2">1.High-risk HPV</p>
            <p className="ps-ind3">
              <Opt k="hpv.hr" v="0">⓪陰性</Opt>
            </p>
            <p className="ps-ind3">
              <Opt k="hpv.hr" v="1">①陽性</Opt>
              {hr(['16', '18', '31', '33', '35', '39'])}
            </p>
            <p className="ps-types">{hr(['45', '51', '52', '56', '58', '59'])}</p>
            <p className="ps-types">{hr(['66', '68', '18/45'])}</p>
            <p className="ps-types">
              <Cb k="hpv.hrTypes" v="n1618" />非 16、18 之不分型
            </p>
            <p className="ps-types">
              <Cb k="hpv.hrTypes" v="n161845" />非 16、18/45 之不分型
            </p>
            <p className="ps-ind2">2.Low-risk HPV</p>
            <p className="ps-ind3">
              <Opt k="hpv.lr" v="0">⓪陰性</Opt>
            </p>
            <p className="ps-ind3">
              <Opt k="hpv.lr" v="1">①陽性</Opt>
              {lr(['6', '11', '40', '42', '43', '44'])}
            </p>
            <p className="ps-types">{lr(['54', '61', '70', '72', '82'])}</p>
            <p className="ps-types">
              <Cb k="hpv.lrTypes" v="nt" />不分型
            </p>
            <p className="ps-ind3">
              <Opt k="hpv.lr" v="2">②未檢測</Opt>
            </p>
            <p className="ps-ind2">3.其他型別</p>
            <p className="ps-ind3">
              <Opt k="hpv.ot" v="0">⓪陰性</Opt>
            </p>
            <p className="ps-ind3">
              <Opt k="hpv.ot" v="1">①陽性(請填型別)</Opt>：<Fill k="hpv.ot1" />、<Fill k="hpv.ot2" />、<Fill k="hpv.ot3" />
            </p>
            <p className="ps-types" style={{ paddingLeft: '12.6em' }}>
              <Fill k="hpv.ot4" />、<Fill k="hpv.ot5" />、<Fill k="hpv.ot6" />
            </p>
            <p className="ps-ind3">
              <Opt k="hpv.ot" v="2">②未檢測</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="hpv.judge" v="2">②無法判讀</Opt>
            </p>
            <p className="ps-ind ps-h">
              <span className="ps-req">＊</span>檢驗者簽名（或蓋章）
            </p>
            <p className="ps-ind">
              <Sign k="hpv.sigLab" style={{ width: '48mm' }} />
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
