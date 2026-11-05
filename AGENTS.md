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
