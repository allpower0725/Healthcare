# 前台公開表單防護與 loading 規格草案

狀態：使用者已確認範圍，並要求提供金鑰設定步驟。共用規範、程式與模擬服務／本機開發驗證已完成；Google 真實服務及正式部署仍待使用者建立金鑰後驗證。本次未修改資料表、正式環境或外部服務設定。

## 目標與現況

- 七種表單共用 `/f/[formId]` 的 FormApp 與 Server Actions，仍維持手機掃碼、免登入填寫。
- 現有裝置憑證、防重送、資料列鎖定、欄位驗證與已完成案件的存取條件均保留。
- 目前環境未設定 reCAPTCHA 相關變數。既有 Google OAuth 用戶端不等於 reCAPTCHA 金鑰。
- 現有前台 busy 狀態涵蓋 IndexedDB 與網路處理，不能直接全部接到全頁遮罩。

## 共用防護

1. 使用 Google Cloud 現行 reCAPTCHA Enterprise API v1 的網站評分型整合，瀏覽器透過 `grecaptcha.enterprise.execute()` 取得 token，伺服器建立 assessment 驗證；一般情況不增加勾選或選圖步驟。
2. 首次送出、修改重送、退回修改各使用固定且不同的 action。每次操作與重試重新取得 token，不在開始填寫時預先取得，不將 token 保存於 IndexedDB、cookie、問卷 JSONB 或日誌。
3. 共用伺服器防護檢查設定、token 有效性、回傳 action、允許的 hostname 及分數，通過後才進入原異動流程。初始門檻為 0.5，由伺服器環境變數設定；不相信前台傳入的分數、網域或通過旗標。
4. Google 文件指出 token 為單次使用、兩分鐘有效；不快取成功驗證結果供不同操作共用。重試沿用原問卷 requestId，另外取得新 token，保留原防重複問卷機制。
5. 驗證低分、無效、重複、過期、服務失敗或逾時時拒絕資料異動，提供重試／洽院所的提示並保留答案及已完成的簽名。正式環境缺少金鑰或網域設定時不得放行；本機略過僅能透過明確開發設定啟用，正式模式不能使用。
6. Google assessment 僅傳必要的 token、site key 與固定 action，不傳填表者姓名、證件號、答案、email 或簽名。瀏覽器外部腳本本身的識別、告知及設定依官方現行文件處理。
7. 開始填寫、查閱原裝置案件與列印沿用既有存取條件，不因本機暫存或背景狀態更新執行 reCAPTCHA。這一階段集中防止公開異動入口被機器人灌單，不新增分散式頻率限制資料表或其他外部服務。

## loading 邊界

| 操作 | 處理方式 |
| --- | --- |
| 伺服器初次載入表單開放狀態 | 網路等待顯示共用 loading；完成後解除。 |
| 明確進入／恢復填寫時讀取伺服器案件 | 僅包住 Server Action 的等待，不包住前後 IndexedDB。 |
| 切換填寫者／清除裝置連線 | 只有清除伺服器裝置 cookie 的請求顯示等待；前置 IndexedDB 處理不顯示遮罩。 |
| 驗證、首次送出、修改重送、退回修改 | 各自顯示可理解的處理中文字樣，禁止重複觸發，於 finally 解除。 |
| 使用者點列印後載入文件、字型與圖片 | 顯示準備列印；進入原生列印介面前解除網頁遮罩。 |
| IndexedDB 自動暫存、讀取、恢復、清理 | 不顯示全頁遮罩、不觸發 reCAPTCHA。 |
| 完成畫面背景同步、視窗重新取得焦點 | 不顯示全頁遮罩，不打斷操作。 |
| 前台欄位驗證、簽名板、切換選項 | 立即在原畫面處理，不顯示網路遮罩。 |

- 沿用後台齒輪樣式並抽成共用元件；保持手機閱讀、鍵盤焦點、螢幕閱讀器提示及 prefers-reduced-motion。
- 若同時存在多筆受追蹤的請求，遮罩須持續至相關請求結束，不因其中一筆先完成而提前解除；不永久鎖住頁面。
- 失敗後保留目前問卷、requestId 與可重試狀態，不清空或要求重填。

## 設定與部署

