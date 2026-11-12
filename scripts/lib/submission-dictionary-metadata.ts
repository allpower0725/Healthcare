// 共用資料字典的中文名稱與選項；key 和選項代碼由產生器核對實際表單定義。
import { ADULT_BEHAVIORS, ADULT_EXAMS, ADULT_LABS, ADULT_LABS2, ADULT_OPTIONS, ADULT_RESULTS, ADULT_RISKS, ADULT_STAFF, resultOptions } from '../../src/lib/forms/defs/adult';
import { FIT_ANNEX_TABLES, FIT_CHECKLIST, FIT_OPTIONS, FIT_RELATIVES } from '../../src/lib/forms/defs/fit';
import { HP_FAMILY, HP_LIFESTYLE, HP_OPTIONS } from '../../src/lib/forms/defs/hp';
import { HPV_QUESTIONS, HPV_STAFF_OPTIONS } from '../../src/lib/forms/defs/hpv';
import { LABOR_DISEASES, LABOR_HAS, LABOR_HABITS, LABOR_REASON, LABOR_SHIFT, LABOR_SYMPTOMS, habitOptions } from '../../src/lib/forms/defs/labor';
import { LABOR_UPLOAD_CONSENT, LABOR_UPLOAD_REPRESENTATIVE, LABOR_UPLOAD_USE, LABOR_UPLOAD_YEARS } from '../../src/lib/forms/defs/labor-upload';
import { ORAL_OPTIONS } from '../../src/lib/forms/defs/oral';
import { PAP_DX, PAP_QUESTIONS, PAP_STAFF_OPTIONS } from '../../src/lib/forms/defs/pap';
import { ABORIGINAL, EDUCATION, SEX, type Option } from '../../src/lib/forms/profile';
import { TW_COUNTIES } from '../../src/lib/forms/tw-districts';
import { IDENTITY_TYPES } from '../../src/lib/forms/identity';

export const fieldLabels: Record<string, string> = {};
export const fieldOptions: Record<string, readonly Option[]> = {};

function labels(prefix: string, values: Record<string, string>) {
  for (const [key, label] of Object.entries(values)) fieldLabels[prefix + key] = label;
}

function options(prefix: string, values: Record<string, readonly Option[]>) {
  for (const [key, choices] of Object.entries(values)) fieldOptions[prefix + key] = choices;
}

function date(prefix: string, label: string, parts = ['Y', 'M', 'D']) {
  for (const suffix of parts) fieldLabels[prefix + suffix] = label + ({ Y: '（民國年）', M: '（月）', D: '（日）' }[suffix] ?? '');
}

labels('profile.', {
  idType: '證件種類',
  idNo: '身分證號／統一證號／護照號碼', name: '姓名', phone: '聯絡電話', email: '電子郵件',
  edu: '教育程度', sex: '性別', aboriginal: '是否為原住民', tribe: '原住民族別', mobile: '手機號碼',
  addrCounty: '現住址－縣市', addrTown: '現住址－鄉鎮市區', addrVillage: '現住址－村里', addrLin: '現住址－鄰',
  addrRoad: '現住址－路街', addrSec: '現住址－段', addrLane: '現住址－巷', addrAlley: '現住址－弄',
  addrNo: '現住址－門牌號', addrFloor: '現住址－樓', regSame: '戶籍地與現住址相同',
  regCounty: '戶籍地－縣市', regTown: '戶籍地－鄉鎮市區',
});
date('profile.birth', '出生日期');
options('profile.', {
  idType: IDENTITY_TYPES,
  edu: EDUCATION, sex: SEX, aboriginal: ABORIGINAL,
  addrCounty: TW_COUNTIES.map((v) => [v, v]), regCounty: TW_COUNTIES.map((v) => [v, v]),
});

for (const q of [...HPV_QUESTIONS, ...PAP_QUESTIONS, ...ADULT_BEHAVIORS, ...HP_LIFESTYLE]) {
  fieldLabels[q.key] = q.title;
  fieldOptions[q.key] = q.options;
}

