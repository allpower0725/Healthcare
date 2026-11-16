# 本機 PostgreSQL 設定與資料搬移

2026-11-16 已完成本機重整；經使用者測試確認後，Supabase 亦完成切換，見 [Supabase 設定](supabase-database.md)。

## 名稱與權限

| 項目 | 設定 |
|---|---|
| Instance／容器／Compose project | `wjcch`（PostgreSQL 17） |
| 本機端點 | `localhost:5432`，只綁定 `127.0.0.1` |
| 主資料庫 | `wjcch_db`，owner：`db_owner` |
| 自動測試庫 | `wjcch_db_test`，owner：`db_owner` |
| 應用 schema | `heal_care`，owner：`healthcare` |
| Migration 記錄 | `db_migrations.healthcare`，owner：`db_owner` |
| 新資料卷 | `wjcch_wjcch-data` |

PostgreSQL 的 instance 是服務／cluster，沒有 SQL 層的 instance 更名指令；這裡以 Docker 容器及 Compose project 命名。使用 `5432` 前先確認 Windows 與 Docker 沒有其他服務監聽此埠。

| 帳號 | 用途與範圍 |
|---|---|
| `db_owner` | 本機 cluster 超級使用者，管理資料庫、帳號、備份與 migration。不是應用程式登入帳號。 |
| `healthcare` | 可連線主庫／測試庫；擁有各庫的 `heal_care`、所有表與 sequence，可讀寫及修改 schema 內物件。無 `SUPERUSER`、`CREATEDB`、`CREATEROLE`、`REPLICATION`、`BYPASSRLS`，沒有管理角色會員資格。 |

撤銷 `PUBLIC` 對 `public` schema 的權限及預設資料庫連線／暫存權限，只授予 `healthcare` 對兩個應用資料庫的 `CONNECT`。它不能在其他 schema 建表、建立其他 schema、讀取 migration 記錄或連線維護庫 `postgres`。系統 catalog 的一般 metadata 仍依 PostgreSQL 標準可見；這不是把整個 instance 的系統資訊隱藏。

九張表都啟用 RLS、無公開 policy。`healthcare` 以**自身資料表 owner** 的身分讀寫；不授予全域 `BYPASSRLS`，也不設定 `FORCE ROW LEVEL SECURITY`。Schema 的 `GRANT ALL` 不等於資料表 owner，因此 migration 透過管理連線維護 journal，再於交易中 `SET LOCAL ROLE healthcare` 執行 DDL，讓目前及未來新增物件維持正確 owner。管理紀錄另放 schema，`heal_care` 維持九張應用資料表。

這符合目前要求的「schema 最高權限」；表示應用連線也能刪除自己的資料表。將來若要再降低 runtime 權限，須另外拆分 owner 與僅可讀寫的第三個帳號。

## 九張表名稱對照

| 舊名稱（來源 `wjcch.public`） | 新名稱（目標 `wjcch_db.heal_care`） |
|---|---|
| `heal_users` | `users` |
| `heal_sessions` | `sessions` |
| `heal_form_settings` | `form_settings` |
| `heal_submissions` | `submissions` |
| `heal_submission_events` | `submission_events` |
| `heal_appointment_settings` | `appointment_settings` |
| `heal_appointments` | `appointments` |
| `heal_appointment_notices` | `appointment_notices` |
| `heal_appointment_attempt_limits` | `appointment_attempt_limits` |

欄位名稱、型別、預設值、必填、JSONB key、表單代號、狀態及資料值不變。索引、限制及 identity sequence 名稱也移除 `heal_`，語意保持相同。`submission_events.id` 的 sequence 保存既有 `last_value`／`is_called`，不僅用最大 id 推算，以免重用已消耗的序號。

## 從舊本機資料庫搬移

此專案目前已完成以下流程，不要再次產生密碼或重複搬移。其他有相同舊庫的電腦才依序執行。

