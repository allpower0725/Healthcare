# heal_submissions 共用資料對照表

依表單種類查閱 `public_data`、`staff_data`。選項用「代碼 → 名稱」表示，多個選項以「；」分隔；值本身就是名稱的選項省略對照。

## 實體欄位

| 欄位 | 中文名稱 |
|---|---|
| `id` | 案件編號 |
| `form_id` | 表單種類 |
| `status` | 案件狀態 |
| `id_no` | 身分證號／統一證號／護照號碼 |
| `name` | 姓名 |
| `birth_date` | 出生日期 |
| `public_data` | 民眾填寫內容 |
| `staff_data` | 院所填寫內容 |
| `device_token_hash` | 民眾裝置憑證雜湊 |
| `device_expires_at` | 民眾裝置存取到期時間 |
| `public_submitted_at` | 民眾最後送出時間 |
| `staff_updated_by` | 最後編輯院所人員 |
| `staff_updated_at` | 院所最後儲存時間 |
| `completed_by` | 確認完成人員 |
| `completed_at` | 確認完成時間 |
| `version` | 資料版本號 |
| `created_at` | 建立時間 |
| `updated_at` | 最後異動時間 |

## form_id

| 代碼 | 中文名稱 |
|---|---|
| `hpv` | 人類乳突病毒（HPV）檢測 |
| `pap` | 子宮頸抹片檢查 |
| `oral` | 口腔黏膜檢查 |
| `hp` | 胃幽門螺旋桿菌檢測 |
| `fit` | 糞便潛血檢查（大腸癌篩檢） |
| `adult` | 成人預防保健 |
| `labor` | 勞工健康檢查 |

## status

| 代碼 | 中文名稱 |
|---|---|
| `submitted` | 待院所確認 |
| `returned` | 民眾修改中 |
| `completed` | 已完成 |
| `voided` | 已作廢 |

## 表單內容