- 設定變數為 `RECAPTCHA_SITE_KEY`、`RECAPTCHA_PROJECT_ID`、`RECAPTCHA_API_KEY`、`RECAPTCHA_ALLOWED_HOSTNAMES`、`RECAPTCHA_MIN_SCORE`，及僅本機可用的 `RECAPTCHA_DEV_BYPASS`。已同步 `.env.example`，完整建立與部署步驟見 `docs/setup/recaptcha.md`。
- Vercel 伺服器憑證採限用 reCAPTCHA Enterprise API 的 API key；正式與本機／預覽環境分開設定，公開站台 key 不得放入伺服器密鑰。
- 本機需要明確允許 localhost／127.0.0.1 的測試 key；正式 key 綁定正式網域，禁止使用允許所有網域的方式通過測試。
- Google 官方目前載明每月前 10,000 次 assessment 免費；超量繼續使用須啟用計費。本次不自動啟用計費或建立付費資源。
- 不新增或改動資料表，不把驗證資訊加入 `public_data`／`staff_data`；資料字典結構與問卷 key 維持原狀，仍執行同步檢查。
- 若使用者尚未建立 Google Cloud reCAPTCHA 設定，先完成程式、模擬測試及設定步驟；金鑰設定就緒後才能進行真實服務及正式環境驗證。伺服器 API key 請透過本機 `.env.local`／Vercel 環境變數輸入，不貼在聊天中。

## 必要驗證

- 直接呼叫 Server Action 無法略過驗證；token 空白、無效、過期、重複、action／hostname 不符、低分、API 錯誤與逾時均不異動資料。
- 前端每次受保護操作取得新 token，驗證失敗保留答案，成功及重試不產生重複案件；原裝置與鎖定規則仍有效。
- IndexedDB 可持續自動暫存且不出現全頁遮罩；明確網路操作才有 loading，錯誤與逾時能解除並繼續填寫。
- 七份表單沿用同一防護入口；新表單只需依既有 registry 接入，即可繼承規則。
- 手機尺寸、三種字級、loading 的可存取性、直接列印及後台既有遮罩回歸。
- 型別、字典同步、必要整合測試與正式建置；真實 Google 服務需在可用金鑰下另驗證，不以模擬測試宣稱已啟用正式防護。

## 官方參考（2026-11-06 查核）

- https://docs.cloud.google.com/recaptcha/docs/choose-key-type
- https://docs.cloud.google.com/recaptcha/docs/create-assessment-website
- https://docs.cloud.google.com/recaptcha/docs/interpret-assessment-website

## 實作與驗證紀錄（2026-11-06）

- 共用防護位於 `src/lib/security/`，七份表單的公開異動均由既有 Server Actions 呼叫；不改問卷 key、資料表或裝置憑證規則。
- 共用遮罩位於 `src/components/loading/`；前台以明確的請求追蹤器包住網路等待，後台沿用同一元件。列印於字型、圖片與內容就緒後，先解除遮罩再呼叫瀏覽器列印。
- 關閉 Next.js 開發模式預設的 Server Function 參數記錄，避免 token 或問卷內容寫入終端。程式不記錄 Google 回應錯誤全文。
- 完整測試 23 個檔案、279 項通過；涵蓋伺服器驗證、七種表單拒絕未驗證送出、實際資料庫異動／防重送、前端腳本重試、等待逾時／並行與列印準備順序。型別檢查、正式建置、字典產生與同步檢查皆通過；資料字典維持 18 個實體欄位、7 種表單及 611 個 JSONB 欄位。
- 瀏覽器使用合成資料，在 390px 一般字級與 320px 最大字級檢查前台；讀取及送出時出現遮罩，完成後解除，窄螢幕未水平溢出。修改欄位並自動暫存時無遮罩；重新送出後核對資料庫仍為同筆資料、版本更新、答案正確。後台 modal 讀取該筆內容與共用遮罩回歸正常。
- 正式模式即使誤設 `RECAPTCHA_DEV_BYPASS=true`，缺少金鑰仍顯示不可用並拒絕驗證；本機開發略過僅用於此次畫面與業務流程測試。未將此結果當作 Google 真實 assessment 成功。
- 列印呼叫順序由測試驗證；本次未實際操作原生列印視窗。真實 Google 驗證、風險分數及正式 Vercel 部署仍待金鑰建立後驗證，設定步驟見 `docs/setup/recaptcha.md`。
- 所有資料庫測試使用本次建立的獨立暫時資料庫，測後已刪除；臨時伺服器與測試瀏覽器分頁已關閉，既有 `wjcch`／`wjcch_test` 與雲端資料未異動。