labels('hpv.', {
  sigConsent: '受檢者同意簽名', nationality: '國籍', van: '抹片車或社區巡迴服務', pay: '支付方式',
  redo: '無法判讀重做', schedule: '時程代碼', collectOrg: '採檢醫療機構代碼',
  sigCollector: '檢體取樣醫事人員簽名', collectorRole: '檢體取樣醫事人員身分別', withPap: '本次是否同時進行抹片檢查',
  purpose: '做 HPV 檢查目的', lab: '檢驗實驗室機構代碼', specimenNo: '檢體編號', reagent: '檢驗試劑',
  reagentOther: '其他檢驗試劑名稱', judge: '檢驗結果是否可判讀', hr: '高風險 HPV 檢驗結果',
  hrTypes: '高風險 HPV 陽性型別', lr: '低風險 HPV 檢驗結果', lrTypes: '低風險 HPV 陽性型別',
  ot: '其他型別 HPV 檢驗結果', sigLab: '檢驗者簽名',
});
for (let i = 1; i <= 6; i++) fieldLabels[`hpv.ot${i}`] = `其他 HPV 陽性型別第 ${i} 項`;
date('hpv.collect', '採檢體日期');
date('hpv.recv', '檢體收到日期');
date('hpv.report', '發報告日期');
const H = HPV_STAFF_OPTIONS;
options('hpv.', {
  nationality: H.nationality, van: H.van, pay: H.pay, redo: H.redo, collectorRole: H.collectorRole,
  withPap: H.withPap, purpose: H.purpose, reagent: H.reagent, judge: H.judge, hr: H.posNeg,
  hrTypes: H.hrTypes, lr: H.posNegUntested, lrTypes: H.lrTypes, ot: H.posNegUntested,
});

labels('pap.', {
  q15Year: 'HPV 疫苗接種年份（民國年）', sigConsent: '受檢者同意簽名', nationality: '國籍',
  van: '抹片車或社區巡迴服務', pay: '支付方式', redo: '難判重做', schedule: '時程代碼', chartNo: '病歷號',
  doubleCervix: '雙子宮頸', collectOrgName: '抹片檢體取樣機構名稱', collectOrgCode: '抹片檢體取樣機構代碼',
  sigCollector: '抹片檢體取樣醫事人員簽名', collectorRole: '抹片檢體取樣人員身分別',
  withHpv: '本次檢查是否合併 HPV 檢測服務', purpose: '做抹片目的', finding: '臨床所見（含骨盆腔檢查結果）',
  cytoNo: '抹片細胞病理編號', readOrgName: '抹片判讀機構名稱', readOrgCode: '抹片判讀機構代碼',
  specimenType: '檢體種類', readMethod: '閱片方式', quality: '抹片品質', qualityReason: '抹片尚可或難以判讀之原因',
  qualityReasonOther: '其他抹片品質原因', infection: '可能的感染', infectionOther: '其他感染說明',
  dx: '細胞病理診斷', dxOther: '其他細胞病理診斷', endometrial: '子宮內膜細胞出現於 40 歲以上婦女',
  advice: '建議', adviceOther: '其他建議', sigCt: '細胞檢驗師（Cytotechnologist）簽名',
  ctCode: '細胞檢驗師（Cytotechnologist）代碼', sigCp: '細胞病理醫師（Cytopathologist）簽名',
  cpCode: '細胞病理醫師（Cytopathologist）代碼',
});
date('pap.q11', '最後一次月經日期');
date('pap.collect', '抹片檢體取樣日期');
date('pap.recv', '抹片收到日期');
date('pap.cp', '確診日期', ['M', 'D']);
const P = PAP_STAFF_OPTIONS;
options('pap.', {
  nationality: P.nationality, van: P.van, pay: P.pay, redo: P.yesNo, doubleCervix: P.yesNo,
  collectorRole: P.collectorRole, withHpv: P.withHpv, purpose: P.purpose, specimenType: P.specimenType,
  readMethod: P.readMethod, quality: P.quality, qualityReason: P.qualityReason, infection: P.infection,
  dx: PAP_DX.flatMap((row): Option[] => 'value' in row ? [[row.value, row.label]] : []),
  endometrial: P.yesNo, advice: P.advice,
});

labels('oral.', {
  betel: '嚼檳榔習慣', smoke: '吸菸習慣', symptom: '口腔症狀', sigConsent: '受檢者同意簽名',
  pay: '支付方式', site: '篩檢地點', dept: '檢查醫師科別', clinic: '檢查醫療院所名稱及代碼',
  result: '初檢結果／轉介原因', resultOther: '其他轉介原因', mapMarks: '口腔黏膜初檢異常部位標示圖',
  sigDoctor: '檢查醫師簽名', license: '醫師執業執照號碼', referHospital: '轉診確診醫院', referDoctor: '轉診醫師',
  referPhone: '轉診聯絡電話', followed: '檢查後 2 個月內是否接受後續複檢（確診）', noReason: '未接受複檢（確診）理由',
  noReasonOther: '其他未複檢理由', confirmHospital: '複檢（確診）醫院名稱及代碼', biopsy: '是否做病理切片',
  clinDx: '臨床診斷（複檢）口腔病變', clinDxOther: '其他臨床診斷', pathDx: '病理診斷（確診）',
  pathGrade: '上皮變異程度', pathDxOther: '其他病理診斷', treat: '治療情形', treatHospital: '治療醫院名稱及代碼',
  refuseReason: '拒絕治療原因', treatOther: '其他治療說明',
});
date('oral.visit', '門診日期');
date('oral.confirm', '複檢（確診）日期');
const O = ORAL_OPTIONS;
options('oral.', {
  betel: O.betel, smoke: O.smoke, symptom: O.noYes, pay: O.pay, site: O.site, dept: O.dept,
  result: O.result, followed: O.followed, noReason: O.noReason, biopsy: O.noYes,
  clinDx: O.clinDx, pathDx: O.pathDx, pathGrade: O.pathGrade, treat: O.treat,
});