### hpv－人類乳突病毒（HPV）檢測

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.regSame` | 戶籍地與現住址相同 | `1` → 勾選 |
| `profile.regCounty` | 戶籍地－縣市 |  |
| `profile.regTown` | 戶籍地－鄉鎮市區 |  |
| `hpv.q9` | 最近一年使用口服避孕藥達 6 個月以上 | `1` → 無；`2` → 有；`3` → 不知道/拒答 |
| `hpv.q10` | 最近一年因更年期症狀使用荷爾蒙補充療法達 6 個月以上 | `1` → 無；`2` → 有；`3` → 不知道/拒答 |
| `hpv.q11` | 請問您是否使用免疫抑制劑藥物（如類固醇、抗移植排斥藥物等） | `1` → 無；`2` → 有；`3` → 不知道/拒答 |
| `hpv.q12` | 最近一年性行為時曾經使用保險套 | `1` → 無；`2` → 有；`3` → 最近一年無性行為；`4` → 不知道/拒答 |
| `hpv.q13` | 最近一年平均每個月陰道灌洗頻率 | `1` → 從未灌洗；`2` → 不到 1 次；`3` → 1 次；`4` → 2–4 次；`5` → 至少 5 次；`6` → 不知道/拒答 |
| `hpv.q14` | 最近一年吸菸習慣（持續吸菸 6 個月以上） | `1` → 無；`2` → 已戒菸 6 個月以上；`3` → 有吸菸 |
| `hpv.q15` | 請問您接種的 HPV 疫苗是 | `1` → 未接種；`2` → 保蓓（2 價）；`3` → 嘉喜（4 價）；`4` → 嘉喜（9 價）；`5` → 不記得 |
| `hpv.q16` | 最近一次 HPV 檢測時間 | `1` → 1 年內；`2` → 1–2 年內；`3` → 2–3 年內；`4` → 3 年以上；`5` → 從未檢查過 |
| `hpv.q17` | 最近一次 HPV 檢測結果 | `1` → 未感染；`2` → 有感染；`3` → 不知道；`4` → 從未檢查過 |
| `hpv.sigConsent` | 受檢者同意簽名 |  |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `hpv.nationality` | 國籍 | `1` → 本國；`2` → 外籍人士 |
| `hpv.van` | 抹片車或社區巡迴服務 | `1` → 否；`2` → 抹片車；`3` → 社區巡迴服務 |
| `hpv.pay` | 支付方式 | `1` → 預防保健；`2` → 健保醫療給付；`3` → 其他公務預算補助；`4` → 其他；`6` → 自費健康檢查 |
| `hpv.redo` | 無法判讀重做 | `1` → 是；`2` → 否 |
| `hpv.schedule` | 時程代碼 |  |
| `hpv.collectOrg` | 採檢醫療機構代碼 |  |
| `hpv.collectY` | 採檢體日期（民國年） |  |
| `hpv.collectM` | 採檢體日期（月） |  |
| `hpv.collectD` | 採檢體日期（日） |  |
| `hpv.sigCollector` | 檢體取樣醫事人員簽名 |  |
| `hpv.collectorRole` | 檢體取樣醫事人員身分別 | `1` → 婦產科醫師；`2` → 家醫科醫師；`3` → 助產人員；`4` → 衛生所護理人員；`5` → 衛生所醫師（非屬①②） |
| `hpv.withPap` | 本次是否同時進行抹片檢查 | `1` → 否；`2` → 是 |
| `hpv.purpose` | 做 HPV 檢查目的 | `1` → 篩檢；`2` → 追蹤；`3` → 其他 |
| `hpv.lab` | 檢驗實驗室機構代碼 |  |
| `hpv.specimenNo` | 檢體編號 |  |
| `hpv.recvY` | 檢體收到日期（民國年） |  |
| `hpv.recvM` | 檢體收到日期（月） |  |
| `hpv.recvD` | 檢體收到日期（日） |  |
| `hpv.reportY` | 發報告日期（民國年） |  |
| `hpv.reportM` | 發報告日期（月） |  |
| `hpv.reportD` | 發報告日期（日） |  |
| `hpv.reagent` | 檢驗試劑 | `1` → Abbott RealTime HPV test；`2` → BD Onclarity HPV Assay；`3` → Roche Cobas HPV test；`4` → CapitalBio HPV Genotyping Kit；`5` → DR. HPV Genotyping IVD kit；`6` → EASY CHIP HPV Blot；`8` → Xpert HPV；`9` → Alinity m HR HPV；`12` → Aptima HPV 16 18/45 Genotype Assay；`99` → Other |
| `hpv.reagentOther` | 其他檢驗試劑名稱 |  |
| `hpv.judge` | 檢驗結果是否可判讀 | `1` → 可判讀；`2` → 無法判讀 |
| `hpv.hr` | 高風險 HPV 檢驗結果 | `0` → 陰性；`1` → 陽性 |
| `hpv.hrTypes` | 高風險 HPV 陽性型別 | `n1618` → 非 16、18 之不分型；`n161845` → 非 16、18/45 之不分型 |
| `hpv.lr` | 低風險 HPV 檢驗結果 | `0` → 陰性；`1` → 陽性；`2` → 未檢測 |
| `hpv.lrTypes` | 低風險 HPV 陽性型別 | `nt` → 不分型 |
| `hpv.ot` | 其他型別 HPV 檢驗結果 | `0` → 陰性；`1` → 陽性；`2` → 未檢測 |
| `hpv.ot1` | 其他 HPV 陽性型別第 1 項 |  |
| `hpv.ot2` | 其他 HPV 陽性型別第 2 項 |  |
| `hpv.ot3` | 其他 HPV 陽性型別第 3 項 |  |
| `hpv.ot4` | 其他 HPV 陽性型別第 4 項 |  |
| `hpv.ot5` | 其他 HPV 陽性型別第 5 項 |  |
| `hpv.ot6` | 其他 HPV 陽性型別第 6 項 |  |
| `hpv.sigLab` | 檢驗者簽名 |  |

### pap－子宮頸抹片檢查

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.regSame` | 戶籍地與現住址相同 | `1` → 勾選 |
| `profile.regCounty` | 戶籍地－縣市 |  |
| `profile.regTown` | 戶籍地－鄉鎮市區 |  |
| `pap.q9` | 最近一次抹片檢查時間？ | `1` → 1 年內；`2` → 1 至 2 年內；`3` → 2 至 3 年內；`4` → 3 年以上；`5` → 從未檢查過 |
| `pap.q10` | 已停經？（一年無月經） | `1` → 是；`2` → 否；`3` → 不知道 |
| `pap.q12` | 現在是否懷孕？ | `1` → 是；`2` → 否；`3` → 不知道 |
| `pap.q13` | 子宮是否切除？ | `1` → 是；`2` → 否；`3` → 不知道 |
| `pap.q14` | 子宮是否接受過放射線治療？ | `1` → 是；`2` → 否；`3` → 不知道 |
| `pap.q15` | 是否曾接種人類乳突病毒（HPV）疫苗？ | `1` → 是；`2` → 否；`3` → 不知道 |
| `pap.q11Y` | 最後一次月經日期（民國年） |  |
| `pap.q11M` | 最後一次月經日期（月） |  |
| `pap.q11D` | 最後一次月經日期（日） |  |
| `pap.q15Year` | HPV 疫苗接種年份（民國年） |  |
| `pap.sigConsent` | 受檢者同意簽名 |  |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `pap.nationality` | 國籍 | `1` → 本國；`2` → 外籍人士 |
| `pap.van` | 抹片車或社區巡迴服務 | `1` → 否；`2` → 抹片車；`3` → 社區巡迴服務篩檢 |
| `pap.pay` | 支付方式 | `1` → 預防保健；`2` → 健保醫療給付；`3` → 其他公務預算補助；`4` → 其他；`6` → 自費健康檢查 |
| `pap.redo` | 難判重做 | `1` → 是；`2` → 否 |
| `pap.schedule` | 時程代碼 |  |
| `pap.chartNo` | 病歷號 |  |
| `pap.doubleCervix` | 雙子宮頸 | `1` → 是；`2` → 否 |
| `pap.collectY` | 抹片檢體取樣日期（民國年） |  |
| `pap.collectM` | 抹片檢體取樣日期（月） |  |
| `pap.collectD` | 抹片檢體取樣日期（日） |  |
| `pap.collectOrgName` | 抹片檢體取樣機構名稱 |  |
| `pap.collectOrgCode` | 抹片檢體取樣機構代碼 |  |
| `pap.sigCollector` | 抹片檢體取樣醫事人員簽名 |  |
| `pap.collectorRole` | 抹片檢體取樣人員身分別 | `1` → 婦產科醫師；`2` → 家醫科醫師；`3` → 助產人員；`4` → 衛生所護理人員；`5` → 衛生所醫師（非屬①②） |
| `pap.withHpv` | 本次檢查是否合併 HPV 檢測服務 | `1` → 否；`2` → 是 |
| `pap.purpose` | 做抹片目的 | `1` → 篩檢；`2` → 懷疑癌症；`3` → 追蹤；`4` → 前次抹片難以判讀；`5` → 其他 |
| `pap.finding` | 臨床所見（含骨盆腔檢查結果） |  |
| `pap.cytoNo` | 抹片細胞病理編號 |  |
| `pap.readOrgName` | 抹片判讀機構名稱 |  |
| `pap.readOrgCode` | 抹片判讀機構代碼 |  |
| `pap.recvY` | 抹片收到日期（民國年） |  |
| `pap.recvM` | 抹片收到日期（月） |  |
| `pap.recvD` | 抹片收到日期（日） |  |
| `pap.specimenType` | 檢體種類 | `1` → 常規抹片；`2` → 液體標本 |
| `pap.readMethod` | 閱片方式 | `1` → 人工；`2` → 機械；`3` → 人工＋機械 |
| `pap.quality` | 抹片品質 | `1` → 良好；`2` → 尚可；`3` → 抹片難以判讀 |
| `pap.qualityReason` | 抹片尚可或難以判讀之原因 | `1` → 抹片固定或保存不良；`2` → 細胞太少；`3` → 太厚或太多血液；`4` → 沒有子宮內頸成份；`5` → 炎症細胞過多；`6` → 存在外來物（如潤滑劑）；`7` → 過多細胞溶解或自溶；`8` → 其他 |
| `pap.qualityReasonOther` | 其他抹片品質原因 |  |
| `pap.infection` | 可能的感染 | `1` → Candida；`2` → Trichomonas；`3` → Herpes；`6` → Others；`7` → Shift in flora（bacterial vaginosis）；`8` → Actinomyces |
| `pap.infectionOther` | 其他感染說明 |  |
| `pap.dx` | 細胞病理診斷 | `1` → Within normal limit；`2` → Reactive changes：Inflammation, repair, radiation, and others；`3` → Atrophy with inflammation；`4` → Atypical squamous cells（ASC-US）；`5` → Atypical glandular cells；`6` → Mild dysplasia（CIN1）with koilocytes；`7` → Mild dysplasia（CIN1）without koilocytes；`8` → Moderate dysplasia（CIN2）；`9` → Severe dysplasia（CIN3）；`10` → Carcinoma in situ（CIN3）；`11` → SQUAMOUS CELL CARCINOMA；`12` → ADENOCARCINOMA；`13` → OTHER MALIGNANT NEOPLASM；`14` → OTHER；`15` → Atypical glandular cells favor neoplasm；`16` → Atypical squamous cells cannot exclude HSIL；`17` → Dysplasia cannot exclude HSIL；`18` → ENDOCERVICAL ADENOCARCINOMA IN SITU |
| `pap.dxOther` | 其他細胞病理診斷 |  |
| `pap.endometrial` | 子宮內膜細胞出現於 40 歲以上婦女 | `1` → 是；`2` → 否 |
| `pap.advice` | 建議 | `1` → 因抹片難以判讀，請重做抹片檢查；`2` → 治療發炎，並於三個月後重做抹片檢查；`3` → 抹片結果異常，請再做進一步檢查；`4` → 其他建議 |
| `pap.adviceOther` | 其他建議 |  |
| `pap.sigCt` | 細胞檢驗師（Cytotechnologist）簽名 |  |
| `pap.ctCode` | 細胞檢驗師（Cytotechnologist）代碼 |  |
| `pap.sigCp` | 細胞病理醫師（Cytopathologist）簽名 |  |
| `pap.cpCode` | 細胞病理醫師（Cytopathologist）代碼 |  |
| `pap.cpM` | 確診日期（月） |  |
| `pap.cpD` | 確診日期（日） |  |

