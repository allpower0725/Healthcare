# 預防保健表單後台

烏日澄清醫院預防保健表單的管理後台（Next.js 16 + PostgreSQL）。設計文件在 `docs/specs/`。

`預防保健表單電子檔/` 是表單原始檔，只放在本機，不進 Git。

## 本機開發

需要 Node.js 24、Docker。既有本機資料庫的搬移、全新安裝、權限與回復步驟見 [本機資料庫設定](docs/setup/local-database.md)。

本機已改用 PostgreSQL instance（Docker 容器）`wjcch`，連線 `localhost:5432`，主庫 `wjcch_db`、測試庫 `wjcch_db_test`。`heal_care` 包含原有九張應用資料表，表名移除 `heal_`；欄位與資料保持不變。Migration 紀錄獨立放在 `db_migrations.healthcare`。

- `db_owner`：本機 instance 超級使用者及兩庫擁有者，僅供維護。
- `healthcare`：`heal_care` schema、九張表及 sequence 的擁有者；沒有超級使用者、建立資料庫／角色、跨 schema 建表或全域略過 RLS 的權限。應用程式只使用此帳號。
- 兩組獨立隨機密碼位於 Git 忽略的 `.local/database/secrets/`；連線設定在 `.local/database/connections.env`。密碼由本機檔案管理，不寫入 Git 或文件。
- 舊 `healthcare-db` 仍在 `5433`，舊 `wjcch`／`wjcch_test` 與資料卷保留作為搬移時快照。新舊庫不會自動同步；切換後不要再往舊庫寫入。
- Supabase 已於 2026-11-16 切換相同的 `heal_care` 九表與 `healthcare` 應用帳號，實體資料庫保留託管的 `postgres`；正式站已上線。雲端專用密碼、平台管理限制、備份與回復見 [Supabase 設定](docs/setup/supabase-database.md)。`his_user` 舊整合已停用，舊表保留於私有封存 schema。

`5432` 已確認沒有其他監聽服務後使用。DBeaver 請另建連線：Host `localhost`、Port `5432`、Database `wjcch_db`、User `healthcare`，展開 `heal_care`；管理工作另建 `db_owner` 連線。

前台防護設定請依 [reCAPTCHA 設定步驟](docs/setup/recaptcha.md) 填入金鑰；本機開發略過方式與正式環境限制仍依該文件。

### 環境與維護設定

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | 應用程式連線：`healthcare` → 本機 `wjcch_db` |
| `MIGRATION_DATABASE_URL` | 維護用連線：`db_owner` → `wjcch_db`；只存 `.local/database/connections.env`，不放 Next `.env*` |
| `TEST_DATABASE_URL` | 測試應用連線：`healthcare` → `wjcch_db_test`；測試會清除此專用庫的資料 |
| `TEST_MIGRATION_DATABASE_URL` | 測試維護連線：`db_owner` → `wjcch_db_test`；由測試指令讀取本機維護檔 |
| `DATABASE_SSL_CA` | Supabase 官方 CA 憑證，完整驗證 TLS／hostname；本機 PostgreSQL 留空 |
| `APP_URL` | 後台網址，本機為 `http://localhost:3000` |
| `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` | 最高管理者首次登入用；雜湊以 `npm run hash-password` 產生 |
| `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` | Google Cloud Console 的 OAuth 用戶端（網頁應用程式），重新導向 URI 填 `{APP_URL}/api/auth/google/callback` |

## 登入方式

1. 最高管理者：登入頁展開「最高管理者首次設定」，以 .env 帳密登入，10 分鐘內綁定 Google 帳號；綁定後帳密登入停用，一律用 Google 登入。
2. 其他人員：用 Google 登入即送出申請，管理者在「使用者管理」核准後即可使用。
3. 最高管理者的 Google 帳號遺失時：執行 `npm run admin:unbind` 解除綁定，再以帳密登入重新綁定。

## 表單填寫流程

