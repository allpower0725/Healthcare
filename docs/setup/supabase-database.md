# Supabase 資料庫設定與切換紀錄

2026-11-16 已完成雲端搬移及正式站部署。以雲端原有資料為來源，沒有用本機測試資料覆蓋。

## 最終配置

| 項目 | 設定 |
|---|---|
| Supabase 專案／project ref | `wjcch`／`tbulauezaixdjzdcqsem`，東京 |
| PostgreSQL | 17.11；託管實體資料庫保留 `postgres` |
| 應用資料 | `heal_care`，九表名稱與本機相同，owner 均為 `healthcare` |
| Migration 記錄 | `db_migrations.healthcare`，owner：`db_owner`；與本機使用同一 baseline SHA-256 |
| 舊資料封存 | `heal_care_legacy_20261116`，保留原九表與舊名稱，owner：`db_owner`，禁止業務寫入 |
| 正式站 | [wjcch-healthcare.vercel.app](https://wjcch-healthcare.vercel.app)，Production `READY` |
| Deployment | `dpl_D9CggPr73MrtusNQwnfCUaS2ceWM`，東京 `hnd1`，建置約 44 秒 |
| 通知排程 | `wjcch-appointment-notices-hourly`，`0 * * * *`，已恢復啟用 |

Supabase 不提供真正 superuser，也不能直接照搬本機 instance／database 的命名。保留其實體資料庫 `postgres`、既有管理角色與平台 schema。`db_owner` 是自訂的本專案維護角色，**不是平台 superuser，也不是託管 `postgres` 的同義帳號**；平台層管理仍使用 Supabase 提供的 `postgres`。參考 [Supabase 管理權限限制](https://supabase.com/docs/guides/database/postgres/roles-superuser)。

| 帳號 | 用途與權限 |
|---|---|
| `postgres` | 原有平台管理角色，保留 Supabase 託管權限；對新應用 schema／表／sequence 明確授權，不交給正式應用程式。原有密碼未變更。 |
| `db_owner` | 本專案維護帳號；`CREATEDB`、`CREATEROLE`，可建立 schema，擁有管理紀錄及封存 schema／表，可明確 `SET ROLE healthcare` 維護應用物件。沒有 `SUPERUSER`／`BYPASSRLS`，不繼承 `healthcare` 權限，不管理平台內部角色。 |
| `healthcare` | 正式站連線帳號；擁有 `heal_care`、九表與 identity sequence，可管理該 schema 內物件。無 `SUPERUSER`、`CREATEDB`、`CREATEROLE`、`BYPASSRLS`，不能讀管理紀錄／封存資料、在 `public` 建表或切成 `db_owner`。 |
| `his_user` | 依使用者明確要求停用：`NOLOGIN`、撤銷舊表／sequence／資料庫明確授權，原問卷 RLS policy 移除。沒有新 schema 權限，不建立舊名相容 view。帳號保留供稽核，日後整合須另訂最小權限。 |

這些是資料庫帳號，與後台 Google 登入、人員角色及 `ADMIN_USERNAME` 不同；後台人員、綁定與既有資料未重設。

## 密碼與 TLS 連線

雲端重新產生兩組獨立的 32 bytes 隨機密碼，與本機分開，僅存在 Git 忽略的本機維護目錄：

- `.local/cloud-migrations/2026-11-16-heal-care/secrets/db_owner_password`
- `.local/cloud-migrations/2026-11-16-heal-care/secrets/healthcare_password`
- `.local/cloud-migrations/2026-11-16-heal-care/connections.env`
- `.local/cloud-migrations/2026-11-16-heal-care/supabase-ca.crt`（官方公開 CA，不是私鑰）

| 用途 | Host | Port | Database | Pooler username |
|---|---|---|---|---|
| DBeaver／維護／migration | `aws-0-ap-northeast-1.pooler.supabase.com` | `5432` | `postgres` | `db_owner.tbulauezaixdjzdcqsem` |
| 正式 serverless runtime | 同上 | `6543` | `postgres` | `healthcare.tbulauezaixdjzdcqsem` |
| 應用帳號的持續連線檢查 | 同上 | `5432` | `postgres` | `healthcare.tbulauezaixdjzdcqsem` |

使用 `verify-full` 及官方 CA 驗證 TLS 憑證與 hostname。CA 從 Supabase 專案 Database → Settings → SSL configuration 的下載入口取得；下載來源為 [Supabase 官方 CA](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt)，本次 SHA-256 為 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`。不要設定 `rejectUnauthorized: false` 或略過憑證檢查。參考 [官方連線及憑證設定](https://supabase.com/docs/guides/database/psql)。

Vercel **Production** 的 `DATABASE_URL` 已改為 `healthcare` 交易池連線，保存為 Secret；新增 `DATABASE_SSL_CA` 公開 CA 設定。`prepare: false` 沿用交易池要求。沒有把 `db_owner` 密碼放進正式 runtime，也未將本機 `.env` 改成雲端連線。Google、reCAPTCHA、Gmail、預約與排程密鑰保持原值。Preview／Development 未取得正式資料庫憑證。

## 搬移與驗證

1. 盤點正式部署、九表、RLS、`his_user` 權限、既有連線與 Cron；先確認停用舊整合的使用者決定。
2. 以 SCRAM verifier 建立兩組雲端角色，不在 SQL／日誌傳送明文密碼。暫時給 `db_owner` 九表 SELECT policy 及舊 journal／sequence 讀取權，用於備份；這些暫時授權在切換交易內撤銷。
3. 透過 TLS、repeatable-read snapshot 執行 `pg_dump -Fc`，選取原九張表與舊 Drizzle journal，下載至 `.local/db-backups/2026-11-16-supabase-heal-care/database.dump`。這是**應用九表與 journal 的備份，不是 Supabase auth／storage／Vault 等整個平台的備份**。
4. 在隔離的本機驗證庫實際還原備份；九表資料雜湊、欄位、索引與限制語意均一致，驗證庫隨後移除。因不同環境的排序規則會影響列順序，雜湊統一用 `COLLATE "C"` 排序。CHECK 在 dump／restore 後的多餘括號表示可不同，還原檢查標準化括號；正式雲端新舊結構比對則完全一致。
5. 使用 `drizzle/heal-care/0000_heal_care_baseline.sql` 與共用 runner 在新 schema 建九表。管理帳號只維護 journal，DDL 以 `SET LOCAL ROLE healthcare` 執行，不修改舊 migration。
6. 準備並由 Supabase 工具執行確認後，以單一交易暫停通知排程、鎖住新舊九表、比對來源與備份雜湊、複製所有欄位、保留 identity sequence、再次核對九表雜湊。來源若在備份後變動或任一核對失敗，整個交易回復。
7. 同一交易停用 `his_user`、移除舊整合政策及備份暫時授權、為舊表加防寫入 trigger，再移至私有封存 schema。新 `heal_care` 不含相容 view；`public` 不再有應用 `heal_*` 表。
8. 用真實 `healthcare` 連線核對結構、所有資料雜湊、RLS、schema 內 DDL/DML、拒絕跨 schema／角色提升的路徑；驗證探測全部 rollback，不在主庫送出測試問卷。
9. 部署已測試的工作區來源檔案至 Vercel Production；排除 `.env*`、`.local`、備份及維護密碼。正式網址確認 `/login`、`/f/labor`、`/f/labor-appointment` 正常顯示、瀏覽器無警告／錯誤，新 deployment 的 error／fatal 日誌無紀錄，然後恢復原每小時 Cron。

| 資料表 | 搬移時保留筆數 |
|---|---:|
| `users` | 5 |
| `sessions` | 1 |
| `form_settings` | 7 |
| `submissions` | 123 |
| `submission_events` | 275 |
| `appointment_settings` | 1 |
| `appointments` | 7 |
| `appointment_notices` | 3 |
| `appointment_attempt_limits` | 6 |

`submission_events_id_seq` 保留 `last_value=275`、`is_called=true`。既有欄位、JSONB key、選項、表單及狀態代號、答案、裝置憑證、綁定、session 與預約通知紀錄保持相同值。

337 項自動測試、型別檢查、字典同步與本機／雲端正式建置通過。健康檢查無異常；安全 Advisor 只有 18 筆 INFO「RLS enabled no policy」，分別對應新九表與封存九表，符合這裡以 owner 連線、拒絕公開角色的設計，沒有為消除提示新增公開 policy。參考 [該提示的官方說明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。

## 操作檔案與日後維護

下列工具對單一已知專案有端點檢查；不是一般部署的自動步驟，**已完成的環境不要重跑初始化、備份覆寫或切換**：

- `scripts/db-cloud-prepare.ts`：準備獨立密碼、連線與角色 SQL，不連線。
- `scripts/db-cloud-backup.ts`：備份切換前舊 `public.heal_*` 結構；切換後舊表已封存，不能直接再用它備份新系統。
- `scripts/db-cloud-migrate.ts`：透過雲端專用維護檔套用新 migration，不載入本機 `.env`。
- `scripts/db-cloud-cutover-prepare.ts`：依備份清單產生原子切換與上線前回復 SQL；不直接執行。
- `scripts/db-cloud-verify.ts`：驗證角色與結構；`--after` 比對搬移時快照。正式站有後續新增／修改後，不能再要求當前資料雜湊與舊快照相同。

證據均在 `.local/cloud-migrations/2026-11-16-heal-care/`：`before.json`、`after.json`、`restore-verification.json`、`provision-verification.json`、`cutover.sql`、`rollback-before-release.sql`。含資料的 dump、連線檔與 SQL verifier 不納入 Git。資料字典保留原檔名與 JSON 結構，見 [契約異動](../data/changes.md)。

日後修改 schema：產生並審閱新的 `drizzle/heal-care/` migration，以本機與專用測試庫驗證，再用雲端維護連線套用。已套用 baseline 不可改寫。維護帳號若須直接查應用資料，可在維護交易中明確 `SET LOCAL ROLE healthcare`；不要將管理憑證交給 runtime。新 schema 的平台管理授權也以 `healthcare` 的 default privileges 維護。

## 原始碼與回復注意

本次正式部署來自**已測試的工作區檔案**，Git HEAD `79fff3c` 加上未提交的本次異動；不是宣稱該 commit 已包含新 schema。原始碼尚未 commit／push。後續 Git 部署必須包含本次程式與文件，不能以舊 `public.heal_*` 程式重新部署到現在的正式環境。

`rollback-before-release.sql` **只供新站尚未接受寫入前**、部署失敗時回復舊表位置及舊 deployment 使用，`his_user` 仍保持停用。現在新站已上線，不可直接執行它，也不能只將 Vercel 指回舊版而忽略 schema 差異。若要回復，先停止新寫入、備份當前新庫，將上線後的新資料與狀態完整回搬或提供經審閱的相容處理，再切回程式；不得用舊快照覆蓋後續資料。

封存資料是搬移時快照，不同步新表；不提供應用帳號存取，也不要讓任何整合繼續寫入。是否移除封存 schema、舊 Drizzle journal 或舊本機資料卷，另依確認的保留期限處理，本次沒有刪除。

### SQL Editor 清理封存 schema 的角色切換

封存 schema 的 owner 是 `db_owner`。SQL Editor 預設的 `postgres` 不自動繼承該角色的 owner 權限，直接 `DROP SCHEMA` 會出現 `must be owner of schema`。先在 SQL Editor 選擇 `postgres` 角色，確認已保留驗證過的備份、核對沒有新增外部相依，再將以下整段一起執行：

```sql
BEGIN;
SET LOCAL ROLE db_owner;
DROP SCHEMA heal_care_legacy_20261116 CASCADE;
COMMIT;
```

`SET LOCAL ROLE` 只在此交易內生效，交易結束後自動回到原角色，不須放寬全域角色權限。此操作會永久移除封存九表；上方是清理指引，不代表已執行清理。若交易報錯，先執行 `ROLLBACK;`，不要在失敗的交易內繼續操作。