### oral－口腔黏膜檢查

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.sex` | 性別 | `M` → 男；`F` → 女 |
| `profile.aboriginal` | 是否為原住民 | `Y` → 是；`N` → 否 |
| `profile.mobile` | 手機號碼 |  |
| `oral.betel` | 嚼檳榔習慣 | `0` → 無；`1` → 已戒；`2` → 嚼 10 年以下，每天少於 20 顆；`3` → 嚼 10 年以下，每天 20 顆及以上；`4` → 嚼超過 10 年，每天少於 20 顆；`5` → 嚼超過 10 年，每天 20 顆及以上 |
| `oral.smoke` | 吸菸習慣 | `0` → 無；`1` → 已戒；`2` → 吸 10 年以下，每天少於 20 支；`3` → 吸 10 年以下，每天 20 支及以上；`4` → 吸超過 10 年，每天少於 20 支；`5` → 吸超過 10 年，每天 20 支及以上 |
| `oral.symptom` | 口腔症狀 | `0` → 無；`1` → 有 |
| `oral.sigConsent` | 受檢者同意簽名 |  |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `oral.pay` | 支付方式 | `1` → 預防保健；`3` → 健保醫療給付；`4` → 其他公務預算補助；`5` → 自費健康檢查；`9` → 其他 |
| `oral.site` | 篩檢地點 | `1` → 社區或職場設站篩檢；`2` → 醫療院所 |
| `oral.dept` | 檢查醫師科別 | `1` → 牙科；`2` → 耳鼻喉科；`3` → 經衛生福利部核可之其他科別專科醫師／專案許可之西醫師 |
| `oral.clinic` | 檢查醫療院所名稱及代碼 |  |
| `oral.visitY` | 門診日期（民國年） |  |
| `oral.visitM` | 門診日期（月） |  |
| `oral.visitD` | 門診日期（日） |  |
| `oral.result` | 初檢結果／轉介原因 | `0` → 未發現以下需轉介之異常；`1` → 疑似口腔癌；`2` → 口腔內外不明原因之持續性腫塊；`3` → 紅斑；`4` → 紅白斑；`5` → 疣狀增生；`8` → 約兩星期仍不癒之口腔潰瘍／糜爛；`9` → 扁平苔癬；`10` → 口腔黏膜不正常，但診斷未明；`71` → 非均質性白斑；`72` → 均質性厚白斑；`73` → 均質性薄白斑；`76` → 口腔黏膜下纖維化症（張口不易或舌頭活動困難）；`99` → 其他 |
| `oral.resultOther` | 其他轉介原因 |  |
| `oral.mapMarks` | 口腔黏膜初檢異常部位標示圖 |  |
| `oral.sigDoctor` | 檢查醫師簽名 |  |
| `oral.license` | 醫師執業執照號碼 |  |
| `oral.referHospital` | 轉診確診醫院 |  |
| `oral.referDoctor` | 轉診醫師 |  |
| `oral.referPhone` | 轉診聯絡電話 |  |
| `oral.followed` | 檢查後 2 個月內是否接受後續複檢（確診） | `0` → 沒有；`1` → 有 |
| `oral.noReason` | 未接受複檢（確診）理由 | `1` → 無法聯繫；`2` → 出國；`3` → 搬家；`4` → 死亡；`5` → 拒做；`6` → 其他 |
| `oral.noReasonOther` | 其他未複檢理由 |  |
| `oral.confirmHospital` | 複檢（確診）醫院名稱及代碼 |  |
| `oral.confirmY` | 複檢（確診）日期（民國年） |  |
| `oral.confirmM` | 複檢（確診）日期（月） |  |
| `oral.confirmD` | 複檢（確診）日期（日） |  |
| `oral.biopsy` | 是否做病理切片 | `0` → 無；`1` → 有 |
| `oral.clinDx` | 臨床診斷（複檢）口腔病變 | `10` → 均質性薄白斑；`12` → 紅斑；`13` → 紅白斑；`14` → 疣狀增生；`15` → 口腔黏膜下纖維化症；`16` → 扁平苔癬或類扁平苔癬反應；`20` → 疑似口腔癌；`99` → 其他；`00` → 無明顯異常；`08` → 非均質性白斑；`09` → 均質性厚白斑 |
| `oral.clinDxOther` | 其他臨床診斷 |  |
| `oral.pathDx` | 病理診斷（確診） | `21` → 口腔癌；`22` → 上皮變異；`99` → 其他 |
| `oral.pathGrade` | 上皮變異程度 | `23` → 輕度；`24` → 中度；`25` → 重度 |
| `oral.pathDxOther` | 其他病理診斷 |  |
| `oral.treat` | 治療情形 | `0` → 無，個案僅需定期追蹤，目前無需治療，已給予衛教介入；`1` → 有做手術、放療、化療或其他治療；`2` → 個案拒絕治療；`99` → 其他 |
| `oral.treatHospital` | 治療醫院名稱及代碼 |  |
| `oral.refuseReason` | 拒絕治療原因 |  |
| `oral.treatOther` | 其他治療說明 |  |

### hp－胃幽門螺旋桿菌檢測

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.sex` | 性別 | `M` → 男；`F` → 女 |
| `profile.aboriginal` | 是否為原住民 | `Y` → 是；`N` → 否 |
| `profile.tribe` | 原住民族別 |  |
| `profile.mobile` | 手機號碼 |  |
| `hp.religion` | 宗教 | `0` → 無；`1` → 天主教；`2` → 基督教；`3` → 佛教；`4` → 道教；`5` → 一貫道；`9` → 其他 |
| `hp.religionOther` | 其他宗教 |  |
| `hp.job` | 是否有職業 | `Y` → 有；`N` → 無；`R` → 拒答 |
| `hp.jobName` | 職業名稱 |  |
| `hp.marital` | 婚姻狀況 | `1` → 未婚；`2` → 已婚；`9` → 其他 |
| `hp.pmh` | 曾罹患疾病 | `none` → 無；`gastritis` → 胃炎；`gu` → 胃潰瘍；`du` → 十二指腸潰瘍；`gerd` → 胃食道逆流；`tumor` → 胃腫瘤；`gc` → 胃癌；`hp` → 胃幽門桿菌感染；`other` → 其他 |
| `hp.pmhOther` | 其他疾病 |  |
| `hp.pmhYear` | 疾病發生年份（民國年） |  |
| `hp.pmhYearU` | 疾病發生年份不詳 | `1` → 勾選 |
| `hp.eradicate` | 曾接受胃幽門桿菌除菌治療 | `N` → 無；`Y` → 有 |
| `hp.endoscopy` | 曾接受胃鏡檢查 | `N` → 無；`Y` → 有 |
| `hp.endoYear` | 胃鏡檢查年份（民國年） |  |
| `hp.endoYearU` | 胃鏡檢查年份不詳 | `1` → 勾選 |
| `hp.ppi` | 近一個月內使用潰瘍／胃食道逆流特效藥 | `N` → 無；`Y` → 有 |
| `hp.allergy` | 藥物過敏 | `N` → 無；`Y` → 有 |
| `hp.allergyDrug` | 過敏藥物名稱 |  |
| `hp.famHp` | 幽門桿菌家族史 | `U` → 不詳；`N` → 無；`Y` → 有 |
| `hp.famHpRel` | 幽門桿菌家族史－親屬 | `father` → 父；`mother` → 母；`spouse` → 夫妻；`sibling` → 兄弟姊妹；`child` → 子女；`other` → 其他 |
| `hp.famHpSib` | 幽門桿菌家族史－兄弟姊妹人數 |  |
| `hp.famHpChild` | 幽門桿菌家族史－子女人數 |  |
| `hp.famHpOther` | 幽門桿菌家族史－其他家人稱謂 |  |
| `hp.famHpOtherN` | 幽門桿菌家族史－其他家人人數 |  |
| `hp.famPu` | 消化性潰瘍家族史（胃或十二指腸） | `U` → 不詳；`N` → 無；`Y` → 有 |
| `hp.famPuRel` | 消化性潰瘍家族史（胃或十二指腸）－親屬 | `father` → 父；`mother` → 母；`spouse` → 夫妻；`sibling` → 兄弟姊妹；`child` → 子女；`other` → 其他 |
| `hp.famPuSib` | 消化性潰瘍家族史（胃或十二指腸）－兄弟姊妹人數 |  |
| `hp.famPuChild` | 消化性潰瘍家族史（胃或十二指腸）－子女人數 |  |
| `hp.famPuOther` | 消化性潰瘍家族史（胃或十二指腸）－其他家人稱謂 |  |
| `hp.famPuOtherN` | 消化性潰瘍家族史（胃或十二指腸）－其他家人人數 |  |
| `hp.famGc` | 胃癌家族史 | `U` → 不詳；`N` → 無；`Y` → 有 |
| `hp.famGcRel` | 胃癌家族史－親屬 | `father` → 父；`mother` → 母；`spouse` → 夫妻；`sibling` → 兄弟姊妹；`child` → 子女；`other` → 其他 |
| `hp.famGcSib` | 胃癌家族史－兄弟姊妹人數 |  |
| `hp.famGcChild` | 胃癌家族史－子女人數 |  |
| `hp.famGcOther` | 胃癌家族史－其他家人稱謂 |  |
| `hp.famGcOtherN` | 胃癌家族史－其他家人人數 |  |
| `hp.famGcSibU` | 胃癌家族史－兄弟姊妹人數不詳 | `1` → 勾選 |
| `hp.famGcChildU` | 胃癌家族史－子女人數不詳 | `1` → 勾選 |
| `hp.famGcOtherU` | 胃癌家族史－其他家人人數不詳 | `1` → 勾選 |
| `hp.meds` | 最近三個月是否服用指定藥物 | `N` → 無；`Y` → 有 |
| `hp.medList` | 服用藥物種類 | `1` → 止痛藥；`2` → 類固醇；`3` → 抗血小板藥物；`4` → 抗凝血劑；`5` → 糖尿病用藥；`6` → 使用鐵劑治療貧血 |
| `hp.antiplatelet` | 抗血小板藥物 | `1` → 阿斯匹靈（Aspirin）；`2` → 保栓通（Plavix）；`3` → 其他 |
| `hp.antiplateletOther` | 其他抗血小板藥物 |  |
| `hp.anticoag` | 抗凝血劑 | `1` → 可邁丁（Coumadin）；`2` → 其他 |
| `hp.anticoagOther` | 其他抗凝血劑 |  |
| `hp.dm` | 糖尿病用藥 | `1` → 口服型控制血糖；`2` → 注射型胰島素 |
| `hp.smoke` | 您有無吸菸習慣？ | `0` → 從不；`1` → 已戒；`2` → 目前有吸；`3` → 其他 |
| `hp.smokeOther` | 其他吸菸情形 |  |
| `hp.drink` | 您有無喝酒習慣？ | `0` → 從不；`1` → 已戒；`2` → 目前有喝；`3` → 其他 |
| `hp.drinkOther` | 其他喝酒情形 |  |
| `hp.betel` | 您有無嚼檳榔習慣？ | `0` → 從不；`1` → 已戒；`2` → 目前有嚼；`3` → 其他 |
| `hp.betelOther` | 其他嚼檳榔情形 |  |
| `hp.pickled` | 您是否常常食用醃漬食物，如鹹魚、醬瓜、豆瓣醬、酸菜等？ | `0` → 無；`1` → 有 |
| `hp.smoked` | 您是否常常食用煙燻、燒烤、高香料的肉類，如香腸、烤肉等？ | `0` → 無；`1` → 有 |
| `hp.raw` | 您是否常常食用生食，如生肉、生魚等？ | `0` → 無；`1` → 有 |
| `hp.sigConsent` | 受檢者同意簽名 |  |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `hp.pay` | 支付方式 | `1` → 預防保健；`2` → 健保醫療給付；`3` → 其他公務預算補助；`4` → 自費健康檢查；`5` → 其他 |
| `hp.unit` | 採檢單位名稱 |  |
| `hp.unitCode` | 採檢醫事機構代碼 |  |
| `hp.visitY` | 門診日期（民國年） |  |
| `hp.visitM` | 門診日期（月） |  |
| `hp.visitD` | 門診日期（日） |  |
| `hp.visit2Y` | 第二次門診日期（民國年） |  |
| `hp.visit2M` | 第二次門診日期（月） |  |
| `hp.visit2D` | 第二次門診日期（日） |  |

