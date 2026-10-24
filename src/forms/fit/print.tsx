// 糞便潛血檢查（依原紙本格式，A4）：第 1 頁檢查紀錄結果表單、第 2 頁衛教指引檢核表、
// 第 3 頁大腸癌篩檢家族史及吸菸習慣資料表（附表五之六；吸菸或家族史任一項為「有」才列印）
import { Fragment, type ReactNode } from 'react';
import { type PrintData, printKit } from '@/components/forms/print-kit';
import type { FormValues } from '@/db/schema';
import { FIT_ANNEX, FIT_ANNEX_TABLES, FIT_CHECKLIST, FIT_RELATIVES } from '@/lib/forms/defs/fit';
import { conditionsHold } from '@/lib/forms/engine';

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** 父親、母親只有一位，罹癌人數欄畫斜線 */
const diag = (
  <td className="ps-diag">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="0" x2="100" y2="100" stroke="#000" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  </td>
);

export function FitPrint({ data }: { data: PrintData }) {
  const { Opt, Cb, Fill, Cells, Sign } = printKit(data);
  const val = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
  /** 勾選方框＋代碼與文字 */
  const cbs = (k: string, items: readonly (readonly [string, ReactNode])[], sep: string, end = '') =>
    items.map(([v, label], i) => (
      <Fragment key={v}>
        <Cb k={k} v={v} />
        {label}
        {i < items.length - 1 ? sep : end}
      </Fragment>
    ));
  const date = (prefix: string) => (
    <>
      民國<Fill k={`${prefix}Y`} w="10mm" />年<Fill k={`${prefix}M`} w="7mm" />月<Fill k={`${prefix}D`} w="7mm" />日
    </>
  );
  const annex = conditionsHold(FIT_ANNEX, data as FormValues);

  return (
    <div className="ps ps--fit">
      <article className="ps-page">
        <h1 className="ps-title">健康署定量免疫法糞便潛血檢查服務檢查紀錄結果表單</h1>
        <p>
          支付方式：
          {cbs(
            'fit.pay',
            [
              ['1', '❶預防保健'],
              ['3', '❸健保醫療給付'],
              ['4', '❹其他公務預算補助'],
              ['5', '❺自費健康檢查'],
            ],
            '；',
            '；',
          )}
        </p>
        <p style={{ paddingLeft: '5em' }}>
          <Cb k="fit.pay" v="9" />
          ❾其他。
        </p>
        <p>
          篩檢地點：
          {cbs(
            'fit.site',
            [
              ['1', '❶社區或職場設站篩檢'],
              ['2', '❷門診'],
              ['3', '❸住院'],
              ['4', '❹郵寄'],
              ['5', '❺其他'],
            ],
            '；',
            '。',
          )}
        </p>

        <p className="pf-sec">
          <span className="ps-boxed">基本資料</span>
        </p>
        <p className="pf-row">
          <span>
            姓名：<Fill k="profile.name" w="42mm" />
          </span>
          <span>
            性別：<Cb k="profile.sex" v="M" />男 <Cb k="profile.sex" v="F" />女
          </span>
          <span>
            出生日期：民國<Fill k="profile.birthY" w="10mm" />年<Fill k="profile.birthM" w="7mm" />月
            <Fill k="profile.birthD" w="7mm" />日
          </span>
        </p>
        <div className="pf-row">
          <p>
            身分證統一編號
            <br />
            統一證號（外籍）　<Cells k="profile.idNo" n={10} />
          </p>
          <p>
            聯絡電話：（<Fill k="d.phoneArea" w="9mm" />）<Fill k="d.phoneNum" w="30mm" />
            <br />
            手機：<Fill k="d.mobile" w="42mm" />
          </p>
        </div>
        <p>
          現居住地址：（鄉鎮市區代碼：<Cells n={4} />）
        </p>
        <p className="pf-ind">
          <Fill k="d.countyBase" w="12mm" />
          <span className="ps-stack">
            <Opt k="d.countySfx" v="縣">縣</Opt>
            <Opt k="d.countySfx" v="市">市</Opt>
          </span>
          <Fill k="d.townBase" w="12mm" />
          <span className="ps-stack ps-stack--2">
            <span>
              <Opt k="d.townSfxRaw" v="市">市</Opt>
              <Opt k="d.townSfxRaw" v="鄉">鄉</Opt>
            </span>
            <span>
              <Opt k="d.townSfxRaw" v="區">區</Opt>
              <Opt k="d.townSfxRaw" v="鎮">鎮</Opt>
            </span>
          </span>
          <Fill k="d.villageBase" w="12mm" />
          <span className="ps-stack">
            <Opt k="d.villageSfx" v="村">村</Opt>
            <Opt k="d.villageSfx" v="里">里</Opt>
          </span>
          <Fill k="d.roadBase" w="14mm" />
          <span className="ps-stack">
            <Opt k="d.roadSfx" v="路">路</Opt>
            <Opt k="d.roadSfx" v="街">街</Opt>
          </span>
          <Fill k="profile.addrSec" w="8mm" />段<Fill k="profile.addrLane" w="9mm" />巷
          <Fill k="profile.addrAlley" w="9mm" />弄<Fill k="profile.addrNo" w="10mm" />號
          <Fill k="profile.addrFloor" w="8mm" />樓
        </p>
        <p>
          教育:
          {cbs(
            'profile.edu',
            [
              ['1', '❶無'],
              ['2', '❷小學'],
              ['3', '❸國（初）中'],
              ['4', '❹高中（職）'],
              ['5', '❺專科、大學'],
              ['6', '❻研究所以上'],
              ['7', '❼拒答'],
            ],
            '；',
          )}
        </p>

        <p className="pf-sec">
          <span className="ps-boxed">家族病史及吸菸習慣</span>
        </p>
        <p>
          1.吸菸史：<Cb k="fit.smoke" v="0" />無；<Cb k="fit.smoke" v="1" />有(含已戒菸)，開始吸菸年齡：
          <Fill k="fit.smokeAge" w="12mm" />歲。
        </p>
        <p>
          2.請問與您有血緣的父母、兄弟姐妹或子女或其他親屬有無得過大腸直腸癌？
          {cbs(
            'fit.famCrc',
            [
              ['0', '⓿無'],
              ['1', '❶有'],
              ['2', '❷不知道'],
            ],
            '；',
            '。',
          )}
        </p>
        <p>
          3.請問與您有血緣的父母、兄弟姐妹或子女或其他親屬有無得過其他癌症？
          {cbs(
            'fit.famCa',
            [
              ['0', '⓿無'],
              ['1', '❶有'],
              ['2', '❷不知道'],
            ],
            '；',
            '。',
          )}
        </p>
        <p>以上如有任一項填寫”有”，請繼續填寫附表五之六。</p>
        <p className="pf-sec">
          <span className="ps-boxed">有無症狀</span>
        </p>
        <p>
          請問您有無腸道不適症狀?如腹瀉、便秘、糞便變稠、排泄黏液、便血、黃便帶血或其他症狀
          <Cb k="fit.symptom" v="0" />
          ⓿無；
          <Cb k="fit.symptom" v="1" />
          ❶有。
        </p>
        <p>
          *本人同意接受糞便潛血檢查，本表資料將作為衛生及學術單位進行個案追蹤關懷及健康管理、資格檢核、比對連結、統計分析、政策評估及其他相關目的使用
        </p>
        <p>
          確認以上資料正確無誤：
          <Sign k="fit.sigConsent" style={{ width: '48mm' }} />
          （簽名）
        </p>

        <p className="pf-sec">
          <span className="ps-boxed">個案檢查情形</span>（檢查醫療院所）
        </p>
        <p>
          檢查醫療院所名稱及代碼：<Fill k="fit.clinic" w="55mm" />，門診日期：{date('fit.visit')}。
        </p>
        <p className="pf-sec">
          <span className="ps-boxed">糞便潛血檢查結果</span>（糞便潛血檢驗機構填寫）
        </p>
        <p>
          1. 醫事檢驗機構/醫療院所名稱及代碼：<Fill k="fit.lab" w="60mm" />
        </p>
        <p>2. 檢驗日期：{date('fit.lab')}。</p>
        <p>
          3. 檢驗結果：<Cb k="fit.result" v="0" />
          ⓿陰性 <Cb k="fit.result" v="1" />
          ❶陽性，數值：<Fill k="fit.value" w="20mm" />。
        </p>
        <p>
          4. 定量試劑商品名稱：<Cb k="fit.reagent" v="0" />
          ⓿Eiken，<Cb k="fit.reagent" v="2" />
          ❷其他<Fill k="fit.reagentOther" w="22mm" />，<Cb k="fit.reagent" v="3" />❸ Kyowa（HM-JACKarc）。
        </p>
        <p className="pf-sec">
          <span className="ps-boxed">個案確診結果</span>
        </p>
        <p>
          1. 前項檢查陽性個案於檢查後三個月內有沒有接受後續確診？ <Cb k="fit.followed" v="0" />
          ⓿沒有；
          <Cb k="fit.followed" v="1" />
          ❶有。
        </p>
        <p>
          2. 沒有接受確診理由為：
          {cbs(
            'fit.noReason',
            [
              ['1', '❶無法聯繫'],
              ['2', '❷出國'],
              ['3', '❸搬家'],
              ['4', '❹死亡'],
              ['5', '❺拒做'],
              ['6', '❻其他'],
            ],
            '，',
          )}
          <Fill k="fit.noReasonOther" w="18mm" />。
        </p>
        <p>
          3. 確診醫療院所名稱及代碼：<Fill k="fit.confirmHospital" w="55mm" />，確診日期：{date('fit.confirm')}。
        </p>
        <p>
          4. 檢查方法：<Cb k="fit.method" v="1" />
          ❶大腸鏡，<Cb k="fit.method" v="9" />
          ❾其他<Fill k="fit.methodOther" w="24mm" />。
        </p>
        <p>
          5.診斷：
          {cbs(
            'fit.dx',
            [
              ['0', '⓿正常'],
              ['1', '❶痔瘡'],
              ['2', '❷潰瘍性大腸炎'],
              ['3', '❸息肉'],
              ['4', '❹大腸癌'],
              ['9', '❾其他'],
            ],
            '，',
          )}
          <Fill k="fit.dxOther" w="24mm" />。
        </p>
        <p>
          *如有息肉，息肉有無切除：
          {cbs(
            'fit.polypCut',
            [
              ['1', '❶未切除'],
              ['2', '❷已完全切除'],
              ['3', '❸未完全切除'],
            ],
            ' ',
            '。',
          )}
        </p>
      </article>

      <article className="ps-page">
        <h1 className="ps-title">大腸癌篩檢衛教指引檢核表</h1>
        <table className="ps-table pf-check">
          <tbody>
            <tr>
              <th className="c">
                <b>日期</b>
              </th>
              {[1, 2].map((n) => (
                <td key={n} className="c">
                  {val(`fit.edu${n}Y`)} / {val(`fit.edu${n}M`)} / {val(`fit.edu${n}D`)}
                </td>
              ))}
            </tr>
            <tr>
              <th className="c">
                <b>姓名/病歷號或 ID</b>
              </th>
              {[1, 2].map((n) => (
                <td key={n} className="c">
                  {val(`fit.edu${n}Name`)} / {val(`fit.edu${n}Pid`)}
                </td>
              ))}
            </tr>
            <tr>
              <th className="c">
                <b>檢核項目</b>
              </th>
              <th className="c">
                <b>評值</b>
              </th>
              <th className="c">
                <b>評值</b>
              </th>
            </tr>
            {FIT_CHECKLIST.map((s, i) => (
              <tr key={s.step}>
                <td>
                  {s.step}
                  <br />
                  {s.title}
                </td>
                {[1, 2].map((n) => (
                  <td key={n}>
                    {s.items.map(([v, label], j) => (
                      <Fragment key={v}>
                        {j > 0 && <br />}
                        <Cb k={`fit.edu${n}S${i + 1}`} v={v} />
                        {label}
                      </Fragment>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      {annex && (
        <article className="ps-page">
          <h1 className="ps-title">大腸癌篩檢家族史及吸菸習慣資料表</h1>
          <p>
            本人
            <Sign k="fit.sigAnnex" style={{ width: '42mm' }} />
            （簽名）　身分證字號：<Fill k="profile.idNo" w="36mm" />
          </p>
          <p>
            <Cb k="fit.annexConsent" v="Y" />
            同意 <Cb k="fit.annexConsent" v="N" />
            不同意，進行以下大腸癌篩檢之家族史及吸菸習慣問卷填答，供後續相關政策評估。
          </p>
          <p className="pf-sec">
            <b>一、吸菸習慣：</b>
          </p>
          <p className="ps-ind">
            <Cb k="fit.smokeHabit" v="1" />
            已戒菸，戒菸年齡：<Fill k="fit.quitAge" w="14mm" />歲
          </p>
          {(
            [
              ['2', '吸10年以下，每天少於20支；'],
              ['3', '吸10年以下，每天20支或以上；'],
              ['4', '吸超過10年，每天少於20支；'],
              ['5', '吸超過10年，每天20支或以上。'],
            ] as const
          ).map(([v, label]) => (
            <p key={v} className="ps-ind">
              <Cb k="fit.smokeHabit" v={v} />
              {label}
            </p>
          ))}
          <p className="pf-sec">
            <b>二、家族病史：</b>
          </p>
          {FIT_ANNEX_TABLES.map((t, i) => (
            <Fragment key={t.key}>
              <p>
                {i + 1}.若您有血緣的父母、兄弟姐妹、子女或其他親屬有得過{t.withType ? '大腸癌以外的其他癌症' : '大腸直腸癌'}
                ，請填寫以下表格:
              </p>
              <table className="ps-table pf-fam">
                <tbody>
                  <tr>
                    <th className="c">血緣關係</th>
                    {FIT_RELATIVES.map((r) => (
                      <th key={r.value} className="c" colSpan={r.max > 1 ? 3 : undefined}>
                        {r.head}
                      </th>
                    ))}
                  </tr>
                  {t.withType && (
                    <tr>
                      <th className="c">癌別</th>
                      {FIT_RELATIVES.map((r) => (
                        <td key={r.value} className="c" colSpan={r.max > 1 ? 3 : undefined}>
                          {val(`${t.key}${r.value}Type`)}
                        </td>
                      ))}
                    </tr>
                  )}
                  <tr>
                    <th className="c">罹癌人數</th>
                    {FIT_RELATIVES.map((r) =>
                      r.max > 1 ? (
                        <td key={r.value} className="c" colSpan={3}>
                          {val(`${t.key}${r.value}N`)}
                        </td>
                      ) : (
                        <Fragment key={r.value}>{diag}</Fragment>
                      ),
                    )}
                  </tr>
                  <tr>
                    <th className="c">罹癌年紀</th>
                    {FIT_RELATIVES.flatMap((r) =>
                      range(r.max).map((n) => (
                        <td key={`${r.value}${n}`} className="c">
                          {val(`${t.key}${r.value}Age${n}`)}
                        </td>
                      )),
                    )}
                  </tr>
                </tbody>
              </table>
            </Fragment>
          ))}
          <p className="pf-note">
            *其他父系親屬：僅含曾祖父母、祖父母、伯、叔、姑、姪男(女)、孫子(女)
            <br />
            *其他母系親屬：僅含外曾祖父母、外祖父母、舅父、姨母、外甥(女)、外孫子(女)
            <br />
            **若罹癌人數超過3位，罹癌年齡自最小年齡起算3位
          </p>
          <p className="pf-sec">
            訪問人員簽名(醫療院所)：
            <Sign k="fit.sigInterviewer" style={{ width: '48mm' }} />　日期：{date('fit.iv')}
          </p>
          <p className="pf-note">備註：大腸癌篩檢家族史及吸菸習慣資料表，請視同病歷資料留存院所備查。</p>
        </article>
      )}
    </div>
  );
}