labels('hp.', {
  religion: '宗教', religionOther: '其他宗教', job: '是否有職業', jobName: '職業名稱', marital: '婚姻狀況',
  pmh: '曾罹患疾病', pmhOther: '其他疾病', pmhYear: '疾病發生年份（民國年）', pmhYearU: '疾病發生年份不詳',
  eradicate: '曾接受胃幽門桿菌除菌治療', endoscopy: '曾接受胃鏡檢查', endoYear: '胃鏡檢查年份（民國年）',
  endoYearU: '胃鏡檢查年份不詳', ppi: '近一個月內使用潰瘍／胃食道逆流特效藥', allergy: '藥物過敏',
  allergyDrug: '過敏藥物名稱', meds: '最近三個月是否服用指定藥物', medList: '服用藥物種類',
  antiplatelet: '抗血小板藥物', antiplateletOther: '其他抗血小板藥物', anticoag: '抗凝血劑',
  anticoagOther: '其他抗凝血劑', dm: '糖尿病用藥', sigConsent: '受檢者同意簽名',
  pay: '支付方式', unit: '採檢單位名稱', unitCode: '採檢醫事機構代碼',
});
const G = HP_OPTIONS;
options('hp.', {
  religion: G.religion, job: G.job, marital: G.marital, pmh: G.pmh, eradicate: G.noYes,
  endoscopy: G.noYes, ppi: G.noYes, allergy: G.noYes, meds: G.noYes, medList: G.medList,
  antiplatelet: G.antiplatelet, anticoag: G.anticoag, dm: G.dm, pay: G.pay,
});
for (const f of HP_FAMILY) {
  const prefix = `hp.${f.key}`;
  fieldLabels[prefix] = f.title;
  fieldOptions[prefix] = G.family;
  labels(prefix, {
    Rel: `${f.title}－親屬`, Sib: `${f.title}－兄弟姊妹人數`, Child: `${f.title}－子女人數`,
    Other: `${f.title}－其他家人稱謂`, OtherN: `${f.title}－其他家人人數`,
  });
  fieldOptions[prefix + 'Rel'] = G.relatives;
  if (f.unknownCount) labels(prefix, {
    SibU: `${f.title}－兄弟姊妹人數不詳`, ChildU: `${f.title}－子女人數不詳`, OtherU: `${f.title}－其他家人人數不詳`,
  });
}
for (const q of HP_LIFESTYLE) if (q.other) fieldLabels[q.key + 'Other'] = q.other;
date('hp.visit', '門診日期');
date('hp.visit2', '第二次門診日期');

