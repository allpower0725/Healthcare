// 健康署「糞便抗原檢測胃幽門螺旋桿菌服務」管理紀錄表（附表八之四；依原紙本格式，A4 一頁單欄）
import { Fragment } from 'react';
import { type PrintData, printKit } from '@/components/forms/print-kit';
import { HP_OPTIONS as O } from '@/lib/forms/defs/hp';
import type { Option } from '@/lib/forms/profile';

export function HpPrint({ data }: { data: PrintData }) {
  const { Opt, Cb, Fill, Cells, Sign } = printKit(data);
  /** 勾選方框＋選項文字，以空白分隔 */
  const cbs = (k: string, options: readonly Option[], sep = ' ') =>
    options.map(([v, label], i) => (
      <Fragment key={v}>
        <Cb k={k} v={v} />
        {label}
        {i < options.length - 1 ? sep : ''}
      </Fragment>
    ));
  const date = (prefix: string) => (
    <>
      民國<Fill k={`${prefix}Y`} w="10mm" />年<Fill k={`${prefix}M`} w="7mm" />月<Fill k={`${prefix}D`} w="7mm" />日
    </>
  );
  const famKey = (k: string, rel: string) => <Cb k={`hp.${k}Rel`} v={rel} />;
  const numbered = (k: string, options: readonly Option[]) =>
    options.map(([v, label], i) => (
      <Fragment key={v}>
        <Cb k={k} v={v} />
        {v}.{label}
        {i < options.length - 1 ? ' ' : ''}
      </Fragment>
    ));

  return (
    <div className="ps ps--hp">
      <article className="ps-page">
        <p className="ph-top">
          <span>附表八之四</span>
          <span>本項經費由衛生福利部國民健康署運用菸品健康福利捐/公務預算補助</span>
        </p>
        <h1 className="ps-title">健康署「糞便抗原檢測胃幽門螺旋桿菌服務」管理紀錄表</h1>
        <p>
          支付方式：{cbs('hp.pay', O.pay, '')}
          <span className="ph-rev">115 年 1 月</span>
        </p>
        <p>
          採檢單位：<Fill k="hp.unit" w="42mm" />　醫事機構代碼：<Fill k="hp.unitCode" w="45mm" />
        </p>
        <p>
          姓名：<Fill k="profile.name" w="35mm" />，性別：<Cb k="profile.sex" v="M" />男<Cb k="profile.sex" v="F" />女，原住民：
          <Cb k="profile.aboriginal" v="N" />否 <Cb k="profile.aboriginal" v="Y" />是(請續答，<Fill k="profile.tribe" w="30mm" />族)
        </p>
        <p>
          身分證：<Fill k="profile.idNo" w="34mm" />，出生日期：民國<Fill k="profile.birthY" w="10mm" />年
          <Fill k="profile.birthM" w="7mm" />月<Fill k="profile.birthD" w="7mm" />日，門診日期：{date('hp.visit')}
        </p>
        <p>
          <b>(若糞便抗原檢測首次檢驗結果為②檢測失效，第二次門診日期為</b>
          {date('hp.visit2')}
          <b>)</b>
        </p>
        <p>
          聯絡電話：（<Fill k="d.phoneArea" w="10mm" />）<Fill k="d.phoneNum" w="32mm" />，手機：
          <Fill k="d.mobile" w="34mm" />
        </p>
        <p>
          宗教：{cbs('hp.religion', O.religion)}
          <Fill k="hp.religionOther" w="36mm" />
        </p>
        <p>
          現居住地址：（鄉鎮市區代碼：<Cells n={4} />）
        </p>
        <p className="ph-ind">
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
          教　育：
          {cbs('profile.edu', [
            ['1', '無'],
            ['2', '小學'],
            ['3', '國(初)中'],
            ['4', '高中(職)'],
            ['5', '專科、大學'],
            ['6', '研究所以上'],
            ['7', '拒答'],
          ])}
        </p>
        <p>
          職　業：<Cb k="hp.job" v="Y" />有，<Fill k="hp.jobName" w="36mm" />；<Cb k="hp.job" v="N" />無；
          <Cb k="hp.job" v="R" />拒答
        </p>
        <p>婚姻狀況：{cbs('hp.marital', O.marital)}</p>

        <p className="ph-sec">
          <span className="ps-boxed">個人病史</span>
        </p>
        <p>
          1. 個人（<b>曾經</b>）：{cbs('hp.pmh', O.pmh.slice(0, 8))}
        </p>
        <p className="ph-ind">
          <Cb k="hp.pmh" v="other" />其他<Fill k="hp.pmhOther" w="28mm" />；民國<Fill k="hp.pmhYear" w="12mm" />年/
          <Cb k="hp.pmhYearU" v="1" />不詳
        </p>
        <p>2. 曾接受胃幽門桿菌除菌治療：{cbs('hp.eradicate', O.noYes)}</p>
        <p>
          3. 曾接受過胃鏡檢查：<Cb k="hp.endoscopy" v="N" />無 <Cb k="hp.endoscopy" v="Y" />有，民國
          <Fill k="hp.endoYear" w="12mm" />年/<Cb k="hp.endoYearU" v="1" />不詳
        </p>
        <p>4. 近一個月內是否使用潰瘍/胃食道逆流特效藥 (一日一顆)：{cbs('hp.ppi', O.noYes)}</p>
        <p>
          5. 藥物過敏：<Cb k="hp.allergy" v="N" />無 <Cb k="hp.allergy" v="Y" />有，藥物名稱：
          <Fill k="hp.allergyDrug" w="40mm" />
        </p>

        <p className="ph-sec">
          <span className="ps-boxed">家族病史</span>
        </p>
        <p>
          1. 幽門桿菌家族史：<Cb k="hp.famHp" v="U" />不詳 <Cb k="hp.famHp" v="N" />無；<Cb k="hp.famHp" v="Y" />
          有(請續答，可複選){famKey('famHp', 'father')}父 {famKey('famHp', 'mother')}母 {famKey('famHp', 'spouse')}夫妻{' '}
          {famKey('famHp', 'sibling')}兄弟姊妹，共<Fill k="hp.famHpSib" w="8mm" />人
        </p>
        <p className="ph-ind2">
          {famKey('famHp', 'child')}子女，共<Fill k="hp.famHpChild" w="8mm" />人 {famKey('famHp', 'other')}其他
          <Fill k="hp.famHpOther" w="12mm" />，共<Fill k="hp.famHpOtherN" w="8mm" />人
        </p>
        <p>
          2. 消化性潰瘍家族史（胃或十二指腸）：<Cb k="hp.famPu" v="U" />不詳 <Cb k="hp.famPu" v="N" />無；
          <Cb k="hp.famPu" v="Y" />有(請續答，可複選)
        </p>
        <p className="ph-ind">
          {famKey('famPu', 'father')}父；{famKey('famPu', 'mother')}母；{famKey('famPu', 'spouse')}夫妻；
          {famKey('famPu', 'sibling')}兄弟姊妹，共<Fill k="hp.famPuSib" w="8mm" />人；{famKey('famPu', 'child')}子女，共
          <Fill k="hp.famPuChild" w="8mm" />人；{famKey('famPu', 'other')}其他<Fill k="hp.famPuOther" w="12mm" />，共
          <Fill k="hp.famPuOtherN" w="8mm" />人
        </p>
        <p>
          3. 胃癌家族史：<Cb k="hp.famGc" v="U" />不詳 <Cb k="hp.famGc" v="N" />無；<Cb k="hp.famGc" v="Y" />
          有(請續答，可複選)
        </p>
        <p className="ph-ind">
          {famKey('famGc', 'father')}父；{famKey('famGc', 'mother')}母；{famKey('famGc', 'spouse')}夫妻；
          {famKey('famGc', 'sibling')}兄弟姊妹，共<Fill k="hp.famGcSib" w="8mm" />人/<Cb k="hp.famGcSibU" v="1" />
          不詳；{famKey('famGc', 'child')}子女，共<Fill k="hp.famGcChild" w="8mm" />人/<Cb k="hp.famGcChildU" v="1" />
          不詳；{famKey('famGc', 'other')}其他<Fill k="hp.famGcOther" w="12mm" />，共<Fill k="hp.famGcOtherN" w="8mm" />
          人/<Cb k="hp.famGcOtherU" v="1" />不詳
        </p>

        <p className="ph-sec">
          <span className="ps-boxed">用藥史</span>
          <b>：</b>最近三個月有無服用下列藥物：<Cb k="hp.meds" v="N" />無<Cb k="hp.meds" v="Y" />有
          (續答下列各項，如有請打勾，可複選)
        </p>
        <p>
          <Cb k="hp.medList" v="1" />
          1. 止痛藥　<Cb k="hp.medList" v="2" />
          2. 類固醇
        </p>
        <p>
          <Cb k="hp.medList" v="3" />
          3. 抗血小板藥物：<Cb k="hp.antiplatelet" v="1" />
          (1)阿斯匹靈（aspirin）、<Cb k="hp.antiplatelet" v="2" />
          (2)保栓通(plavix)、<Cb k="hp.antiplatelet" v="3" />
          (3)其他<Fill k="hp.antiplateletOther" w="28mm" />
        </p>
        <p>
          <Cb k="hp.medList" v="4" />
          4. 抗凝血劑：<Cb k="hp.anticoag" v="1" />
          (1)可邁丁(coumadin)、<Cb k="hp.anticoag" v="2" />
          (2)其他<Fill k="hp.anticoagOther" w="28mm" />
        </p>
        <p>
          <Cb k="hp.medList" v="5" />
          5. 糖尿病用藥：<Cb k="hp.dm" v="1" />
          (1)口服型控制血糖、<Cb k="hp.dm" v="2" />
          (2)注射型胰島素
        </p>
        <p>
          <Cb k="hp.medList" v="6" />
          6. 使用鐵劑治療貧血
        </p>

        <p className="ph-sec">
          <span className="ps-boxed">生活型態</span>
        </p>
        <p>
          1.您有無吸菸習慣？{numbered('hp.smoke', O.smoke)}
          <Fill k="hp.smokeOther" w="30mm" />
        </p>
        <p>
          2.您有無喝酒習慣？{numbered('hp.drink', O.drink)}
          <Fill k="hp.drinkOther" w="30mm" />
        </p>
        <p>
          3.您有無嚼檳榔習慣？{numbered('hp.betel', O.betel)}
          <Fill k="hp.betelOther" w="30mm" />
        </p>
        <p>4. 您是否常常(每週三次或以上)食用醃漬食物如鹹魚、醬瓜、豆瓣醬、酸菜等習慣?</p>
        <p>{numbered('hp.pickled', O.zeroOne)}</p>
        <p>5. 您是否常常(每週三次或以上)食用煙燻、燒烤、高香料的肉類如香腸、烤肉等習慣?</p>
        <p>{numbered('hp.smoked', O.zeroOne)}</p>
        <p>6. 您是否常常(每週三次或以上)食用生食如生肉、生魚等習慣?</p>
        <p>{numbered('hp.raw', O.zeroOne)}</p>
        <p>*本人同意接受以糞便抗原檢測胃幽門螺旋桿菌檢查，相關資料將作為衛生單位政策評估或個案追蹤健康管理使用</p>
        <p className="ph-ind">
          確認以上資料正確無誤：
          <Sign k="hp.sigConsent" style={{ width: '48mm' }} />
        </p>
        <p className="ph-ind">※本表由採檢單位上傳至癌症篩檢與追蹤管理資訊整合系統。</p>
      </article>
    </div>
  );
}
