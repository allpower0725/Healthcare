# 共用資料契約異動紀錄

此檔記錄 `heal_submissions` 共用資料契約的異動。欄位與代碼完整對照見 [資料字典](heal-submissions.md)，供其他應用程式使用的版本見 [JSON 字典](heal-submissions.json)。

新增、刪除、改名或變更既有 key、選項、型別、`form_id`、`status` 的意義時，須隨程式一起更新字典，並在此記錄異動。說明應包含：日期、受影響的表單與欄位、舊值與新值、既有資料的讀取或轉換方式，以及共用應用程式須採取的相容處理。尚未完成的歷史資料轉換須明確標示，不可視為已完成。

## 2026-11-05：建立共用資料字典

- 建立目前七種表單的 `public_data`、`staff_data`、選項代碼、條件、驗證，以及 `heal_submissions` 實體欄位、`form_id`、`status` 與操作紀錄 `action` 對照。
- 本次僅增加開發規範、資料字典與產生／同步檢查指令；沒有修改既有 key、儲存值、資料表或歷史資料，其他應用程式可依 JSON 字典解讀現有資料。
- 歷史資料可能缺少後來新增的 key，讀取端應容許缺少屬性；資料列 `version` 不是問卷結構版本。未來刪改 key 時，需另列歷史資料與相依應用程式的處理方式。

## 2026-11-05：精簡字典呈現

- Markdown 與 JSON 改為供人員查閱的精簡對照。實體欄位只保留欄位與中文名稱；表單內容只保留 key、中文名稱及選項對照。移除 `<br>`、型別、格式限制、顯示條件、驗證、行政區清單及其他資料表的操作紀錄對照，省略值與名稱相同的選項。
- JSON 的實體欄位及代碼改為直接對照物件，`form_id`、`status` 從原本的 `enums` 移至最外層；若有程式讀取舊版字典，須調整讀取路徑。實際資料表、表單 key 與答案值不變，無須轉換歷史問卷資料。

## 2026-11-05：勞工健檢新增自費資料上傳同意書

- `form_id=labor` 的 `public_data` 新增 17 個 `labor.upload*` key；既有 key、表單代號、狀態及實體欄位不變，無須資料庫 migration。
- 新增 `labor.uploadConsent`：`Y` 同意、`N` 不同意。新送出必須明確選擇，不預選。歷史案件沒有此 key 時，讀取端須顯示「尚未填寫」，不可把缺少或空值視為 `N` 或 `Y`，亦不得推定具有同意效力。
- 同意時新增資料起算日 `labor.uploadFromY/M/D`、涵蓋期間 `labor.uploadYearsMode`（`seven`／`custom`）及自訂 `labor.uploadYears`、利用期間 `labor.uploadUseMode`（`permanent`／`custom`）及自訂 `labor.uploadUseYears`、另提供健保雲端的 `labor.uploadCloud`（`1` 勾選）、本人簽名 `labor.uploadSignature`、代理人有無 `labor.uploadHasRepresentative`（`Y`／`N`）、代理人姓名／證件號／簽名 `labor.uploadRepresentativeName/IdNo/Signature`，以及簽署日期 `labor.uploadSignedY/M/D`。各完整 key 與中文對照已同步資料字典。
- 相依應用程式須容許新增欄位缺少或為空；只有同意為 `Y` 時讀取及列印同意細項，代理人為 `Y` 時才使用其資料，`custom` 時才使用自訂年數。姓名、出生日期與本人證件號繼續讀取 `profile.*`，機構名稱使用固定烏日澄清醫院。
- 不回填歷史案件。歷史案件可照常院所確認；若民眾再次送出，需完成新選擇。沿用現有案件覆寫機制，最新送出取代原內容；改為不同意會清除本筆同意細項與簽名，未新增歷次簽署版本表。裝置重新進入修改仍依既有規則清除簽名重簽。