### fit－糞便潛血檢查（大腸癌篩檢）

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.sex` | 性別 | `M` → 男；`F` → 女 |
| `profile.mobile` | 手機號碼 |  |
| `fit.smoke` | 吸菸史 | `0` → 無；`1` → 有（含已戒菸） |
| `fit.smokeAge` | 開始吸菸年齡（歲） |  |
| `fit.famCrc` | 大腸直腸癌家族史 | `0` → 無；`1` → 有；`2` → 不知道 |
| `fit.famCa` | 其他癌症家族史 | `0` → 無；`1` → 有；`2` → 不知道 |
| `fit.symptom` | 腸道不適症狀 | `0` → 無；`1` → 有 |
| `fit.annexConsent` | 是否同意填答家族史及吸菸習慣附表 | `Y` → 同意；`N` → 不同意 |
| `fit.smokeHabit` | 附表－吸菸習慣 | `1` → 已戒菸；`2` → 吸 10 年以下，每天少於 20 支；`3` → 吸 10 年以下，每天 20 支或以上；`4` → 吸超過 10 年，每天少於 20 支；`5` → 吸超過 10 年，每天 20 支或以上 |
| `fit.quitAge` | 戒菸年齡（歲） |  |
| `fit.t1Rel` | 大腸直腸癌家族史－親屬 | `Father` → 父親；`Mother` → 母親；`Child` → 子女；`Sib` → 兄弟／姊妹；`Pat` → 其他父系親屬；`Mat` → 其他母系親屬 |
| `fit.t1FatherAge1` | 大腸直腸癌家族史－父親第 1 位罹癌年紀（歲） |  |
| `fit.t1MotherAge1` | 大腸直腸癌家族史－母親第 1 位罹癌年紀（歲） |  |
| `fit.t1ChildN` | 大腸直腸癌家族史－子女罹癌人數 |  |
| `fit.t1ChildAge1` | 大腸直腸癌家族史－子女第 1 位罹癌年紀（歲） |  |
| `fit.t1ChildAge2` | 大腸直腸癌家族史－子女第 2 位罹癌年紀（歲） |  |
| `fit.t1ChildAge3` | 大腸直腸癌家族史－子女第 3 位罹癌年紀（歲） |  |
| `fit.t1SibN` | 大腸直腸癌家族史－兄弟／姊妹罹癌人數 |  |
| `fit.t1SibAge1` | 大腸直腸癌家族史－兄弟／姊妹第 1 位罹癌年紀（歲） |  |
| `fit.t1SibAge2` | 大腸直腸癌家族史－兄弟／姊妹第 2 位罹癌年紀（歲） |  |
| `fit.t1SibAge3` | 大腸直腸癌家族史－兄弟／姊妹第 3 位罹癌年紀（歲） |  |
| `fit.t1PatN` | 大腸直腸癌家族史－其他父系親屬罹癌人數 |  |
| `fit.t1PatAge1` | 大腸直腸癌家族史－其他父系親屬第 1 位罹癌年紀（歲） |  |
| `fit.t1PatAge2` | 大腸直腸癌家族史－其他父系親屬第 2 位罹癌年紀（歲） |  |
| `fit.t1PatAge3` | 大腸直腸癌家族史－其他父系親屬第 3 位罹癌年紀（歲） |  |
| `fit.t1MatN` | 大腸直腸癌家族史－其他母系親屬罹癌人數 |  |
| `fit.t1MatAge1` | 大腸直腸癌家族史－其他母系親屬第 1 位罹癌年紀（歲） |  |
| `fit.t1MatAge2` | 大腸直腸癌家族史－其他母系親屬第 2 位罹癌年紀（歲） |  |
| `fit.t1MatAge3` | 大腸直腸癌家族史－其他母系親屬第 3 位罹癌年紀（歲） |  |
| `fit.t2Rel` | 其他癌症家族史－親屬 | `Father` → 父親；`Mother` → 母親；`Child` → 子女；`Sib` → 兄弟／姊妹；`Pat` → 其他父系親屬；`Mat` → 其他母系親屬 |
| `fit.t2FatherType` | 其他癌症家族史－父親癌別 |  |
| `fit.t2FatherAge1` | 其他癌症家族史－父親第 1 位罹癌年紀（歲） |  |
| `fit.t2MotherType` | 其他癌症家族史－母親癌別 |  |
| `fit.t2MotherAge1` | 其他癌症家族史－母親第 1 位罹癌年紀（歲） |  |
| `fit.t2ChildType` | 其他癌症家族史－子女癌別 |  |
| `fit.t2ChildN` | 其他癌症家族史－子女罹癌人數 |  |
| `fit.t2ChildAge1` | 其他癌症家族史－子女第 1 位罹癌年紀（歲） |  |
| `fit.t2ChildAge2` | 其他癌症家族史－子女第 2 位罹癌年紀（歲） |  |
| `fit.t2ChildAge3` | 其他癌症家族史－子女第 3 位罹癌年紀（歲） |  |
| `fit.t2SibType` | 其他癌症家族史－兄弟／姊妹癌別 |  |
| `fit.t2SibN` | 其他癌症家族史－兄弟／姊妹罹癌人數 |  |
| `fit.t2SibAge1` | 其他癌症家族史－兄弟／姊妹第 1 位罹癌年紀（歲） |  |
| `fit.t2SibAge2` | 其他癌症家族史－兄弟／姊妹第 2 位罹癌年紀（歲） |  |
| `fit.t2SibAge3` | 其他癌症家族史－兄弟／姊妹第 3 位罹癌年紀（歲） |  |
| `fit.t2PatType` | 其他癌症家族史－其他父系親屬癌別 |  |
| `fit.t2PatN` | 其他癌症家族史－其他父系親屬罹癌人數 |  |
| `fit.t2PatAge1` | 其他癌症家族史－其他父系親屬第 1 位罹癌年紀（歲） |  |
| `fit.t2PatAge2` | 其他癌症家族史－其他父系親屬第 2 位罹癌年紀（歲） |  |
| `fit.t2PatAge3` | 其他癌症家族史－其他父系親屬第 3 位罹癌年紀（歲） |  |
| `fit.t2MatType` | 其他癌症家族史－其他母系親屬癌別 |  |
| `fit.t2MatN` | 其他癌症家族史－其他母系親屬罹癌人數 |  |
| `fit.t2MatAge1` | 其他癌症家族史－其他母系親屬第 1 位罹癌年紀（歲） |  |
| `fit.t2MatAge2` | 其他癌症家族史－其他母系親屬第 2 位罹癌年紀（歲） |  |
| `fit.t2MatAge3` | 其他癌症家族史－其他母系親屬第 3 位罹癌年紀（歲） |  |
| `fit.sigAnnex` | 附表－受檢者本人簽名 |  |
| `fit.sigConsent` | 受檢者同意簽名 |  |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `fit.pay` | 支付方式 | `1` → 預防保健；`3` → 健保醫療給付；`4` → 其他公務預算補助；`5` → 自費健康檢查；`9` → 其他 |
| `fit.site` | 篩檢地點 | `1` → 社區或職場設站篩檢；`2` → 門診；`3` → 住院；`4` → 郵寄；`5` → 其他 |
| `fit.clinic` | 檢查醫療院所名稱及代碼 |  |
| `fit.visitY` | 門診日期（民國年） |  |
| `fit.visitM` | 門診日期（月） |  |
| `fit.visitD` | 門診日期（日） |  |
| `fit.lab` | 檢驗機構／醫療院所名稱及代碼 |  |
| `fit.labY` | 檢驗日期（民國年） |  |
| `fit.labM` | 檢驗日期（月） |  |
| `fit.labD` | 檢驗日期（日） |  |
| `fit.result` | 糞便潛血檢驗結果 | `0` → 陰性；`1` → 陽性 |
| `fit.value` | 糞便潛血檢驗數值 |  |
| `fit.reagent` | 定量試劑商品名稱 | `0` → Eiken；`2` → 其他；`3` → Kyowa（HM-JACKarc） |
| `fit.reagentOther` | 其他定量試劑名稱 |  |
| `fit.followed` | 檢查後三個月內是否接受後續確診 | `0` → 沒有；`1` → 有 |
| `fit.noReason` | 未接受確診理由 | `1` → 無法聯繫；`2` → 出國；`3` → 搬家；`4` → 死亡；`5` → 拒做；`6` → 其他 |
| `fit.noReasonOther` | 其他未確診理由 |  |
| `fit.confirmHospital` | 確診醫療院所名稱及代碼 |  |
| `fit.confirmY` | 確診日期（民國年） |  |
| `fit.confirmM` | 確診日期（月） |  |
| `fit.confirmD` | 確診日期（日） |  |
| `fit.method` | 確診檢查方法 | `1` → 大腸鏡；`9` → 其他 |
| `fit.methodOther` | 其他檢查方法 |  |
| `fit.dx` | 確診診斷 | `0` → 正常；`1` → 痔瘡；`2` → 潰瘍性大腸炎；`3` → 息肉；`4` → 大腸癌；`9` → 其他 |
| `fit.dxOther` | 其他診斷 |  |
| `fit.polypCut` | 息肉切除情形 | `1` → 未切除；`2` → 已完全切除；`3` → 未完全切除 |
| `fit.edu1Y` | 衛教第 1 欄評值日期（民國年） |  |
| `fit.edu1M` | 衛教第 1 欄評值日期（月） |  |
| `fit.edu1D` | 衛教第 1 欄評值日期（日） |  |
| `fit.edu1Name` | 衛教第 1 欄評值受檢者姓名 |  |
| `fit.edu1Pid` | 衛教第 1 欄評值受檢者身分證號 |  |
| `fit.edu1S1` | 衛教第 1 欄評值－【步驟一】評估民眾是否符合衛生福利部國民健康署大腸癌篩檢之補助條件 | `age` → 已評估:確認篩檢資格（年齡）；`done` → 已評估:已執行過檢查 |
| `fit.edu1S2` | 衛教第 1 欄評值－【步驟二】衛教後是否同意執行大腸癌篩檢（確認篩檢意願） | `purpose` → 已說明:目的；`method` → 已說明:方法；`body` → 已說明:身體狀況:（排除條件）；`report` → 已說明:結果、寄發報告時間 |
| `fit.edu1S3` | 衛教第 1 欄評值－【步驟三】依各醫院提示篩檢方式加強提示提醒（建議定期追蹤）危險因子告知 | `risk` → :已說明危險因子；`na` → :不適用 |
| `fit.edu1S4` | 衛教第 1 欄評值－【步驟四】提供採檢衛教及採檢管 | `chart` → 已執行:衛教說明示意圖；`demo` → 已執行:回覆示教 |
| `fit.edu1S5` | 衛教第 1 欄評值－【步驟五】追蹤提醒（促進繳回方法） | `1` → 已說明:電話、信件、其他方式 |
| `fit.edu1S6` | 衛教第 1 欄評值－【步驟六】寄發報告陰性/陽性報告寄發建議事項結果 | `1` → 已說明:諮詢窗口/諮詢專線 |
| `fit.edu2Y` | 衛教第 2 欄評值日期（民國年） |  |
| `fit.edu2M` | 衛教第 2 欄評值日期（月） |  |
| `fit.edu2D` | 衛教第 2 欄評值日期（日） |  |
| `fit.edu2Name` | 衛教第 2 欄評值受檢者姓名 |  |
| `fit.edu2Pid` | 衛教第 2 欄評值受檢者身分證號 |  |
| `fit.edu2S1` | 衛教第 2 欄評值－【步驟一】評估民眾是否符合衛生福利部國民健康署大腸癌篩檢之補助條件 | `age` → 已評估:確認篩檢資格（年齡）；`done` → 已評估:已執行過檢查 |
| `fit.edu2S2` | 衛教第 2 欄評值－【步驟二】衛教後是否同意執行大腸癌篩檢（確認篩檢意願） | `purpose` → 已說明:目的；`method` → 已說明:方法；`body` → 已說明:身體狀況:（排除條件）；`report` → 已說明:結果、寄發報告時間 |
| `fit.edu2S3` | 衛教第 2 欄評值－【步驟三】依各醫院提示篩檢方式加強提示提醒（建議定期追蹤）危險因子告知 | `risk` → :已說明危險因子；`na` → :不適用 |
| `fit.edu2S4` | 衛教第 2 欄評值－【步驟四】提供採檢衛教及採檢管 | `chart` → 已執行:衛教說明示意圖；`demo` → 已執行:回覆示教 |
| `fit.edu2S5` | 衛教第 2 欄評值－【步驟五】追蹤提醒（促進繳回方法） | `1` → 已說明:電話、信件、其他方式 |
| `fit.edu2S6` | 衛教第 2 欄評值－【步驟六】寄發報告陰性/陽性報告寄發建議事項結果 | `1` → 已說明:諮詢窗口/諮詢專線 |
| `fit.sigInterviewer` | 附表－訪問人員簽名 |  |
| `fit.ivY` | 附表訪問日期（民國年） |  |
| `fit.ivM` | 附表訪問日期（月） |  |
| `fit.ivD` | 附表訪問日期（日） |  |

### adult－成人預防保健

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.phone` | 聯絡電話 |  |
| `profile.email` | 電子郵件 |  |
| `profile.edu` | 教育程度 | `1` → 無；`2` → 小學；`3` → 國（初）中；`4` → 高中（職）；`5` → 專科、大學；`6` → 研究所以上；`7` → 拒答 |
| `profile.addrCounty` | 現住址－縣市 |  |
| `profile.addrTown` | 現住址－鄉鎮市區 |  |
| `profile.addrVillage` | 現住址－村里 |  |
| `profile.addrLin` | 現住址－鄰 |  |
| `profile.addrRoad` | 現住址－路街 |  |
| `profile.addrSec` | 現住址－段 |  |
| `profile.addrLane` | 現住址－巷 |  |
| `profile.addrAlley` | 現住址－弄 |  |
| `profile.addrNo` | 現住址－門牌號 |  |
| `profile.addrFloor` | 現住址－樓 |  |
| `profile.sex` | 性別 | `M` → 男；`F` → 女 |
| `profile.aboriginal` | 是否為原住民 | `Y` → 是；`N` → 否 |
| `profile.regSame` | 戶籍地與現住址相同 | `1` → 勾選 |
| `profile.regCounty` | 戶籍地－縣市 |  |
| `adult.dx` | 疾病史 | `htn` → 高血壓；`dm` → 糖尿病；`hyperlipid` → 高血脂症；`heart` → 心臟病；`stroke` → 腦中風；`kidney` → 腎臟病；`hbv` → B 型肝炎；`hcv` → C 型肝炎；`psych` → 精神疾病；`other` → 其他；`polio` → 小兒麻痺；`none` → 以上均無 |
| `adult.dxOther` | 其他疾病名稱 |  |
| `adult.med` | 長期服藥 | `0` → 無；`1` → 有 |
| `adult.medCause` | 長期服藥病因 |  |
| `adult.fam` | 家族疾病史 | `htn` → 高血壓；`dm` → 糖尿病；`lipid` → 血脂異常；`heart` → 心臟病；`stroke` → 腦中風；`psych` → 精神疾病；`cancer` → 癌症；`other` → 其他；`none` → 以上均無 |
| `adult.famCancer` | 家族癌症名稱 |  |
| `adult.famOther` | 家族其他疾病名稱 |  |
| `adult.smoke` | 最近半年來，您吸菸的情形是？ | `1` → 不吸菸；`2` → 朋友敬菸或應酬才吸菸；`3` → 平均一天約吸一包菸（含以下）；`4` → 平均一天約吸一包菸以上 |
| `adult.drink` | 最近半年來，您喝酒的情形是？ | `1` → 不喝酒；`2` → 偶爾喝酒或應酬才喝；`3` → 經常喝酒 |
| `adult.betel` | 最近半年來，您嚼檳榔的情形是？ | `1` → 不嚼檳榔；`2` → 偶爾會嚼或應酬才嚼；`3` → 經常嚼或習慣在嚼 |
| `adult.exercise` | 最近二週，您是否有運動（每週達 150 分鐘以上）？ | `1` → 沒有；`2` → 有，但未達每週 150 分鐘（2.5 小時）；`3` → 有，且每週達 150 分鐘以上（2.5 小時） |
| `adult.cough` | 您是否出現咳嗽超過二週的情形？ | `1` → 沒有；`2` → 有 |

