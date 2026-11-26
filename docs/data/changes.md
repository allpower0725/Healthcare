# 共用資料契約異動紀錄

## 2026-11-26 安全驗證診斷

- 新增獨立的 `heal_care.security_verification_events`，保留 30 天的固定安全驗證分類與去識別診斷。無民眾或問卷關聯欄位，不改動 `submissions`、`public_data`、`staff_data`、表單代號或狀態；無歷史資料回填，相依應用程式無須轉換既有問卷。

此檔記錄 `heal_care.submissions`（歷史名稱 `public.heal_submissions`）共用資料契約的異動。欄位與代碼完整對照見 [資料字典](heal-submissions.md)，供其他應用程式使用的版本見 [JSON 字典](heal-submissions.json)。

## 2026-11-16：Supabase 切換新 schema 與獨立帳號

- 雲端實體資料庫維持託管的 `postgres`；原 `public.heal_*` 九表完整複製至與本機相同的 `heal_care.<去除 heal_ 的名稱>`，使用相同新 baseline，不修改舊 migration。管理紀錄在 `db_migrations.healthcare`。實體欄位、JSONB key、名稱、選項、表單代號、狀態、外鍵與所有資料值不變。
- 以雲端資料為準保留 123 份問卷、275 筆事件、7 筆預約，以及其他六表的全部資料；整體筆數與 SHA-256 一致，流水號狀態也保留。先建立應用九表與 journal 的 custom-format 備份，並在隔離本機驗證庫實際還原核對成功；雲端新舊結構完全一致。雜湊核對統一固定 C 排序，避免環境排序規則影響。
- 正式站改用 `healthcare` schema owner 與獨立雲端密碼；管理角色 `db_owner` 維護 journal 及封存資料，不具真正平台 superuser 權限。Supabase 原 `postgres` 平台管理角色保留；不將維護密碼部署到應用 runtime。TLS 透過官方 CA 驗證，不略過憑證檢查。
- 依使用者明確決定停用 `his_user` 舊整合：NOLOGIN、撤銷舊存取授權及相關問卷 RLS policy，不給新 schema 權限，也不提供舊名相容 view。日後整合必須明確更新連線、SQL／ORM 表名與授權，不能依賴舊 `public.heal_submissions` 入口。
- 舊九表封存在私有 `heal_care_legacy_20261116`，加上防寫入 trigger，作為搬移時快照，不同步新表、不供應用帳號讀寫。不能以快照取代上線後的新資料；回復須先備份並處理後續寫入。完整部署、驗證、帳號與備份步驟見 [Supabase 設定](../setup/supabase-database.md)。
- 字典欄位、代碼與 JSON 結構不變，沿用 `heal-submissions.md`／`.json` 原檔名以保留連結；不新增 SQL 型別或驗證條件到精簡字典。

## 2026-11-16：本機資料庫、schema、表名與帳號重整

- 舊本機 `localhost:5433/wjcch`、`wjcch_test` 複製至新 instance `wjcch` 的 `localhost:5432/wjcch_db`、`wjcch_db_test`。`public.heal_submissions` → `heal_care.submissions`，其他八張表及相關索引／限制／sequence 同步移除 `heal_`；完整對照與步驟見 [本機資料庫設定](../setup/local-database.md)。欄位、JSONB key、中文名稱、選項代碼、表單代號、狀態、外鍵語意與所有既有資料值保持不變。
- 使用全新 `drizzle/heal-care/0000_heal_care_baseline.sql`，不修改或重放舊 migration。先做兩庫一致性整庫備份，再逐表核對欄位定義、限制、索引、資料筆數及 SHA-256；保留原 identity sequence 狀態。舊兩庫與資料卷完整保留；新測試庫隨後可由測試重設，舊測試庫不變。
- 管理帳號改為獨立 `db_owner`；應用帳號仍叫 `healthcare`，但改用獨立新密碼，只擁有 `heal_care` 的物件。舊 `healthcare` 的 cluster superuser 權限不帶入。Migration 記錄在獨立的 `db_migrations.healthcare`，不對應用帳號開放。
- 相依應用須同步更新連線及 SQL／ORM 表名至 `heal_care.<不帶 heal_ 的名稱>`，不能只改 search_path。不建立舊名相容 view；尚未更新的工具可只讀舊庫快照，切換後不可再寫舊庫，新舊庫不會自動同步。新程式無法直接連回舊結構，回復時須連同舊版程式及舊連線一起切回，已有新寫入時需另作資料回搬。
- 歷史資料在新庫以相同值直接讀取，不轉換答案。兩份精簡字典保留既有檔名與 JSON 結構，Markdown 標題由 ORM 實際 schema／表名產生；JSON 因欄位與代碼未改，重新產生後內容相同。
- 本機階段當時尚未變更 Supabase 與正式站；同日後續已完成雲端切換並依使用者決定停用舊整合，見上方 Supabase 切換紀錄。此段保留本機階段的歷史處理方式。

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
