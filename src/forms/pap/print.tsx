// 健康署婦女子宮頸抹片檢查服務檢查紀錄結果表單（附表三之四；依原紙本格式，A4 一頁兩欄，原三聯內容相同只輸出一份）
import { type PrintData, printKit } from '@/components/forms/print-kit';
import { PAP_DX } from '@/lib/forms/defs/pap';
import { codeOf } from '@/lib/forms/format';

export function PapPrint({ data }: { data: PrintData }) {
  const { Opt, Fill, Cells, Sign } = printKit(data);
  const date = (prefix: string, w = ['9mm', '8mm', '8mm']) => (
    <>
      民國<Fill k={`${prefix}Y`} w={w[0]} />年<Fill k={`${prefix}M`} w={w[1]} />月<Fill k={`${prefix}D`} w={w[2]} />日
    </>
  );
  const yn = (k: string, unknown = true) => (
    <>
      <Opt k={k} v="1">①是</Opt> <Opt k={k} v="2">②否</Opt>
      {unknown && (
        <>
          {' '}
          <Opt k={k} v="3">③不知道</Opt>
        </>
      )}
    </>
  );

  return (
    <div className="ps ps--pap">
      <article className="ps-page">
        <div className="pp-head">
          <span className="pp-annex">附表三之四</span>
          <h1 className="ps-title">健康署婦女子宮頸抹片檢查服務檢查紀錄結果表單</h1>
        </div>
        <p className="pp-fund">本檢查「由衛生福利部國民健康署運用菸品健康福利捐/公務預算補助」</p>
        <div className="ps-cols">
          <div>
            <p>
              <span className="ps-req">＊</span>國籍：<Opt k="pap.nationality" v="1">①本國</Opt>{' '}
              <Opt k="pap.nationality" v="2">②外籍人士</Opt>
            </p>
            <p className="ps-q">
              <span className="ps-req">＊</span>抹片車或社區巡迴服務：<Opt k="pap.van" v="1">①否</Opt>{' '}
              <Opt k="pap.van" v="2">②抹片車</Opt> <Opt k="pap.van" v="3">③社區巡迴服務篩檢</Opt>
            </p>
            <p className="ps-q">
              <span className="ps-req">＊</span>1.支付方式：<Opt k="pap.pay" v="1">①預防保健</Opt>{' '}
              <Opt k="pap.pay" v="2">②健保醫療給付</Opt> <Opt k="pap.pay" v="3">③其他公務預算補助</Opt>{' '}
              <Opt k="pap.pay" v="4">④其他</Opt> <Opt k="pap.pay" v="6">⑥自費健康檢查</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>難判重做? {yn('pap.redo', false)}
            </p>
            <p className="ps-ind">
              時程代碼：<Cells k="pap.schedule" n={2} line />
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

            <h2 className="ps-h">二、個案臨床資料（檢查婦女填寫）</h2>
            <p className="pp-na ps-q">
              9.最近一次抹片檢查時間？<Opt k="pap.q9" v="1">①1 年內</Opt> <Opt k="pap.q9" v="2">②1 至 2 年內</Opt>{' '}
              <Opt k="pap.q9" v="3">③2 至 3 年內</Opt> <Opt k="pap.q9" v="4">④3 年以上</Opt>{' '}
              <Opt k="pap.q9" v="5">⑤從未檢查過</Opt>
            </p>
            <p className="pp-na">10.已停經？（一年無月經）{yn('pap.q10')}</p>
            <p className="pp-na">
              11.最後一次月經日期：{date('pap.q11', ['8mm', '7mm', '7mm'])}
            </p>
            <p className="pp-na">12.現在是否懷孕？ {yn('pap.q12')}</p>
            <p>
              <span className="ps-req">＊</span>13.子宮是否切除？ {yn('pap.q13')}
            </p>
            <p>
              <span className="ps-req">＊</span>14.子宮是否接受過放射線治療？{yn('pap.q14')}
            </p>
            <p className="ps-q">
              <span className="ps-req">＊</span>15.是否曾接種人類乳突病毒(HPV)疫苗？(95 年起有 HPV 疫苗){' '}
              <Opt k="pap.q15" v="1">①是</Opt>，民國<Fill k="pap.q15Year" w="10mm" />年{' '}
              <Opt k="pap.q15" v="2">②否</Opt> <Opt k="pap.q15" v="3">③不知道</Opt>
            </p>

            <div className="ps-box">
              本表資料將會作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用。
            </div>

            <p className="ps-h">本人同意接受檢查，確認以上資料正確無誤：</p>
            <p>
              <Sign k="pap.sigConsent" />
              <span className="ps-h">（簽名）</span>
            </p>

            <h2 className="ps-h">三之一、抹片資料（採檢醫療機構填寫）</h2>
            <p className="pp-na">
              16.病歷號：<Fill k="pap.chartNo" w="26mm" />
              <span className="ps-req">＊</span>雙子宮頸? {yn('pap.doubleCervix', false)}
            </p>
            <p>
              <span className="ps-req">＊</span>17.抹片檢體取樣日期：{date('pap.collect')}
            </p>
            <p>
              <span className="ps-req">＊</span>18.抹片檢體取樣機構：名稱 <Fill k="pap.collectOrgName" w="36mm" />
            </p>
            <p style={{ paddingLeft: '5.6em' }}>
              （代碼 10 碼）<Fill k="pap.collectOrgCode" w="36mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>19.抹片檢體取樣醫事人員簽名（或蓋章）：
            </p>
            <p className="ps-ind">
              <Sign k="pap.sigCollector" full />
            </p>
            <p className="ps-ind2">抹片檢體取樣人員身分別：</p>
            <p className="ps-ind2">
              <Opt k="pap.collectorRole" v="1">①婦產科醫師</Opt> <Opt k="pap.collectorRole" v="2">②家醫科醫師</Opt>{' '}
              <Opt k="pap.collectorRole" v="3">③助產人員</Opt> <Opt k="pap.collectorRole" v="4">④衛生所護理人員</Opt>{' '}
              <Opt k="pap.collectorRole" v="5">⑤衛生所醫師（非屬①②）</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>20.本次檢查是否合併 HPV 檢測服務? <Opt k="pap.withHpv" v="1">①否</Opt>{' '}
              <Opt k="pap.withHpv" v="2">②是</Opt>
            </p>
            <p className="ps-q">
              <span className="ps-req">＊</span>21.做抹片目的：<Opt k="pap.purpose" v="1">①篩檢</Opt>{' '}
              <Opt k="pap.purpose" v="2">②懷疑癌症</Opt> <Opt k="pap.purpose" v="3">③追蹤</Opt>{' '}
              <Opt k="pap.purpose" v="4">④前次抹片難以判讀</Opt> <Opt k="pap.purpose" v="5">⑤其他</Opt>
            </p>
            <p className="pp-na">
              22.臨床所見（含骨盆腔檢查結果）：<Fill k="pap.finding" w="30mm" style={{ textAlign: 'left' }} />
            </p>
          </div>

          <div>
            <h2 className="ps-h" style={{ marginTop: 0 }}>
              三之二、抹片資料（病理醫療機構填寫）
            </h2>
            <p>
              <span className="ps-req">＊</span>23.抹片細胞病理編號：<Fill k="pap.cytoNo" w="42mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>24.抹片判讀機構：名稱<Fill k="pap.readOrgName" w="42mm" />
            </p>
            <p style={{ paddingLeft: '5.6em' }}>
              （代碼 10 碼）<Fill k="pap.readOrgCode" w="42mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>25.抹片收到日期：{date('pap.recv', ['10mm', '9mm', '9mm'])}
            </p>
            <p>
              <span className="ps-req">＊</span>26.檢體種類：<Opt k="pap.specimenType" v="1">①常規抹片</Opt>{' '}
              <Opt k="pap.specimenType" v="2">②液體標本</Opt>
            </p>

            <h2 className="ps-h">四、抹片判讀結果（病理醫療機構填寫）</h2>
            <p>
              <span className="ps-req">＊</span>27.閱片方式：<Opt k="pap.readMethod" v="1">①人工</Opt>{' '}
              <Opt k="pap.readMethod" v="2">②機械</Opt> <Opt k="pap.readMethod" v="3">③人工＋機械</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>28.抹片品質：<Opt k="pap.quality" v="1">①良好</Opt>{' '}
              <Opt k="pap.quality" v="2">②尚可</Opt> <Opt k="pap.quality" v="3">③抹片難以判讀</Opt>
            </p>
            <p>
              <span className="ps-req">＊</span>29.抹片尚可或難以判讀之原因（最多可選二個）
            </p>
            <div className="ps-ind pp-grid2">
              <span><Opt k="pap.qualityReason" v="1">①抹片固定或保存不良</Opt></span>
              <span><Opt k="pap.qualityReason" v="2">②細胞太少</Opt></span>
              <span><Opt k="pap.qualityReason" v="3">③太厚或太多血液</Opt></span>
              <span><Opt k="pap.qualityReason" v="4">④沒有子宮內頸成份</Opt></span>
              <span><Opt k="pap.qualityReason" v="5">⑤炎症細胞過多</Opt></span>
              <span><Opt k="pap.qualityReason" v="6">⑥存在外來物（如潤滑劑）</Opt></span>
              <span><Opt k="pap.qualityReason" v="7">⑦過多細胞溶解或自溶</Opt></span>
              <span>
                <Opt k="pap.qualityReason" v="8">⑧其他</Opt>
                <Fill k="pap.qualityReasonOther" w="22mm" />
              </span>
            </div>
            <p>
              <span className="ps-req">＊</span>30.可能的感染（可多選）<Opt k="pap.infection" v="1">①Candida</Opt>{' '}
              <Opt k="pap.infection" v="2">②Trichomonas</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="pap.infection" v="3">③Herpes</Opt> <Opt k="pap.infection" v="7">⑦Shift in flora（bacterial vaginosis）</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="pap.infection" v="8">⑧Actinomyces</Opt> <Opt k="pap.infection" v="6">⑥Others</Opt>
              <Fill k="pap.infectionOther" w="26mm" />
            </p>
            <p>
              <span className="ps-req">＊</span>31.細胞病理診斷（只可單選）：<Fill k="pap.dx" w="20mm" />
            </p>
            <div className="pp-dxlist">
              {PAP_DX.map((row) =>
                'head' in row ? (
                  <p key={row.head}>{row.head}</p>
                ) : (
                  <p
                    key={row.value}
                    className={`pp-dx${row.top ? '' : ' pp-dx--in'}${row.value === '14' ? ' pp-dx--gap' : ''}`}
                  >
                    <span>
                      {row.value === '17' ? (
                        <>
                          Dysplasia <em>cannot exclude</em> HSIL
                        </>
                      ) : (
                        row.label
                      )}
                    </span>
                    {row.value === '14' && <Fill k="pap.dxOther" w="24mm" />}
                    <i />
                    <Opt k="pap.dx" v={row.value}>
                      {codeOf(row.value)}
                    </Opt>
                  </p>
                ),
              )}
            </div>
            <p className="pp-na">32.子宮內膜細胞出現於 40 歲以上婦女 {yn('pap.endometrial', false)}</p>
            <p className="pp-na">33.建議：</p>
            <p className="ps-ind">
              <Opt k="pap.advice" v="1">①因抹片難以判讀，請重做抹片檢查</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="pap.advice" v="2">②治療發炎，並於三個月後重做抹片檢查</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="pap.advice" v="3">③抹片結果異常，請再做進一步檢查</Opt>
            </p>
            <p className="ps-ind">
              <Opt k="pap.advice" v="4">④其他建議</Opt>
              <Fill k="pap.adviceOther" w="58mm" style={{ textAlign: 'left' }} />
            </p>
            <p className="ps-ind2">
              <span className="pp-line" />
            </p>

            <p className="ps-h">
              <span className="ps-req">＊</span>檢驗者（請簽名及填寫代碼）
            </p>
            <div className="pp-signers">
              <div>
                <p>Cytotechnologist</p>
                <p>
                  <Sign k="pap.sigCt" />
                  <Cells k="pap.ctCode" n={2} />
                </p>
                <p>
                  <span className="pp-line" />
                </p>
              </div>
              <div>
                <p>Cytopathologist</p>
                <p>
                  <Sign k="pap.sigCp" />
                  <Cells k="pap.cpCode" n={2} />
                </p>
                <p>
                  <span className="ps-sign" style={{ width: '14mm' }} />（<Fill k="pap.cpM" w="6mm" />月
                  <Fill k="pap.cpD" w="6mm" />日）＊
                </p>
              </div>
            </div>
            <div className="pp-foot">
              <span>＊為必填之項目</span>
              <span>
                ＊請輸入確診日期
                <br />
                （115 年 1 月修訂）
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