- 民眾掃描 QR code 開啟 `/f/{表單代號}`，先輸入身分證號再填寫；草稿只存在民眾裝置（12 小時），按「確認送出」才寫入資料庫。
- 「退回修改」後再送出沿用同一筆案件。相同有效裝置、同一身分與表單種類的未完成資料會優先續用；重複點擊、並行請求與回應遺失後重試不重複建檔。已完成紀錄保留，新次服務使用新編號；既有多份重複資料需人工比對，不自動合併。
- 民眾成功送出後可「列印 / 另存 PDF」，直接開啟瀏覽器列印介面、不另開預覽分頁。沿用原樣 A4 版型，只包含民眾已送出的內容、院所欄位留白；原裝置憑證有效期間內才能存取。
- 後台「協同完成」首次進入會勾選七種問卷與「預約健檢」，狀態勾選「待院所確認」。輸入不含數字時以姓名部分比對，含數字時依身分證號部分比對。可依表單種類、狀態篩選及點欄位標題排序。
- 列表「開啟」使用 modal，民眾內容預設展開；關閉時保留篩選、排序、頁碼、捲動與未套用的勾選。院所區自動儲存，關閉或列印前等待儲存完成，失敗時保留內容。列表及 modal 皆可直接開啟瀏覽器列印介面，所有狀態均可列印；「確認送出」仍會鎖定資料，「取消送出」後民眾才能再退回修改，重複資料仍可作廢。
- 後台載入、篩選、切頁、儲存設定及狀態操作會顯示齒輪 loading 遮罩；自動暫存只顯示局部提示。
- 前台首次送出、修改重送及退回修改共用伺服器 reCAPTCHA 驗證，檢查 token、動作、hostname 與分數，失敗保留答案。明確的伺服器讀取、驗證／送出及準備列印顯示共用齒輪 loading；IndexedDB 與背景狀態同步不顯示遮罩。共用實作與後續開發規則見 `AGENTS.md` 及 `docs/specs/2026-11-06-public-form-protection.md`。
- 院內平板可把後台「加入主畫面」（iPad 用 Safari、Android 用 Chrome，按分享→加入主畫面），之後從圖示開啟就沒有網址列。設定在 `public/admin.webmanifest` 與 `src/lib/admin-app.ts`，圖示原檔為 `public/brand/app-icon.svg`；民眾表單頁不提供安裝。
- 7 張表單（人類乳突病毒、子宮頸抹片、口腔黏膜檢查、胃幽門螺旋桿菌、糞便潛血、成人預防保健、勞工健康檢查）皆已電子化。表單欄位定義在 `src/lib/forms/defs/`，畫面在 `src/forms/`，各表單的設計見 `docs/specs/`。
- 勞工健康檢查網址為 `/f/labor`，新設定預設關閉，可至「表單管理」設定開放。手機填寫分六步，email 選填並共用；受僱日期、檢查日期及事業單位名稱放在作業經歷，目前工作先填、曾經工作只填最近一項。第六步為自費資料上傳同意書，同意與否必答，選同意才填期間、提供系統與獨立簽名；姓名、生日及證件號直接帶入，兩處機構名稱固定烏日澄清醫院。不同意仍可完成健檢。後台核對問卷後確認完成，不另加院所欄位或簽名；列印保留原 PDF 欄位位置與順序，同意者另附原樣同意書為第二頁，email 不新增到紙本。詳見 `docs/specs/2026-11-05-labor-upload-consent.md`。
- 「預約健檢」在表單管理中提供獨立 QR code、開關、預約日期範圍、休診日與通知收件人。民眾由 `/f/labor-appointment` 查詢與預約。院所在「協同完成」核對日期和套餐後確認預約。選在職套餐須先提交健檢表。部署及 Gmail 設定見 [預約健檢通知設定](docs/setup/appointment-notifications.md)。
- 日期、年月、單獨年份及年資採共用的緊湊欄位，輸入框與單位成組換行。日曆月為 1–12，年資剩餘月為 0–11，年份最多三位；前後台共用格式檢查，詳見 `docs/specs/2026-11-04-date-input-consistency.md`。
- 成人預防保健的同意簽名在院所區由服務對象本人簽；年齡、BMI、LDL、eGFR 自動計算（只顯示與列印，不存入資料庫）。本院檢驗參考值目前留空，之後可在 `src/lib/forms/defs/adult.ts` 的 `staffDefaults` 加入。

