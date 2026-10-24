// 6 種預防保健表單；代號沿用原電子表單的檔名，也用在民眾端網址 /f/{代號}

export const FORM_IDS = ['hpv', 'pap', 'oral', 'hp', 'fit', 'adult'] as const;
export type FormId = (typeof FORM_IDS)[number];

export type FormInfo = {
  id: FormId;
  /** 畫面上的名稱 */
  name: string;
  /** 簡稱：列表、篩選勾選框使用 */
  shortName: string;
  /** 健康署原表單名稱 */
  officialTitle: string;
  /** 主色：取自插圖，選夠深的色號，QR 資料點與重點文字使用 */
  color: string;
  /** 淡色：取自插圖，QR 中央插圖外圈與背景點綴使用 */
  tint: string;
  /** 民眾填寫約需幾分鐘、共幾個步驟（表單開頭的提示） */
  minutes: number;
  steps: number;
};

export const FORMS: Record<FormId, FormInfo> = {
  hpv: {
    id: 'hpv',
    name: '人類乳突病毒（HPV）檢測',
    shortName: 'HPV 檢測',
    officialTitle: '健康署婦女人類乳突病毒檢測服務檢查紀錄結果表單',
    color: '#a23d5c',
    tint: '#f6a3b7',
    minutes: 3,
    steps: 4,
  },
  pap: {
    id: 'pap',
    name: '子宮頸抹片檢查',
    shortName: '子宮頸抹片',
    officialTitle: '健康署婦女子宮頸抹片檢查服務檢查紀錄結果表單',
    color: '#35507a',
    tint: '#b8cff0',
    minutes: 3,
    steps: 4,
  },
  oral: {
    id: 'oral',
    name: '口腔黏膜檢查',
    shortName: '口腔黏膜',
    officialTitle: '衛生福利部口腔黏膜檢查服務檢查紀錄結果表單',
    color: '#a8384e',
    tint: '#f59fb3',
    minutes: 3,
    steps: 4,
  },
  hp: {
    id: 'hp',
    name: '胃幽門螺旋桿菌檢測',
    shortName: '胃幽門螺旋桿菌',
    officialTitle: '健康署「糞便抗原檢測胃幽門螺旋桿菌服務」管理紀錄表',
    color: '#9c4632',
    tint: '#f9a98e',
    minutes: 5,
    steps: 7,
  },
  fit: {
    id: 'fit',
    name: '糞便潛血檢查（大腸癌篩檢）',
    shortName: '糞便潛血',
    officialTitle: '健康署定量免疫法糞便潛血檢查服務檢查紀錄結果表單',
    color: '#2e7a53',
    tint: '#a9e6c4',
    minutes: 3,
    steps: 4,
  },
  adult: {
    id: 'adult',
    name: '成人預防保健',
    shortName: '成人預防保健',
    officialTitle: '健康署成人預防保健服務檢查紀錄結果表單',
    color: '#b83a46',
    tint: '#f7bccb',
    minutes: 4,
    steps: 4,
  },
};

export function isFormId(value: string): value is FormId {
  return (FORM_IDS as readonly string[]).includes(value);
}
