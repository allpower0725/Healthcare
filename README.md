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

## 表單填寫流程

- 民眾掃描 QR code 開啟 `/f/{表單代號}`，先輸入身分證號再填寫；草稿只存在民眾裝置（12 小時），按「確認送出」才寫入資料庫。
- 後台「協同完成」：列表可依身分證號（部分號碼即可）、表單種類、狀態篩選，點欄位標題排序；開啟後填寫院所區（自動儲存）→ 院所區最下方「確認送出」鎖定 →「列印 / 另存原樣 PDF」；「取消送出」後民眾才能再退回修改。重複送出的資料可作廢。
- 院內平板可把後台「加入主畫面」（iPad 用 Safari、Android 用 Chrome，按分享→加入主畫面），之後從圖示開啟就沒有網址列。設定在 `public/admin.webmanifest` 與 `src/lib/admin-app.ts`，圖示原檔為 `public/brand/app-icon.svg`；民眾表單頁不提供安裝。
- 6 張表單（人類乳突病毒、子宮頸抹片、口腔黏膜檢查、胃幽門螺旋桿菌、糞便潛血、成人預防保健）皆已電子化。表單欄位定義在 `src/lib/forms/defs/`，畫面在 `src/forms/`，各表單的設計見 `docs/specs/2026-10-24-forms-5b-design.md`。
- 成人預防保健的同意簽名在院所區由服務對象本人簽；年齡、BMI、LDL、eGFR 自動計算（只顯示與列印，不存入資料庫）。本院檢驗參考值目前留空，之後可在 `src/lib/forms/defs/adult.ts` 的 `staffDefaults` 加入。

## 表單 QR code

- 後台「表單管理」：設定每張表單的開放開關與期間，下載 QR code（PNG／SVG）與 A4 海報。
- QR code 內容是 `{APP_URL}/f/{表單代號}`。本機的 `localhost` 網址手機打不開，**正式列印請在部署、確定網域之後**；網域一換就要重印。
- `npm test` 會用 ZXing 與 jsQR 兩套解碼器實際掃描 6 張表單的 QR code（多種尺寸、長短網址），修改 QR 樣式後請務必跑過。

## 指令

| 指令 | 用途 |
|---|---|
| `npm test` | 自動測試（使用本機的 `healthcare_test` 資料庫） |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run db:generate` | 修改 `src/db/schema.ts` 後產生 migration |
| `npm run db:migrate` | 套用 migration |