1. 先關閉會寫入舊主庫／測試庫的程式，資料庫管理工具也不要編輯資料。保留舊容器 `healthcare-db`、原資料卷與 `5433`；不要執行 `docker compose down -v` 或清除 volume。程式會在複製期間對來源九表取得 SHARE lock。
2. `npm install`，保留原 `.env`。執行 `npm run db:local:configure`。產生兩組各 32 bytes 隨機密碼，存於 `.local/database/secrets/db_owner_password`、`healthcare_password`，連線檔為 `.local/database/connections.env`。舊本機連線保存在 `.local/database/source.env`；這些檔案均被 Git 忽略，輸出不顯示密碼，不變更 Google、reCAPTCHA、後台管理者或其他密鑰。
3. `npm run db:up`，再以 `docker compose ps` 確認新 `wjcch` 正常。新資料卷首次啟動才會執行 `docker/init-databases.sh`，建立兩組角色、兩個資料庫與 schema。改密碼檔或 `POSTGRES_DB` 不會修改已初始化資料卷；日後改密碼必須另以管理連線更新角色並同步本機檔案。
4. 執行 `npm run db:migrate -- --local` 與 `npm run db:migrate -- --local --test`。只使用 `drizzle/heal-care/` 的新 baseline，一次建立完整九表及預設關閉的七份表單／一份預約設定，不重放或改寫舊 migration。
5. 執行 `npm run db:local:copy`，再執行 `npm run db:local:copy -- --test`。分別以同一來源 snapshot 做整庫 `pg_dump -Fc` 備份與複製；備份先成功才改目標。程式只接受舊 `localhost:5433/wjcch`／`wjcch_test` 與新 `localhost:5432/wjcch_db`／`wjcch_db_test`。先核對欄位、限制及索引，目標必須是剛建立的初始設定，搬移保留所有原設定值。資料以 PostgreSQL 轉型，避免 JS bigint／時間精度損失。逐表比較筆數、完整 JSONB 資料的 SHA-256；不一致則回復目標資料交易。
6. 執行 `npm run db:local:verify`。實際以兩種帳號驗證 schema／table／sequence owner、schema 內 DDL/DML、RLS 及越權拒絕路徑，再次核對舊主庫與新主庫的結構及資料。驗證探測的物件與角色全部 rollback。
7. 執行 `npm run db:local:activate`，只將 `DATABASE_URL` 與 `TEST_DATABASE_URL` 寫入 `.env`，管理連線留在 `.local/database/connections.env`；切換前 `.env` 備份在 `.local/database/env-before-activation`。若較高優先順序的 `.env.local` 等檔案有資料庫覆寫，工具會停止，須先整理，不能默默連回舊庫。
8. 執行 `npm run dictionary:generate`、審閱 Markdown／JSON，再執行 `npm run dictionary:check`、`npm run typecheck`、`npm test` 與 `npm run build`。`npm test` **會清除新測試庫的測試資料**，不改新主庫或舊兩庫。確認後執行 `npm run dev`，檢查登入、既有問卷及預約。DBeaver 另外建立新連線，不把舊連線誤認成新庫。

舊主庫在搬移時共有 1 位人員、7 份表單設定、1 個 session、8 份問卷、20 筆問卷事件、1 份預約設定、6 筆預約、0 筆寄送紀錄及 9 筆限流紀錄；搬移時全部一致。核對紀錄不包含姓名、證件或答案。

| 本機紀錄 | 內容 |
|---|---|
| `.local/db-backups/2026-11-16-heal-care/main/database.dump` | 舊主庫完整備份 |
| `.local/db-backups/2026-11-16-heal-care/test/database.dump` | 舊測試庫完整備份 |
| `.local/database/copy-main.json`、`copy-test.json` | 各表筆數、雜湊、來源／目標、sequence |
| `.local/database/verification.json` | 最近一次權限及資料核對結果 |
| `.local/database/env-before-activation` | 切換前設定；包含原有密鑰，保持本機私密 |

資料庫 dump 與連線檔含敏感資料，僅保存在本機；不要上傳到 Git 或貼到對話。密碼檔可由本機編輯器讀取，DBeaver 的 Password 填對應角色密碼，勿將連線字串輸出到日誌。

## 沒有舊庫的全新安裝

依序執行 `npm install`、將 `.env.example` 複製成 `.env` 並填其他設定、`npm run db:local:configure`、`npm run db:up`、上述兩個 `db:migrate -- --local` 命令。沒有 `.local/database/source.env` 時，使用 `npm run db:local:verify -- --fresh` 與 `npm run db:local:activate -- --fresh`，再執行檢查與啟動。已有舊本機來源時不能使用 `--fresh` 跳過資料保留核對。

