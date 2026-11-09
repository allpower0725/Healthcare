# 前台 reCAPTCHA 設定與上線

本專案使用 Google Cloud reCAPTCHA 的 Web／Score-based 金鑰、`enterprise.js` 與 Enterprise API v1 assessment。Google 介面目前也可能顯示 **Google Cloud Fraud Defense** 名稱。這份步驟不會自動建立外部資源或啟用計費。

程式已接入七份表單的首次送出、修改重送、退回修改；請先完成以下設定，再部署正式版本。正式模式缺少設定或驗證服務異常時會拒絕異動，填寫內容保留。金鑰尚未建立前的模擬測試，不代表 Google 真實防護已啟用。

## 1. 選擇 Google Cloud 專案並啟用 API

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)，選擇醫院管理的專案；可沿用目前 Google OAuth 所屬專案，亦可使用另行建立的專案。
2. 記下 **Project ID（專案 ID）**，不要混用專案顯示名稱、Project Number 或 OAuth Client ID。
3. 在「API 和服務 → 程式庫」搜尋並啟用 **reCAPTCHA Enterprise API**（`recaptchaenterprise.googleapis.com`）。若尚未有操作權限，請由專案管理者協助；管理網站金鑰需要 reCAPTCHA Enterprise Admin 角色。

參考：[Google 環境準備](https://docs.cloud.google.com/recaptcha/docs/prepare-environment)、[伺服器 assessment](https://docs.cloud.google.com/recaptcha/docs/create-assessment-website)。

## 2. 建立正式網站 site key

1. 開啟 [reCAPTCHA／Fraud Defense 控制台](https://console.cloud.google.com/security/recaptcha)，確認頂端選到正確專案。
2. 在 **Keys（金鑰）→ Create key（建立金鑰）**，命名為例如 `wjcch-healthcare-production`。
3. Application type 選 **Web**，類型採 **Score-based（評分型）**。此專案使用 `grecaptcha.enterprise.execute()`，不使用舊版 `siteverify`／secret key，也不使用 Checkbox 或 Universal key。
4. 保持網域驗證啟用（**Disable domain verification 關閉**），加入目前正式 hostname：`wjcch-healthcare.vercel.app`。若之後啟用院所自訂網域，另外加入該 hostname。
5. 網域只填 hostname，不含 `https://`、連接埠或 `/f/labor` 等路徑；不要加入整個 `vercel.app`、萬用字元或放寬成所有網域。
6. 建立後複製 **Key ID／site key**，作為 `RECAPTCHA_SITE_KEY`。此值可以公開；它與下節的伺服器 API key 是不同資料。

Google 說明網域清單變更可能需要一段時間才生效（最多約 30 分鐘）。[官方建立步驟](https://docs.cloud.google.com/recaptcha/docs/create-key-website)

## 3. 建立伺服器 API key

1. 在同一專案的 **API 和服務 → 憑證 → 建立憑證 → API key** 建立伺服器使用的 API key。
2. 編輯此 key 的 **API restrictions（API 限制）**，選擇 Restrict key，只允許 **reCAPTCHA Enterprise API**。
3. 此 key 由 Vercel 伺服器呼叫 Google，不應設定為瀏覽器 HTTP referrer 限制。若部署環境已有固定出口 IP，可另以實際出口限制 IP；一般 Vercel 專案不要隨意填入自己的本機 IP，否則正式伺服器會驗證失敗。
4. 將值存入安全的憑證管理工具，接著直接填入 Vercel 的 `RECAPTCHA_API_KEY`。不要貼到聊天、問卷 JSONB、Git、終端命令參數或截圖；不要使用 `NEXT_PUBLIC_` 前綴。

程式將 API key 放在伺服器請求的 `X-Goog-Api-Key` header，不放在 URL；不輸出外部錯誤全文。`next.config.ts` 已關閉開發模式預設的 Server Function 參數記錄，避免問卷或驗證 token 進入終端日誌。[API key 限制](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)

## 4. 設定 Vercel Production

在 [wjcch-healthcare 環境變數設定](https://vercel.com/allpowers-projects/wjcch-healthcare/settings/environment-variables) 加入下列變數，選取 **Production** 環境。

| 變數 | 應填內容 |
| --- | --- |
| `RECAPTCHA_SITE_KEY` | 第 2 節正式網站的 Key ID／site key |
| `RECAPTCHA_PROJECT_ID` | 第 1 節的 Google Cloud Project ID |
| `RECAPTCHA_API_KEY` | 第 3 節伺服器 API key，設為敏感／Secret 類型 |
| `RECAPTCHA_ALLOWED_HOSTNAMES` | `wjcch-healthcare.vercel.app`；多個正式網域以逗號分隔 |
| `RECAPTCHA_MIN_SCORE` | `0.5`（可依實際誤擋與濫用情形調整，範圍 0–1） |
| `RECAPTCHA_DEV_BYPASS` | `false`，或不設定 |

site key 由伺服器在請求時以公開 props 傳給前台，前台不會收到 API key、Project ID、允許網域清單或分數設定。無須加入任何 `NEXT_PUBLIC_` 變數。

儲存後重新部署程式，讓新 deployment 取得設定。Preview 若需要驗證，使用獨立的測試 key 與明確允許的固定預覽 hostname；不要讓正式 key 接受所有隨機預覽網域。

## 5. 設定本機

### 使用 Google 真實測試 key

建立另一個 Web／Score-based key，命名例如 `wjcch-healthcare-development`，允許 `localhost` 及使用時的 `127.0.0.1`。Google 建議測試與正式使用不同 site key，避免測試流量影響正式評分。

在專案根目錄的 `.env.local` 填入自己的值（此檔已被 Git 忽略）：

```dotenv
RECAPTCHA_SITE_KEY=填入本機測試用site-key
RECAPTCHA_PROJECT_ID=填入Google-Cloud專案ID
RECAPTCHA_API_KEY=填入伺服器API-key
RECAPTCHA_ALLOWED_HOSTNAMES=localhost,127.0.0.1
RECAPTCHA_MIN_SCORE=0.5
RECAPTCHA_DEV_BYPASS=false
```

重新啟動 `npm run dev` 後，用一般瀏覽器填寫並送出合成測試資料。Google Console 若選擇固定分數的測試設定，僅能用於非正式 key，不能當作真實風險判定。

### 尚未有金鑰，只測試畫面／業務流程

在 `.env.local` 明確設定 `RECAPTCHA_DEV_BYPASS=true`，執行 `npm run dev`。畫面會顯示本機略過提示；只有 `NODE_ENV=development` 且沒有 Vercel 環境標記才生效。`npm run build` 後的 `npm start`、Vercel Production 與 Preview 均不能使用此略過方式。

IndexedDB 暫存、草稿恢復、清理與背景狀態更新都不取得 token，也不顯示全頁 loading。讀取伺服器案件、切換／清除裝置連線、受保護異動與準備列印才有等待遮罩。

## 6. 上線核對

1. 正式頁面沒有「本機開發模式」或安全驗證不可用的提示。
2. 以合成資料送出一筆，確認資料成功儲存；Google Console 有對應的 `public_submit` assessment，回傳 action、hostname 與分數符合條件。
3. 退回修改及重新送出分別使用 `public_return`、`public_resubmit`；每次操作及重試取得新 token。不得把 token 寫入 IndexedDB 或問卷欄位。
4. 模擬拒絕／服務異常時，填寫內容與簽名仍保留，遮罩解除、按鈕可重試；成功重試不新增重複問卷。
5. 驗證 IndexedDB 自動暫存不跳遮罩，正常手機填寫不被中斷；列印準備完成後，網頁遮罩先解除，再進原生列印介面。
6. 確認 Google 使用量與計費設定。官方目前提供每月前 10,000 次 assessment 免費；超量繼續使用需啟用計費。本專案不會自動開啟計費。驗證額度耗盡同樣會阻擋送出，請由專案管理者監看用量。[官方額度說明](https://docs.cloud.google.com/recaptcha/docs/create-assessment-website)

未取得可用金鑰前，只能完成程式、模擬服務及開發略過模式驗證；不要把這些結果當成 Google 真實驗證或正式防護已啟用。

## 常見問題

- **頁面顯示安全驗證暫時無法使用**：確認 Production 的五個必要設定及門檻格式，重新部署後重載。不要以開啟略過來排除正式設定問題。
- **一直驗證未通過**：檢查 key 類型、Google 網域清單、`RECAPTCHA_ALLOWED_HOSTNAMES`、Console 回傳的 action／分數、伺服器時間及 token 是否已使用或逾時。新站台與測試流量的分數可能與正式流量不同。
- **Google API 回傳拒絕**：確認正確專案已啟用 Enterprise API、API key 屬於同一專案且 API 限制正確。OAuth Client Secret 不能代替此 key。
- **手機內嵌瀏覽器異常**：先改用系統 Chrome／Safari 測試；Google 不建議在應用程式內嵌 WebView 使用網站版 reCAPTCHA。[官方選型說明](https://docs.cloud.google.com/recaptcha/docs/choose-key-type)
- **Google 標章**：沿用官方腳本的預設 badge，未以 CSS 隱藏；不要自行加入已過時的隱私／服務條款文案。若日後調整標章，先核對 [Google FAQ](https://docs.cloud.google.com/recaptcha/docs/faq)。
