<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 共用資料契約與欄位對照

`heal_submissions` 與其他應用程式共用，任何開發都必須維護完整資料字典：

- `docs/data/heal-submissions.md` 與 `docs/data/heal-submissions.json` 均以人員查閱為主，保持精簡。實體欄位只列「欄位、中文名稱」；`public_data`／`staff_data` 只列「key、中文名稱、選項代碼 → 名稱」；`form_id`、`status` 只列代碼與中文名稱。
- 不使用 `<br>`，多個選項以「；」分隔；值與名稱相同的選項（如縣市）省略對照。不加入 SQL 型別、NULL、格式限制、顯示條件、驗證規則或完整行政區清單。
- 新增、刪除、改名或修改 key、中文名稱、選項、表單代號、狀態或實體欄位時，**必須在同一變更中同步更新字典**。人工註解與選項引用在 `scripts/lib/submission-dictionary-metadata.ts`；其餘由產生器讀取實際程式定義，不得只修改產出的文件。
- 修改後執行 `npm run dictionary:generate`，審閱 Markdown 與 JSON 差異，再執行 `npm run dictionary:check`；未通過不得視為完成。`npm test` 也會先執行同步檢查。
- 共用 key 或代碼不得改作其他意義。資料契約異動須更新 `docs/data/changes.md`，記錄舊值、新值、歷史資料讀取／轉換方式及相依應用程式的相容處理；改名或刪除前須明確處理既有資料與讀取端，不得僅改畫面及驗證定義。

## 前台公開表單防護與等待提示

- 前台以手機掃碼、免登入填寫為使用場景。所有既有及新增表單必須沿用共用的防機器人驗證與請求處理流程，不得為個別表單建立可繞過防護的送出入口。
- 首次送出、修改重送、退回修改及日後新增的公開資料異動操作，都必須在伺服器端通過防機器人驗證後，才能異動資料；不得只在瀏覽器檢查或相信前台傳入的驗證結果。驗證失敗、逾時或正式環境設定缺漏時，保留填寫內容並回覆可理解的錯誤，不得默默略過驗證。
- 防機器人驗證不能取代既有的裝置憑證、權限、欄位檢查、防重送及並行修改保護。讀取、列印與修改既有案件仍須遵守原存取條件。
- 使用 reCAPTCHA 等外部防護服務時，實作前查閱官方現行文件；公開 site key 與伺服器憑證分開管理，密鑰不得進入前台、Git、資料字典或日誌。不得將姓名、證件號、問卷答案或簽名送往驗證服務，也不得記錄完整驗證 token。
- 使用者明確觸發的網路等待（例如讀取伺服器案件、驗證、送出、退回修改及準備列印）應使用共用 loading 提示，並阻擋重複操作；成功、失敗、取消或逾時均須正確結束等待。樣式沿用既有齒輪遮罩並保持手機適用、可存取及減少動畫偏好支援。
- **IndexedDB 的讀取、寫入、自動暫存、恢復、清理均不得觸發全頁 loading 遮罩或防機器人驗證**。不得把包含本機暫存及網路操作的整段函式一律標記為全頁等待。背景狀態同步亦不得打斷填寫；待儲存狀態如需提示，使用局部文字。
- 新增或修改公開操作時，驗證伺服器拒絕無效驗證的路徑、失敗後答案保留、重複操作防護，以及 loading 的顯示與解除；核對 IndexedDB 操作不出現遮罩。上線前確認正式網域、金鑰、服務額度與環境設定均已就緒，測試替身或開發用略過模式不得在正式環境生效。

## 全系統的確認與送出結果

- 使用者輸入或修改資料，再明確按下確認、送出或儲存時，成功、失敗、驗證未通過及逾時等結果，均須透過共用 Result Modal 呈現。前台、後台及日後新增功能一律遵守。
- 結果 Modal 須有清楚標題、結果說明及確認按鈕，持續顯示至使用者關閉。行內訊息或短暫 Toast 可作補充，不能作為唯一結果通知。成功只能在伺服器確認操作完成後顯示。
- Modal 須適用手機及桌機，支援鍵盤操作、螢幕閱讀器及關閉後焦點回復。驗證失敗時保留答案，關閉 Modal 後可定位需修正欄位。
- 等待遮罩結束後才呈現結果 Modal，避免被遮住。背景自動暫存、IndexedDB 操作及日期預約人數查詢維持原有局部提示，不能持續彈出結果 Modal 打斷輸入。

## 前台證件入口

- 所有既有及新增公開表單與預約入口使用共用 `IdentityFields` 元件及 `src/lib/forms/identity.ts`。明確選擇身分證、統一證號或護照，預設身分證；不將身分證或統一證號的驗證失敗自動降為護照格式檢查。
- 身分證與新舊式統一證號須檢查格式及檢查碼；護照只做共用基本格式檢查，不宣稱已完成身分認證。保留前導零，不把證件號當數值處理，不可截斷號碼後再當作合法輸入。
- 前台驗證失敗時保留輸入、以 Result Modal 提醒並阻擋繼續，不先開啟或清除 IndexedDB 資料。伺服器首次送出、修改重送與預約查詢亦須使用相同規則，不能只依賴前台；修改既有問卷時，證件種類及號碼由伺服器既有資料固定。
- 證件種類存為 `public_data['profile.idType']`，證件號繼續使用 `profile.idNo`；新增表單須同步沿用欄位與規則，並維護共用字典。證件檢查不能取代 reCAPTCHA、裝置憑證、權限及既有並行保護。
