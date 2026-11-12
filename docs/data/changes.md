# 共用資料契約異動紀錄

此檔記錄 `heal_submissions` 共用資料契約的異動。欄位與代碼完整對照見 [資料字典](heal-submissions.md)，供其他應用程式使用的版本見 [JSON 字典](heal-submissions.json)。

## 2026-11-12：勞工健檢事業單位名稱改為選填

- 一般勞工健檢與預約健檢的 `labor.company` 由必填改為選填，允許空字串。key、中文名稱及既有資料不變，列印欄位保留原樣，無須 migration 或歷史資料轉換。
- 共用讀取端須容許事業單位名稱為空；精簡資料字典維持原欄位對照，不加入必填或選填等驗證規則。

## 2026-11-12：新增證件種類與共用驗證

- 七份表單的 `public_data` 新增 `profile.idType`（證件種類）：`national_id` 身分證、`resident_id` 統一證號、`passport` 護照。原 `profile.idNo` 的 key 與意義不變，護照號碼接受 5–20 碼英數字並保留前導零。沒有修改實體欄位、表單代號或狀態，不需要 migration。
- 新填寫預設選擇身分證；前台入口與伺服器依所選種類檢查。身分證及新舊式統一證號均檢查檢查碼；護照僅檢查基本格式。既有案件的證件種類於修改重送時由伺服器固定，不以傳入內容任意改類。
- 預約入口的證件種類包含於原有加密憑證；預約健檢問卷仍存為 `form_id=labor`，其 `profile.idType` 由伺服器帶入，不新增預約資料表欄位。缺少新證件種類的舊預約憑證須重新查詢。
- 使用者已確認現有資料為可捨棄的測試資料，本次不回填或轉換，也不刪除既有資料。缺少新 key 的暫存須重新經過證件入口；舊問卷仍可查閱，但缺少種類者不保證可直接修改重送。相依應用程式讀取歷史資料時須容許 key 缺少，不能自行假定證件種類；讀取新資料時依上述代碼對照。無須轉換既有 `id_no`，不得改用數值儲存證件號。

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

## 2026-11-10 預約健檢後台

- 新增 `heal_appointment_settings`、`heal_appointments`、`heal_appointment_notices`。預約狀態 `pending`、`confirmed`、`cancelled` 分別代表待確認、預約成立、預約取消。套餐代碼對照以 `src/lib/appointments/catalog.ts` 為準。
- `heal_appointments.submission_id` 可關聯一筆已送出的 `heal_submissions`，原表單代號為 `labor`。關聯表單與預約的證件號和生日須相符。預約確認只更新預約狀態，問卷本身仍依原狀態解讀。
- `appointment` 是後台列表的篩選值。預約狀態只在列表對應到 `submitted`、`completed`、`voided`，相依程式仍可按原字典讀取七種問卷。需要辨識預約案件時，透過 `heal_appointments.submission_id` 關聯。外鍵會保護已關聯的勞工表免於被直接刪除。
- Migration `0007_health_check_appointments.sql` 預設關閉新預約，無須回填或轉換歷史問卷。兩份 `heal_submissions` 字典的欄位、代號與答案 key 保持原定義。

## 2026-11-10 預約健檢前台

- Migration `0008_appointment_public.sql` 增加預約日期設定、憑證雜湊及雜湊鍵的限流表。既有設定套用預設提前 15 至 90 天，休診日清單為空。`management_code_hash` 沿用原有實體欄位及雜湊格式，供伺服器驗證原瀏覽器。證件號與生日查詢摘要時無須此憑證。
- 預約填寫沿用 `form_id=labor`、既有欄位及狀態，透過 `heal_appointments.submission_id` 與一般勞工表區分。預約表的讀寫權限由預約憑證管理，`device_token_hash` 及 `device_expires_at` 留空。
- 民眾取消時，預約改為 `cancelled`，已關聯的未完成勞工表改為 `voided` 並增加同名操作紀錄。既有答案保留供院所查核。共用讀取端沿用既有字典解讀狀態，若需區分預約來源則使用前述關聯。無須轉換歷史問卷。
