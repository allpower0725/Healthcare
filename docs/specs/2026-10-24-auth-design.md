# 管理後台：整體架構與身分認證（第 3 項）設計

日期：2026-10-24　狀態：已確認

## 開發順序

| 階段 | 內容 |
|---|---|
| 0 基礎建設 | Next.js 專案、本機 Postgres、Drizzle、後台版面與視覺 token（與第 3 項一起做） |
| 3 身分認證 | 本文件 |
| 4 | QR code 產生、表單開放填寫時間 |
| 5 | 民眾送出存入資料庫、院所填寫區移到後台、送出鎖定與取消送出 |
| 6 | 協同完成列表（排序、複合篩選） |

每一階段開工前先確認開發方向與資料表 schema。

## 整體技術

- Next.js 16（App Router、TypeScript），專案根目錄即 repo 根目錄。
- PostgreSQL：本機以 Docker 執行（`docker-compose.yml`，對外 port 5433，避開已占用的 5432）；上線改連 Supabase，只換 `DATABASE_URL`。
- Drizzle ORM + postgres.js（`prepare: false`，相容 Supabase 交易模式連線池）；migration 由 drizzle-kit 產生於 `drizzle/`。
- 樣式：純 CSS + CSS 變數，參考表單色票（主色 `#23786a`、院所區 `#8a5300`、圓角卡片、同一組字型）在後台自己的樣式檔重新定義，不引用 `預防保健表單電子檔/`。
- `預防保健表單電子檔/` 不進 Git（`.gitignore`）；需要的圖檔（院徽、主題插圖）複製到 `public/`。

## 身分認證

### 實作方式

自寫：arctic（Google OAuth 用戶端，含 PKCE）＋資料庫 session，不使用 Auth.js／Better Auth。

### 最高管理者

1. 登入頁有「使用 Google 登入」與收合的「管理者帳密登入」。
2. 帳號比對 `ADMIN_USERNAME`，密碼比對 `ADMIN_PASSWORD_HASH`（scrypt；`npm run hash-password` 產生；格式不含 `$`，避免 .env 變數展開）。
3. 帳密正確且未綁定 Google → 建立（或沿用）`role = superadmin` 的使用者，發給 `purpose = bind_google` 的暫時 session（10 分鐘），只能進入 `/bind-google`。
4. 完成 Google 授權 → 寫入 `google_sub`、`email`、`name`、`avatar_url`，作廢暫時 session，改發正式 session。
   - 該 Google 帳號已是其他使用者：若對方為 `pending`／`rejected`，刪除該筆後綁定；若為 `active`／`disabled`，拒絕綁定。
5. 綁定後帳密登入永久停用（提示改用 Google 登入）。
6. Google 帳號遺失時：在伺服器執行 `npm run admin:unbind` 清除綁定並登出所有 session，帳密登入恢復。

### 其他使用者

1. 「使用 Google 登入」→ 系統沒有此 Google 帳號 → 以 Google 的名稱、Email、頭像建立 `pending` 使用者，不需填寫其他資料，顯示「已送出申請，待管理者審核」。
2. `pending`／`rejected`／`disabled` 使用者登入只看到狀態說明，不發 session。
3. 管理者在「使用者管理」審核：
   - `superadmin`、`admin` 可核准、拒絕、停用、恢復 `staff`。
   - 只有 `superadmin` 可把使用者升為 `admin` 或降回 `staff`，以及停用、恢復 `admin`。
   - `superadmin` 本身不可被降級或停用。
   - 停用或拒絕時刪除該使用者全部 session。

### Session

- 32 bytes 隨機 token 放在 `httpOnly`、`SameSite=Lax`、正式環境 `Secure` 的 cookie；資料庫只存 SHA-256。
- 正式 session 有效 8 小時，登出即刪除；過期 session 在驗證時刪除。
- OAuth 的 state 與 PKCE code verifier 放在 10 分鐘的 `httpOnly` cookie，不建表。
- 每個需要登入的頁面與 server action 都在伺服器端重新驗證 session 與使用者狀態。

### Schema

```sql
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role           text NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('superadmin','admin','staff')),
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','rejected','disabled')),
  google_sub     text UNIQUE,     -- Google 帳號唯一 ID；最高管理者綁定前為 NULL
  email          text UNIQUE,     -- 小寫；最高管理者綁定前為 NULL
  name           text NOT NULL,
  avatar_url     text,
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_one_superadmin ON users (role) WHERE role = 'superadmin';

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     text NOT NULL DEFAULT 'full' CHECK (purpose IN ('full','bind_google')),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  ip          text,
  user_agent  text
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
```

### 環境變數

`DATABASE_URL`、`APP_URL`、`ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`。`.env` 不進 Git，提供 `.env.example`。

Google OAuth 用戶端由院方在 Google Cloud Console 建立，重新導向 URI：`{APP_URL}/api/auth/google/callback`。

## 測試

- 單元測試（Vitest）：密碼雜湊與驗證、session token。
- 整合測試（Vitest + 本機測試資料庫 `healthcare_test`）：帳密登入、Google 身分處理（新申請、已核准登入、綁定、綁定衝突）、session 驗證與過期、審核權限規則。
- 瀏覽器實測：登入頁、帳密登入 → 綁定頁、未登入導向、使用者管理頁；Google 實際授權待取得 Client ID 後測試。