#### staff_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `adult.s1Y` | 第一階段日期（民國年） |  |
| `adult.s1M` | 第一階段日期（月） |  |
| `adult.s1D` | 第一階段日期（日） |  |
| `adult.s2Y` | 第二階段日期（民國年） |  |
| `adult.s2M` | 第二階段日期（月） |  |
| `adult.s2D` | 第二階段日期（日） |  |
| `adult.sigS1` | 第一階段服務對象同意簽名 |  |
| `adult.sigS2` | 第二階段服務對象同意簽名 |  |
| `adult.sigHep` | B、C 型肝炎檢查服務對象同意簽名 |  |
| `adult.height` | 身高（公分） |  |
| `adult.weight` | 體重（公斤） |  |
| `adult.pulse` | 脈搏（次／分） |  |
| `adult.waist` | 腰圍（公分） |  |
| `adult.sbp` | 收縮壓（mmHg） |  |
| `adult.dbp` | 舒張壓（mmHg） |  |
| `adult.vaR` | 右眼裸眼視力 |  |
| `adult.vaL` | 左眼裸眼視力 |  |
| `adult.vcR` | 右眼矯正視力 |  |
| `adult.vcL` | 左眼矯正視力 |  |
| `adult.ent` | 耳鼻喉及口腔檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.entAbn` | 耳鼻喉及口腔異常項目 | `aid` → 助聽器；`caries` → 齲齒；`perio` → 牙結石或牙周病；`other` → 其他 |
| `adult.lymph` | 頸部淋巴腺腫大 | `Y` → 有；`N` → 無 |
| `adult.thyroid` | 甲狀腺腫大 | `Y` → 有；`N` → 無 |
| `adult.ex_chest` | 胸部檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.ex_chestNote` | 胸部異常說明 |  |
| `adult.ex_heart` | 心臟聽診檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.ex_heartNote` | 心臟聽診異常說明 |  |
| `adult.ex_lung` | 呼吸聽診檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.ex_lungNote` | 呼吸聽診異常說明 |  |
| `adult.ex_abd` | 腹部檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.ex_abdNote` | 腹部異常說明 |  |
| `adult.ex_limb` | 四肢檢查 | `1` → 無明顯異常；`2` → 異常 |
| `adult.ex_limbNote` | 四肢異常說明 |  |
| `adult.otherAbn` | 其他異常 |  |
| `adult.uproQual` | 尿液蛋白質（定性） | `neg` → －；`pm` → +/－；`p1` → +；`p2` → ++；`p3` → +++；`p4` → ++++ |
| `adult.uproQuant` | 尿液蛋白質（定量）（mg/dl） |  |
| `adult.uproQuantRef` | 尿液蛋白質（定量）參考值 |  |
| `adult.glu` | 飯前血糖（mg/dl） |  |
| `adult.gluRef` | 飯前血糖參考值 |  |
| `adult.tc` | 總膽固醇（mg/dl） |  |
| `adult.tcRef` | 總膽固醇參考值 |  |
| `adult.tg` | 三酸甘油脂（mg/dl） |  |
| `adult.tgRef` | 三酸甘油脂參考值 |  |
| `adult.hdl` | 高密度脂蛋白膽固醇（mg/dl） |  |
| `adult.hdlRef` | 高密度脂蛋白膽固醇參考值 |  |
| `adult.ast` | 肝功能－AST（GOT）（IU/L） |  |
| `adult.astRef` | 肝功能－AST（GOT）參考值 |  |
| `adult.alt` | 肝功能－ALT（GPT）（IU/L） |  |
| `adult.altRef` | 肝功能－ALT（GPT）參考值 |  |
| `adult.cr` | 肌酸酐（mg/dl） |  |
| `adult.crRef` | 肌酸酐參考值 |  |
| `adult.ldlRef` | 低密度脂蛋白膽固醇參考值 |  |
| `adult.ua` | 尿酸（mg/dl） |  |
| `adult.hbsag` | B 型肝炎表面抗原（HBsAg） | `1` → 陰性；`2` → 陽性；`3` → 未執行 |
| `adult.hcv` | C 型肝炎抗體（Anti-HCV） | `1` → 陰性；`2` → 陽性；`3` → 未執行 |
| `adult.counsel` | 健康諮詢 | `smoke` → 戒菸；`drink` → 節酒；`betel` → 戒檳榔；`exercise` → 規律運動（含 150 分鐘／每週）；`weight` → 維持正常體重；`diet` → 健康飲食（含我的健康餐盤）；`injury` → 事故傷害預防；`oral` → 口腔保健；`risk` → 慢性疾病風險評估；`kidney` → 腎病識能衛教指導（含尿蛋白、eGFR 的數據、腎功能期別及其嚴重度、危險因子衛教） |
| `adult.res_bp` | 血壓檢查結果 | `1` → 正常；`2` → 異常 |
| `adult.res_bpAdv` | 血壓建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_bpMon` | 血壓追蹤間隔（月） |  |
| `adult.res_glu` | 飯前血糖檢查結果 | `1` → 正常；`2` → 異常 |
| `adult.res_gluAdv` | 飯前血糖建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_gluMon` | 飯前血糖追蹤間隔（月） |  |
| `adult.res_lipid` | 血脂肪檢查結果 | `1` → 正常；`2` → 異常 |
| `adult.res_lipidAdv` | 血脂肪建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_lipidMon` | 血脂肪追蹤間隔（月） |  |
| `adult.res_renal` | 腎功能檢查結果 | `1` → 正常；`2` → 異常 |
| `adult.res_renalAdv` | 腎功能建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_renalMon` | 腎功能追蹤間隔（月） |  |
| `adult.res_liver` | 肝功能檢查結果 | `1` → 正常；`2` → 異常 |
| `adult.res_liverAdv` | 肝功能建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_liverMon` | 肝功能追蹤間隔（月） |  |
| `adult.res_mets` | 代謝症候群檢查結果 | `1` → 沒有；`2` → 有 |
| `adult.res_metsAdv` | 代謝症候群建議 | `life` → 生活型態改善，並定期追蹤；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.res_metsMon` | 代謝症候群追蹤間隔（月） |  |
| `adult.res_renalStage` | 腎功能期別 |  |
| `adult.risk_chd` | 冠心病風險值（%） |  |
| `adult.risk_chdNA` | 冠心病風險值不適用 | `1` → 勾選 |
| `adult.risk_dm` | 糖尿病風險值（%） |  |
| `adult.risk_dmNA` | 糖尿病風險值不適用 | `1` → 勾選 |
| `adult.risk_htn` | 高血壓風險值（%） |  |
| `adult.risk_htnNA` | 高血壓風險值不適用 | `1` → 勾選 |
| `adult.risk_stroke` | 腦中風風險值（%） |  |
| `adult.risk_strokeNA` | 腦中風風險值不適用 | `1` → 勾選 |
| `adult.risk_mace` | 心血管不良事件風險值（%） |  |
| `adult.risk_maceNA` | 心血管不良事件風險值不適用 | `1` → 勾選 |
| `adult.resHbv` | B 型肝炎表面抗原結果與建議 | `neg` → 陰性；`pos` → 陽性；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.resHcv` | C 型肝炎抗體結果與建議 | `neg` → 陰性；`pos` → 陽性；`exam` → 進一步檢查；`treat` → 接受治療 |
| `adult.resCough` | 咳嗽症狀與建議 | `1` → 沒有；`2` → 有：建議轉診進一步評估是否可能為結核病 |
| `adult.org` | 特約醫事服務機構名稱及代號 |  |
| `adult.sigDoctor` | 檢查醫師簽名 |  |
| `adult.dualOrg` | 雙軌作業－第二階段服務機構名稱 |  |
| `adult.dualAddr` | 雙軌作業－第二階段服務機構地址 |  |