## 共用資料開發規範

`heal_care.submissions`（歷史名稱 `public.heal_submissions`）供其他應用程式共用，欄位與代碼請查閱 [共用資料對照表](docs/data/heal-submissions.md) 或 [JSON 字典](docs/data/heal-submissions.json)。兩份字典均以人工查閱為主：實體欄位只列欄位與中文名稱；七種表單的 `public_data`／`staff_data` 只列 key、中文名稱及有意義的選項對照，另附 `form_id`、`status` 的中文名稱。

新增、刪除、改名或改變欄位／代碼定義時，必須在同一變更同步更新字典及 [契約異動紀錄](docs/data/changes.md)，並說明歷史資料與相依應用程式的相容處理。人工註解維護於 `scripts/lib/submission-dictionary-metadata.ts`；更新後執行 `npm run dictionary:generate`、審閱兩份產物，再執行 `npm run dictionary:check`。`npm test` 也會先檢查字典同步。完整規定見 `AGENTS.md`。

## 表單 QR code

- 後台「表單管理」：設定每張表單的開放開關與期間，下載 QR code（PNG／SVG）與 A4 海報。
- QR code 內容是 `{APP_URL}/f/{表單代號}`。本機的 `localhost` 網址手機打不開，**正式列印請在部署、確定網域之後**；網域一換就要重印。
- `npm test` 會用 ZXing 與 jsQR 兩套解碼器實際掃描 7 張表單的 QR code（多種尺寸、長短網址），修改 QR 樣式後請務必跑過。

## 勞工健檢列印底稿

`public/forms/labor-template.svg` 由本機原 PDF 轉成字型輪廓向量稿，僅移除紅色填寫提示框；`src/forms/labor/print-layout.ts` 保留原稿 48 個填入欄位與 70 個方框的座標。正式列印由 `LaborPrint` 在同一座標系套印答案，不受手機填寫順序調整影響。

需更新原稿時，先備妥 `預防保健表單電子檔/勞工健康檢查.pdf`，在 Python 環境安裝 `PyMuPDF==1.26.7`，從專案根目錄執行 `python scripts/generate-labor-template.py`，再檢查列印對位。原 PDF 與暫存資料不納入 Git，產生的 SVG 與座標檔需一併提交。

資料上傳同意書底稿由 `scripts/generate-labor-upload-template.py` 讀取規格所列的指定 PDF，產生 `public/forms/labor-upload-template.svg` 與 `src/forms/labor/upload-print-layout.ts`；原稿紅色正文完整保留。同意書使用既有 JSONB 的 `labor.upload*` 欄位，無須新增 migration。舊案缺少同意選擇時顯示尚未填寫，不推定為不同意；民眾再次修改送出時須完成新選擇，簽名需重簽。

目前本機與 Supabase 使用 `drizzle/heal-care/0000_heal_care_baseline.sql`，一次建立九張表與初始設定。原 `drizzle/0000`–`0008` 及 metadata 保留為舊庫歷史，不再用於新結構；不要混用兩套 journal。維護指令以 `MIGRATION_DATABASE_URL` 連線，DDL 以 `SET LOCAL ROLE healthcare` 執行，確保新增物件歸 `healthcare`；`npm run build` 不會套用 migration。搬移前整庫備份在 `.local/db-backups/2026-11-16-heal-care/`，核對紀錄在 `.local/database/copy-main.json`、`copy-test.json` 與 `verification.json`。

本次正式站部署來自已驗證的工作區版本，Git 異動尚未提交；後續 Git 部署須包含本次程式及文件，不能重新部署使用舊 `public.heal_*` 的版本。
