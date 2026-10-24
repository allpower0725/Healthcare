// 6 種預防保健表單；代號沿用原電子表單的檔名，也用在民眾端網址 /f/{代號}

export const FORM_IDS = ['hpv', 'pap', 'oral', 'hp', 'fit', 'adult'] as const;
export type FormId = (typeof FORM_IDS)[number];

export type FormInfo = {
  id: FormId;
  /** 畫面上的名稱 */
  name: string;
  /** 健康署原表單名稱 */
  officialTitle: string;
  /** 主色：取自插圖，選夠深的色號，QR 資料點與重點文字使用 */
  color: string;
  /** 淡色：取自插圖，QR 中央插圖外圈與背景點綴使用 */
  tint: string;
};

export const FORMS: Record<FormId, FormInfo> = {
  hpv: {
    id: 'hpv',
    name: '人類乳突病毒（HPV）檢測',
    officialTitle: '健康署婦女人類乳突病毒檢測服務檢查紀錄結果表單',
    color: '#a23d5c',
    tint: '#f6a3b7',
  },
  pap: {
    id: 'pap',
    name: '子宮頸抹片檢查',
    officialTitle: '健康署婦女子宮頸抹片檢查服務檢查紀錄結果表單',
    color: '#35507a',
    tint: '#b8cff0',
  },
  oral: {
    id: 'oral',
    name: '口腔黏膜檢查',
    officialTitle: '衛生福利部口腔黏膜檢查服務檢查紀錄結果表單',
    color: '#a8384e',
    tint: '#f59fb3',
  },
  hp: {
    id: 'hp',
    name: '胃幽門螺旋桿菌檢測',
    officialTitle: '健康署「糞便抗原檢測胃幽門螺旋桿菌服務」管理紀錄表',
    color: '#9c4632',
    tint: '#f9a98e',
  },
  fit: {
    id: 'fit',
    name: '糞便潛血檢查（大腸癌篩檢）',
    officialTitle: '健康署定量免疫法糞便潛血檢查服務檢查紀錄結果表單',
    color: '#2e7a53',
    tint: '#a9e6c4',
  },
  adult: {
    id: 'adult',
    name: '成人預防保健',
    officialTitle: '健康署成人預防保健服務檢查紀錄結果表單',
    color: '#b83a46',
    tint: '#f7bccb',
  },
};

export function isFormId(value: string): value is FormId {
  return (FORM_IDS as readonly string[]).includes(value);
}