labels('fit.', {
  smoke: '吸菸史', smokeAge: '開始吸菸年齡（歲）', famCrc: '大腸直腸癌家族史', famCa: '其他癌症家族史',
  symptom: '腸道不適症狀', annexConsent: '是否同意填答家族史及吸菸習慣附表', smokeHabit: '附表－吸菸習慣',
  quitAge: '戒菸年齡（歲）', sigAnnex: '附表－受檢者本人簽名', sigConsent: '受檢者同意簽名',
  pay: '支付方式', site: '篩檢地點', clinic: '檢查醫療院所名稱及代碼', lab: '檢驗機構／醫療院所名稱及代碼',
  result: '糞便潛血檢驗結果', value: '糞便潛血檢驗數值', reagent: '定量試劑商品名稱', reagentOther: '其他定量試劑名稱',
  followed: '檢查後三個月內是否接受後續確診', noReason: '未接受確診理由', noReasonOther: '其他未確診理由',
  confirmHospital: '確診醫療院所名稱及代碼', method: '確診檢查方法', methodOther: '其他檢查方法',
  dx: '確診診斷', dxOther: '其他診斷', polypCut: '息肉切除情形', sigInterviewer: '附表－訪問人員簽名',
});
const F = FIT_OPTIONS;
options('fit.', {
  smoke: F.smoke, famCrc: F.family, famCa: F.family, symptom: F.noYes, annexConsent: F.consent,
  smokeHabit: F.smokeHabit, pay: F.pay, site: F.site, result: F.result, reagent: F.reagent,
  followed: F.followed, noReason: F.noReason, method: F.method, dx: F.dx, polypCut: F.polypCut,
});
for (const table of FIT_ANNEX_TABLES) {
  fieldLabels[table.key + 'Rel'] = `${table.title}－親屬`;
  fieldOptions[table.key + 'Rel'] = FIT_RELATIVES.map((r) => [r.value, r.label]);
  for (const r of FIT_RELATIVES) {
    const k = table.key + r.value;
    const name = `${table.title}－${r.label}`;
    if (table.withType) fieldLabels[k + 'Type'] = name + '癌別';
    if (r.max > 1) fieldLabels[k + 'N'] = name + '罹癌人數';
    for (let i = 1; i <= r.max; i++) fieldLabels[k + 'Age' + i] = `${name}第 ${i} 位罹癌年紀（歲）`;
  }
}
for (const [prefix, label] of Object.entries({ 'fit.visit': '門診日期', 'fit.lab': '檢驗日期', 'fit.confirm': '確診日期', 'fit.iv': '附表訪問日期' })) date(prefix, label);
for (const n of [1, 2]) {
  const k = `fit.edu${n}`;
  const name = `衛教第 ${n} 欄評值`;
  date(k, name + '日期');
  labels(k, { Name: name + '受檢者姓名', Pid: name + '受檢者身分證號' });
  FIT_CHECKLIST.forEach((step, i) => {
    fieldLabels[`${k}S${i + 1}`] = `${name}－${step.step}${step.title}`;
    fieldOptions[`${k}S${i + 1}`] = step.items;
  });
}

labels('adult.', {
  dx: '疾病史', dxOther: '其他疾病名稱', med: '長期服藥', medCause: '長期服藥病因', fam: '家族疾病史',
  famCancer: '家族癌症名稱', famOther: '家族其他疾病名稱', sigS1: '第一階段服務對象同意簽名',
  sigS2: '第二階段服務對象同意簽名', sigHep: 'B、C 型肝炎檢查服務對象同意簽名', height: '身高（公分）',
  weight: '體重（公斤）', pulse: '脈搏（次／分）', waist: '腰圍（公分）', sbp: '收縮壓（mmHg）', dbp: '舒張壓（mmHg）',
  vaR: '右眼裸眼視力', vaL: '左眼裸眼視力', vcR: '右眼矯正視力', vcL: '左眼矯正視力', ent: '耳鼻喉及口腔檢查',
  entAbn: '耳鼻喉及口腔異常項目', lymph: '頸部淋巴腺腫大', thyroid: '甲狀腺腫大', otherAbn: '其他異常',
  uproQual: '尿液蛋白質（定性）', ldlRef: '低密度脂蛋白膽固醇參考值', ua: '尿酸（mg/dl）',
  hbsag: 'B 型肝炎表面抗原（HBsAg）', hcv: 'C 型肝炎抗體（Anti-HCV）', counsel: '健康諮詢',
  res_renalStage: '腎功能期別', resHbv: 'B 型肝炎表面抗原結果與建議', resHcv: 'C 型肝炎抗體結果與建議',
  resCough: '咳嗽症狀與建議', org: '特約醫事服務機構名稱及代號', sigDoctor: '檢查醫師簽名',
  dualOrg: '雙軌作業－第二階段服務機構名稱', dualAddr: '雙軌作業－第二階段服務機構地址',
});
date('adult.s1', '第一階段日期');
date('adult.s2', '第二階段日期');
const A = ADULT_STAFF;
options('adult.', {
  dx: ADULT_OPTIONS.diseases, med: ADULT_OPTIONS.med, fam: ADULT_OPTIONS.family, ent: A.normal,
  entAbn: A.entAbn, lymph: A.yesNo, thyroid: A.yesNo, uproQual: A.uproQual,
  hbsag: A.hepatitis, hcv: A.hepatitis, counsel: A.counsel, resHbv: A.hepResult, resHcv: A.hepResult, resCough: A.resCough,
});
for (const [key, name] of ADULT_EXAMS) {
  labels('adult.ex_' + key, { '': name + '檢查', Note: name + '異常說明' });
  fieldOptions['adult.ex_' + key] = A.normal;
}
for (const [key, name, unit] of [['uproQuant', '尿液蛋白質（定量）', 'mg/dl'], ...ADULT_LABS, ...ADULT_LABS2]) {
  const label = key === 'ast' || key === 'alt' ? '肝功能－' + name : name;
  labels('adult.' + key, { '': `${label}（${unit}）`, Ref: label + '參考值' });
}
for (const [key, name] of ADULT_RESULTS) {
  labels('adult.res_' + key, { '': name + '檢查結果', Adv: name + '建議', Mon: name + '追蹤間隔（月）' });
  options('adult.res_' + key, { '': resultOptions(key), Adv: A.advice });
}
for (const [key, name] of ADULT_RISKS) labels('adult.risk_' + key, { '': name + '風險值（%）', NA: name + '風險值不適用' });

