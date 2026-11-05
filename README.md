# 預防保健表單後台

烏日澄清醫院預防保健表單的管理後台（Next.js 16 + PostgreSQL）。設計文件在 `docs/specs/`。

`預防保健表單電子檔/` 是表單原始檔，只放在本機，不進 Git。

## 本機開發

需要 Node.js 24、Docker。

```bash
npm install
docker compose up -d db        # PostgreSQL 17，對外 port 5433（主庫 wjcch、測試庫 wjcch_test）
cp .env.example .env           # 填入各項設定，見下方
npm run db:migrate             # 建立資料表
npm run dev                    # http://localhost:3000
```

### 本機資料庫命名

- 主資料庫：`wjcch`；自動測試資料庫：`wjcch_test`。
- Schema 維持 `public`，五張應用資料表維持 `heal_` 前綴，與 Supabase 相同。
- Supabase 專案名稱是 `wjcch`，雲端實際資料庫名稱仍為 `postgres`；部署時使用雲端提供的連線字串。
- 本機連線為 `localhost:5433`，帳號與密碼沿用 `healthcare`。Docker 容器 `healthcare-db` 及既有資料卷沿用原設定。
- DBeaver 的資料庫欄位填 `wjcch`，展開 `public` 即可查看資料表。

本機已於 2026-11-04 將 `healthcare`、`healthcare_test` 原地更名，保留資料與 migration 紀錄。更名前的完整備份與資料核對清單在 `.local/db-backups/2026-11-04-database-rename/`，不納入 Git。

其他電腦若沿用舊資料卷，需先備份兩個資料庫、關閉應用程式與資料庫管理工具的連線，再執行一次：

```bash
docker exec healthcare-db psql -U healthcare -d postgres -X -v ON_ERROR_STOP=1 --single-transaction -c "ALTER DATABASE healthcare RENAME TO wjcch; ALTER DATABASE healthcare_test RENAME TO wjcch_test;"
```

接著將該電腦 `.env` 的 `DATABASE_URL` 資料庫路徑改為 `/wjcch`，若另設 `TEST_DATABASE_URL` 則改為 `/wjcch_test`，執行 `docker compose up -d db` 並重新啟動應用程式。`POSTGRES_DB` 與初始化 SQL 只在空資料卷首次建立時生效，單改設定不會替既有資料庫更名；保留原資料卷即可沿用資料。

### .env

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | 本機連到 `wjcch`（見 `.env.example`）；上線改填 Supabase 連線字串 |
| `TEST_DATABASE_URL` | 測試指令的選用環境變數，預設連到本機 `wjcch_test`；覆寫時須指向專用測試庫 |
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
- 後台「協同完成」：首次進入預設七種表單全選、狀態勾選「待院所確認」。輸入不含數字時以姓名部分比對，含數字時依身分證號部分比對；可依表單種類、狀態篩選及點欄位標題排序。
- 列表「開啟」使用 modal，民眾內容預設展開；關閉時保留篩選、排序、頁碼、捲動與未套用的勾選。院所區自動儲存，關閉或列印前等待儲存完成，失敗時保留內容。列表及 modal 皆可直接開啟瀏覽器列印介面，所有狀態均可列印；「確認送出」仍會鎖定資料，「取消送出」後民眾才能再退回修改，重複資料仍可作廢。
- 後台載入、篩選、切頁、儲存設定及狀態操作會顯示齒輪 loading 遮罩；自動暫存只顯示局部提示。
- 院內平板可把後台「加入主畫面」（iPad 用 Safari、Android 用 Chrome，按分享→加入主畫面），之後從圖示開啟就沒有網址列。設定在 `public/admin.webmanifest` 與 `src/lib/admin-app.ts`，圖示原檔為 `public/brand/app-icon.svg`；民眾表單頁不提供安裝。
- 7 張表單（人類乳突病毒、子宮頸抹片、口腔黏膜檢查、胃幽門螺旋桿菌、糞便潛血、成人預防保健、勞工健康檢查）皆已電子化。表單欄位定義在 `src/lib/forms/defs/`，畫面在 `src/forms/`，各表單的設計見 `docs/specs/`。
- 勞工健康檢查網址為 `/f/labor`，新設定預設關閉，可至「表單管理」設定開放。手機填寫分六步，email 選填並共用；受僱日期、檢查日期及事業單位名稱放在作業經歷，目前工作先填、曾經工作只填最近一項。第六步為自費資料上傳同意書，同意與否必答，選同意才填期間、提供系統與獨立簽名；姓名、生日及證件號直接帶入，兩處機構名稱固定烏日澄清醫院。不同意仍可完成健檢。後台核對問卷後確認完成，不另加院所欄位或簽名；列印保留原 PDF 欄位位置與順序，同意者另附原樣同意書為第二頁，email 不新增到紙本。詳見 `docs/specs/2026-11-05-labor-upload-consent.md`。
- 日期、年月、單獨年份及年資採共用的緊湊欄位，輸入框與單位成組換行。日曆月為 1–12，年資剩餘月為 0–11，年份最多三位；前後台共用格式檢查，詳見 `docs/specs/2026-11-04-date-input-consistency.md`。
- 成人預防保健的同意簽名在院所區由服務對象本人簽；年齡、BMI、LDL、eGFR 自動計算（只顯示與列印，不存入資料庫）。本院檢驗參考值目前留空，之後可在 `src/lib/forms/defs/adult.ts` 的 `staffDefaults` 加入。