## 日常維護及 migration

- 應用的 `.env` 只存 `DATABASE_URL` 與 `TEST_DATABASE_URL`（`healthcare`）；管理連線 `MIGRATION_DATABASE_URL`／`TEST_MIGRATION_DATABASE_URL`（`db_owner`）只存 `.local/database/connections.env`，由維護與測試指令在端點吻合時讀取，不載入 Next runtime。其他環境可在維護指令行程提供管理變數，不使用硬編碼預設密碼；測試端點與資料庫名稱均有限制以免誤清主庫。
- 修改 `src/db/schema.ts` 後執行 `npm run db:generate`，審閱 `drizzle/heal-care/` 的新增 SQL，再執行 `npm run db:migrate`。`db:local:*` 是這台電腦的建置／搬移工具，不用於雲端。帶 `--local` 時明確使用本機維護檔；一般 `db:migrate` 只有在應用連線與維護檔完全吻合時才自動讀取本機管理連線。
- 已套用的 SQL 不可修改；runner 會檢查 journal 的順序與 SHA-256，拒絕被改寫或混用的歷史，以交易鎖防止並行 migration。
- 原 `drizzle/0000`–`0008`、原 metadata 及 `docker/init-test-db.sql` 保留作舊環境歷史；舊容器仍掛載初始化 SQL，不能刪除該檔。新設定不使用它們。
- Linux shell 初始化檔固定 LF，見 `.gitattributes`；Windows checkout 不能將它改成 CRLF。

## 回復與共用讀取端

切換前舊庫未被更名、刪除或改表，原 migration 記錄也保留。若新庫尚無新增寫入，可停下新程式，恢復 `.local/database/env-before-activation` 到 `.env`，並以對應舊版程式重新啟動，連回 `5433`。**這版程式使用 `heal_care`，不能只改 URL 就直接讀取舊 `public.heal_*`。** 新庫已有新寫入時先備份、比對並安排回搬，不能直接回復成舊快照而丟失新增資料。不要自動清除新／舊資料卷。

共用應用程式須在切換時一起改用新連線與 `heal_care.<table>`；只改 `search_path` 無法處理仍寫死 `heal_` 的 SQL。不建立舊名相容 view，避免留下另一個寫入入口或讓 `heal_care` 多出應用物件。舊庫只是快照，不會收到新庫後續寫入；仍讀舊庫的工具只能看到搬移時資料，不能繼續向兩邊分別寫入。答案格式、JSON 字典結構與既有檔名連結不變，見 [契約異動](../data/changes.md)。

## 驗證紀錄

2026-11-16 已完成兩庫搬移與權限驗證；335 項測試、字典同步檢查、型別檢查及正式建置通過。預約確認的列鎖改用資料表別名，保留原鎖定語意並符合自訂 schema 的 PostgreSQL 語法。

瀏覽器唯讀確認 `/login`、`/f/labor` 與 `/f/labor-appointment` 可載入，後兩者經應用連線讀取新 schema 的設定。正式模式的本機畫面因沿用既有未設定的 reCAPTCHA 金鑰而顯示暫不可用，未試送主庫資料，也未變更防護設定。公開操作的有效／無效驗證、答案保留、重複送出與並行操作仍由專用測試庫的測試覆蓋。

## Supabase 已完成切換

Supabase 專案 `wjcch` 的實體資料庫仍為託管的 `postgres`，九張應用表已使用相同 `heal_care` schema 與不帶 `heal_` 的名稱，正式站使用獨立雲端 `healthcare` 帳密。平台管理權限、`db_owner` 維護角色、停用的舊整合、封存與回復見 [Supabase 設定](supabase-database.md)。本機與雲端密碼、資料及連線分開；不要在本機 `.env` 混入雲端連線或直接執行本機 superuser 初始化腳本到雲端。

官方參考：[PostgreSQL schema 與權限](https://www.postgresql.org/docs/17/ddl-schemas.html)、[角色屬性](https://www.postgresql.org/docs/17/role-attributes.html)、[RLS owner 行為](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)、[Supabase 角色管理](https://supabase.com/docs/guides/database/postgres/roles)。