labels('labor.', {
  company: '事業單位名稱', reason: '檢查時期（原因）', shift: '是否需輪班', shiftType: '輪班班制',
  shiftOther: '其他班制說明', hours1m: '檢查日前 1 個月平均每週工時（小時）',
  hours6m: '檢查日前 6 個月平均每週工時（小時）', sleep: '工作日期間平均每天睡眠時間（小時）',
  diseases: '曾患疾病', symptoms: '最近三個月自覺症狀', cancerDetail: '癌症說明', fractureDetail: '骨折說明',
  surgeryDetail: '手術開刀說明', otherDetail: '其他慢性病說明', symptomOther: '其他症狀說明',
  drinkType: '最常喝的酒類', drinkBottles: '每次喝幾瓶',
  uploadConsent: '是否同意個人自費資料蒐集處理及利用', uploadYearsMode: '自起算日起涵蓋資料的期間',
  uploadYears: '自訂涵蓋資料年數', uploadUseMode: '自簽署日起提供健保署的利用期間', uploadUseYears: '自訂利用年數',
  uploadCloud: '另同意提供至健保醫療資訊雲端查詢系統', uploadSignature: '資料上傳同意書本人簽名',
  uploadHasRepresentative: '是否有法定代理人', uploadRepresentativeName: '法定代理人姓名',
  uploadRepresentativeIdNo: '法定代理人身分證號／證件號', uploadRepresentativeSignature: '資料上傳同意書法定代理人簽名',
});
date('labor.hired', '受僱日期');
date('labor.exam', '檢查日期');
date('labor.uploadFrom', '資料上傳同意書的資料起算日期');
date('labor.uploadSigned', '資料上傳同意書簽署日期');
options('labor.', {
  reason: LABOR_REASON, shift: [['Y', '是'], ['N', '否']], shiftType: LABOR_SHIFT,
  diseases: LABOR_DISEASES, symptoms: LABOR_SYMPTOMS,
  uploadConsent: LABOR_UPLOAD_CONSENT, uploadYearsMode: LABOR_UPLOAD_YEARS, uploadUseMode: LABOR_UPLOAD_USE,
  uploadHasRepresentative: LABOR_UPLOAD_REPRESENTATIVE,
});
for (const [key, name] of [['current', '目前工作'], ['previous', '最近一項過去工作']]) {
  const k = 'labor.' + key;
  labels(k, { Has: '是否有' + name, Title: name + '內容', Years: name + '合計年資（年）', Months: name + '合計年資剩餘月數' });
  date(k + 'Start', name + '起始年月', ['Y', 'M']);
  date(k + 'End', name + '截止年月', ['Y', 'M']);
  fieldOptions[k + 'Has'] = LABOR_HAS;
}
for (const habit of LABOR_HABITS) {
  const k = 'labor.' + habit.key;
  labels(k, { '': habit.question, Amount: `${habit.amount}（${habit.unit}）`, QuitY: `已戒${habit.title}期間（年）`, QuitM: `已戒${habit.title}期間剩餘月數` });
  if (habit.key !== 'drink') fieldLabels[k + 'Years'] = habit.years;
  fieldOptions[k] = habitOptions(habit);
}

/** heal_submissions 的實體欄位名稱。 */
export const columnLabels: Record<string, string> = {
  id: '案件編號',
  form_id: '表單種類',
  status: '案件狀態',
  id_no: '身分證號／統一證號／護照號碼',
  name: '姓名',
  birth_date: '出生日期',
  public_data: '民眾填寫內容',
  staff_data: '院所填寫內容',
  device_token_hash: '民眾裝置憑證雜湊',
  device_expires_at: '民眾裝置存取到期時間',
  public_submitted_at: '民眾最後送出時間',
  staff_updated_by: '最後編輯院所人員',
  staff_updated_at: '院所最後儲存時間',
  completed_by: '確認完成人員',
  completed_at: '確認完成時間',
  version: '資料版本號',
  created_at: '建立時間',
  updated_at: '最後異動時間',
};