## 共用資料開發規範

`heal_submissions` 供其他應用程式共用，欄位與代碼請查閱 [共用資料對照表](docs/data/heal-submissions.md) 或 [JSON 字典](docs/data/heal-submissions.json)。兩份字典均以人工查閱為主：實體欄位只列欄位與中文名稱；七種表單的 `public_data`／`staff_data` 只列 key、中文名稱及有意義的選項對照，另附 `form_id`、`status` 的中文名稱。

新增、刪除、改名或改變欄位／代碼定義時，必須在同一變更同步更新字典及 [契約異動紀錄](docs/data/changes.md)，並說明歷史資料與相依應用程式的相容處理。人工註解維護於 `scripts/lib/submission-dictionary-metadata.ts`；更新後執行 `npm run dictionary:generate`、審閱兩份產物，再執行 `npm run dictionary:check`。`npm test` 也會先檢查字典同步。完整規定見 `AGENTS.md`。

## 表單 QR code

- 後台「表單管理」：設定每張表單的開放開關與期間，下載 QR code（PNG／SVG）與 A4 海報。
- QR code 內容是 `{APP_URL}/f/{表單代號}`。本機的 `localhost` 網址手機打不開，**正式列印請在部署、確定網域之後**；網域一換就要重印。
- `npm test` 會用 ZXing 與 jsQR 兩套解碼器實際掃描 7 張表單的 QR code（多種尺寸、長短網址），修改 QR 樣式後請務必跑過。

## 勞工健檢列印底稿

`public/forms/labor-template.svg` 由本機原 PDF 轉成字型輪廓向量稿，僅移除紅色填寫提示框；`src/forms/labor/print-layout.ts` 保留原稿 48 個填入欄位與 70 個方框的座標。正式列印由 `LaborPrint` 在同一座標系套印答案，不受手機填寫順序調整影響。

需更新原稿時，先備妥 `預防保健表單電子檔/勞工健康檢查.pdf`，在 Python 環境安裝 `PyMuPDF==1.26.7`，從專案根目錄執行 `python scripts/generate-labor-template.py`，再檢查列印對位。原 PDF 與暫存資料不納入 Git，產生的 SVG 與座標檔需一併提交。

資料上傳同意書底稿由 `scripts/generate-labor-upload-template.py` 讀取規格所列的指定 PDF，產生 `public/forms/labor-upload-template.svg` 與 `src/forms/labor/upload-print-layout.ts`；原稿紅色正文完整保留。同意書使用既有 JSONB 的 `labor.upload*` 欄位，無須新增 migration。舊案缺少同意選擇時顯示尚未填寫，不推定為不同意；民眾再次修改送出時須完成新選擇，簽名需重簽。

新增表單的 migration 為 `drizzle/0006_add_labor_form.sql`。本機與 Supabase 專案 `tbulauezaixdjzdcqsem` 均已於 2026-11-04 套用，雲端 Drizzle 紀錄已同步。其他環境部署前，應先以該環境的 `DATABASE_URL` 執行 `npm run db:migrate`，再部署對應程式；`npm run build` 本身不會套用資料庫 migration。本次本機 migration 前的兩庫完整備份在 `.local/db-backups/2026-11-04-add-labor-form/`；雲端套用 SQL、前後資料雜湊與儲存驗證紀錄在 `.local/cloud-migrations/2026-11-04-add-labor-form/`。

## 指令

| 指令 | 用途 |
|---|---|
| `npm test` | 自動測試（預設使用本機的 `wjcch_test` 資料庫） |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run dictionary:generate` | 依實際定義與中文註解產生 Markdown／JSON 共用資料字典 |
| `npm run dictionary:check` | 檢查 key、選項與字典產物是否完整同步；不連線資料庫 |
| `npm run db:generate` | 修改 `src/db/schema.ts` 後產生 migration |
| `npm run db:migrate` | 套用 migration |