### labor－勞工健康檢查

#### public_data

| key | 中文名稱 | 選項代碼 → 名稱 |
|---|---|---|
| `profile.idType` | 證件種類 | `national_id` → 身分證；`resident_id` → 統一證號；`passport` → 護照 |
| `profile.idNo` | 身分證號／統一證號／護照號碼 |  |
| `profile.name` | 姓名 |  |
| `profile.birthY` | 出生日期（民國年） |  |
| `profile.birthM` | 出生日期（月） |  |
| `profile.birthD` | 出生日期（日） |  |
| `profile.email` | 電子郵件 |  |
| `profile.sex` | 性別 | `M` → 男；`F` → 女 |
| `labor.company` | 事業單位名稱 |  |
| `labor.reason` | 檢查時期（原因） | `new` → 新進員工（受僱時）；`periodic` → 定期檢查 |
| `labor.hiredY` | 受僱日期（民國年） |  |
| `labor.hiredM` | 受僱日期（月） |  |
| `labor.hiredD` | 受僱日期（日） |  |
| `labor.examY` | 檢查日期（民國年） |  |
| `labor.examM` | 檢查日期（月） |  |
| `labor.examD` | 檢查日期（日） |  |
| `labor.currentHas` | 是否有目前工作 | `Y` → 有；`N` → 無 |
| `labor.currentTitle` | 目前工作內容 |  |
| `labor.currentStartY` | 目前工作起始年月（民國年） |  |
| `labor.currentStartM` | 目前工作起始年月（月） |  |
| `labor.currentEndY` | 目前工作截止年月（民國年） |  |
| `labor.currentEndM` | 目前工作截止年月（月） |  |
| `labor.currentYears` | 目前工作合計年資（年） |  |
| `labor.currentMonths` | 目前工作合計年資剩餘月數 |  |
| `labor.previousHas` | 是否有最近一項過去工作 | `Y` → 有；`N` → 無 |
| `labor.previousTitle` | 最近一項過去工作內容 |  |
| `labor.previousStartY` | 最近一項過去工作起始年月（民國年） |  |
| `labor.previousStartM` | 最近一項過去工作起始年月（月） |  |
| `labor.previousEndY` | 最近一項過去工作截止年月（民國年） |  |
| `labor.previousEndM` | 最近一項過去工作截止年月（月） |  |
| `labor.previousYears` | 最近一項過去工作合計年資（年） |  |
| `labor.previousMonths` | 最近一項過去工作合計年資剩餘月數 |  |
| `labor.shift` | 是否需輪班 | `Y` → 是；`N` → 否 |
| `labor.shiftType` | 輪班班制 | `two` → 兩班制；`three` → 三班制；`four` → 四班制；`other` → 其他 |
| `labor.shiftOther` | 其他班制說明 |  |
| `labor.hours1m` | 檢查日前 1 個月平均每週工時（小時） |  |
| `labor.hours6m` | 檢查日前 6 個月平均每週工時（小時） |  |
| `labor.sleep` | 工作日期間平均每天睡眠時間（小時） |  |
| `labor.diseases` | 曾患疾病 | `hypertension` → 高血壓；`diabetes` → 糖尿病；`heart` → 心臟病；`cancer` → 癌症；`cataract` → 白內障；`stroke` → 中風；`epilepsy` → 癲癇；`asthma` → 氣喘；`copd` → 慢性氣管炎、肺氣腫；`tuberculosis` → 肺結核；`kidney` → 腎臟病；`liver` → 肝病；`anemia` → 貧血；`ear` → 中耳炎；`hearing` → 聽力障礙；`thyroid` → 甲狀腺疾病；`ulcer` → 消化性潰瘍、胃炎；`reflux` → 逆流性食道炎；`fracture` → 骨折；`surgery` → 手術開刀；`other` → 其他慢性病；`none` → 以上皆無 |
| `labor.symptoms` | 最近三個月自覺症狀 | `cough` → 咳嗽；`sputum` → 咳痰；`breath` → 呼吸困難；`chest` → 胸痛；`palpitations` → 心悸；`dizziness` → 頭暈；`headache` → 頭痛；`tinnitus` → 耳鳴；`fatigue` → 倦怠；`nausea` → 噁心；`abdomen` → 腹痛；`constipation` → 便秘；`diarrhea` → 腹瀉；`bloodyStool` → 血便；`upperBack` → 上背痛；`lowerBack` → 下背痛；`numbness` → 手腳麻痛；`joint` → 關節疼痛；`urinary` → 排尿不適；`frequency` → 多尿、頻尿；`weakness` → 手腳肌肉無力；`weightLoss` → 體重減輕 3 公斤以上；`other` → 其他症狀；`none` → 以上皆無 |
| `labor.cancerDetail` | 癌症說明 |  |
| `labor.fractureDetail` | 骨折說明 |  |
| `labor.surgeryDetail` | 手術開刀說明 |  |
| `labor.otherDetail` | 其他慢性病說明 |  |
| `labor.symptomOther` | 其他症狀說明 |  |
| `labor.smoke` | 請問您過去一個月內是否有吸菸？ | `never` → 從未吸菸；`daily` → （幾乎）每天吸；`occasional` → 偶爾吸（不是天天）；`quit` → 已經戒菸 |
| `labor.smokeAmount` | 平均每天吸幾支（支） |  |
| `labor.smokeYears` | 已吸菸幾年 |  |
| `labor.smokeQuitY` | 已戒吸菸期間（年） |  |
| `labor.smokeQuitM` | 已戒吸菸期間剩餘月數 |  |
| `labor.betel` | 請問您最近六個月內是否有嚼食檳榔？ | `never` → 從未嚼食檳榔；`daily` → （幾乎）每天嚼；`occasional` → 偶爾嚼（不是天天）；`quit` → 已經戒嚼 |
| `labor.betelAmount` | 平均每天嚼幾顆（顆） |  |
| `labor.betelYears` | 已嚼幾年 |  |
| `labor.betelQuitY` | 已戒嚼食檳榔期間（年） |  |
| `labor.betelQuitM` | 已戒嚼食檳榔期間剩餘月數 |  |
| `labor.drink` | 請問您過去一個月內是否有喝酒？ | `never` → 從未喝酒；`daily` → （幾乎）每天喝；`occasional` → 偶爾喝（不是天天）；`quit` → 已經戒酒 |
| `labor.drinkAmount` | 平均每週喝幾次（次／週） |  |
| `labor.drinkQuitY` | 已戒喝酒期間（年） |  |
| `labor.drinkQuitM` | 已戒喝酒期間剩餘月數 |  |
| `labor.drinkType` | 最常喝的酒類 |  |
| `labor.drinkBottles` | 每次喝幾瓶 |  |
| `labor.uploadConsent` | 是否同意個人自費資料蒐集處理及利用 | `Y` → 同意；`N` → 不同意 |
| `labor.uploadYearsMode` | 自起算日起涵蓋資料的期間 | `seven` → 7 年；`custom` → 自訂年數 |
| `labor.uploadYears` | 自訂涵蓋資料年數 |  |
| `labor.uploadUseMode` | 自簽署日起提供健保署的利用期間 | `permanent` → 自簽署日起永久；`custom` → 自簽署日起自訂年數 |
| `labor.uploadUseYears` | 自訂利用年數 |  |
| `labor.uploadCloud` | 另同意提供至健保醫療資訊雲端查詢系統 | `1` → 勾選 |
| `labor.uploadSignature` | 資料上傳同意書本人簽名 |  |
| `labor.uploadHasRepresentative` | 是否有法定代理人 | `N` → 無；`Y` → 有法定代理人 |
| `labor.uploadRepresentativeName` | 法定代理人姓名 |  |
| `labor.uploadRepresentativeIdNo` | 法定代理人身分證號／證件號 |  |
| `labor.uploadRepresentativeSignature` | 資料上傳同意書法定代理人簽名 |  |
| `labor.uploadFromY` | 資料上傳同意書的資料起算日期（民國年） |  |
| `labor.uploadFromM` | 資料上傳同意書的資料起算日期（月） |  |
| `labor.uploadFromD` | 資料上傳同意書的資料起算日期（日） |  |
| `labor.uploadSignedY` | 資料上傳同意書簽署日期（民國年） |  |
| `labor.uploadSignedM` | 資料上傳同意書簽署日期（月） |  |
| `labor.uploadSignedD` | 資料上傳同意書簽署日期（日） |  |

#### staff_data

無院所填寫欄位。

維護方式見 [開發規範](../../AGENTS.md#共用資料契約與欄位對照)；相同內容另提供 [JSON 字典](heal-submissions.json)。
