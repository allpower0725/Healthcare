# 預防保健表單後台

烏日澄清醫院預防保健表單的管理後台（Next.js 16 + PostgreSQL）。設計文件在 `docs/specs/`。

`預防保健表單電子檔/` 是表單原始檔，只放在本機，不進 Git。

## 本機開發

需要 Node.js 24、Docker。

```bash
npm install
docker compose up -d db        # PostgreSQL 17，對外 port 5433（另建測試用資料庫 healthcare_test）
cp .env.example .env           # 填入各項設定，見下方
npm run db:migrate             # 建立資料表
npm run dev                    # http://localhost:3000
```

### .env

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | 本機用 `.env.example` 的預設值；上線改填 Supabase 連線字串 |
| `APP_URL` | 後台網址，本機為 `http://localhost:3000` |
| `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` | 最高管理者首次登入用；雜湊以 `npm run hash-password` 產生 |
| `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` | Google Cloud Console 的 OAuth 用戶端（網頁應用程式），重新導向 URI 填 `{APP_URL}/api/auth/google/callback` |

## 登入方式

1. 最高管理者：登入頁展開「最高管理者首次設定」，以 .env 帳密登入，10 分鐘內綁定 Google 帳號；綁定後帳密登入停用，一律用 Google 登入。
2. 其他人員：用 Google 登入即送出申請，管理者在「使用者管理」核准後即可使用。
3. 最高管理者的 Google 帳號遺失時：執行 `npm run admin:unbind` 解除綁定，再以帳密登入重新綁定。

## 指令

| 指令 | 用途 |
|---|---|
| `npm test` | 自動測試（使用本機的 `healthcare_test` 資料庫） |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run db:generate` | 修改 `src/db/schema.ts` 後產生 migration |
| `npm run db:migrate` | 套用 migration |
