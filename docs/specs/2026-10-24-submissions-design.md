# 民眾送出存入資料庫、院所填寫區移到後台（第 5 項）設計

日期：2026-10-24　狀態：已確認

## 範圍與分階段

- 6 張表單以 React 重寫：版面、欄位命名（`profile.*`、`{表單}.*`）、驗證與條件顯示參考原 HTML，不直接引用原檔。
- 每張表單分三塊：民眾填寫區（`/f/{代號}`）、院所填寫區（後台）、依原表單 A4 格式的列印。
- **5a**：共用基礎＋人類乳突病毒（HPV）完整做完，請使用者確認後再做 **5b**：其餘 5 張。

## 狀態

| 狀態 | 意義 | 民眾裝置 | 後台 |
|---|---|---|---|
| `submitted` | 民眾已送出 | 完成畫面，「退回修改」可用 | 民眾區唯讀；院所區可填（自動暫存）；「確認送出」「作廢」 |
| `returned` | 民眾修改中 | 可修改，須重新簽名再送出 | 院所區可填；不能確認送出；可作廢 |
| `completed` | 已完成（鎖定） | 「退回修改」停用，提示洽櫃台 | 全部唯讀；只有「取消送出」「列印 / 另存原樣 PDF」 |
| `voided` | 已作廢 | 視同無資料 | 唯讀，預設不列出；可「復原」回 `submitted` |

- 取消送出：`completed` → `submitted`，民眾的退回修改恢復可用。
- 作廢只適用 `submitted`、`returned`；用於處理重複送出。
- 每次送出都是新的一筆（定期服務、已完成紀錄不可覆蓋、身分證號打錯不影響他人）。同一身分證號、同一表單有兩筆以上未完成（`submitted`／`returned`）時，後台列表與單筆頁提示重複。
- 只有民眾本人能修改民眾區（在原裝置退回修改）；後台不能改民眾區。

## 民眾端

- 沿用原規則：先輸入身分證號；草稿只存在裝置（IndexedDB，自第一次存入起 12 小時）；同一裝置只保留一位填寫者，輸入不同號碼時清除；同一分頁重新整理可續填；跨表單帶入基本資料。
- 「確認送出」才寫入資料庫：伺服器檢查表單開放中（第 4 項），再依欄位定義清理與驗證。退回修改後的再次送出不受開放時間限制。
- 送出時發給裝置憑證（httpOnly cookie，12 小時；資料庫只存 SHA-256）。只有持有憑證的裝置能查看該筆、退回修改；只憑身分證號不能讀取資料。
- 輸入不同身分證號時，清除裝置暫存與裝置憑證；填寫中按「更換」只回到身分證關卡、資料仍留在裝置（誤按時輸入同一號碼即可找回）。
- 送出後的完成畫面不提供「換下一位填寫」（容易誤導）。
- 表單關閉後，持有該表單有效憑證的裝置仍可開啟頁面查看完成畫面與退回修改。

## 後台

- 後台首頁改為「表單管理」（`/`、`/admin` 都導向 `/admin/forms`），上方提醒待院所填寫的表單與待審核的使用申請。
- 「表單資料」列表（第 6 項改名「協同完成」並加上排序、複合篩選）：送出時間、表單、狀態、姓名、身分證號、重複提示。
- 單筆頁：狀態與操作按鈕、民眾填寫內容（唯讀）、院所填寫區（自動暫存、以 `version` 防止同時編輯互相覆蓋）。
- 院所區預設值沿用原表單：例如 HPV 國籍依身分證格式預選、支付方式預防保健、採檢醫療機構帶入本院醫事機構代碼 **1536151042**、採檢日期今天。
- 確認送出前檢查標＊欄位，缺漏時列出並詢問是否仍要送出（不強制）。
- 列印頁只在 `completed` 提供，依原表單格式輸出 A4。
- 所有啟用中的人員都可填寫院所區與執行上述操作；操作者記錄在 `submission_events`。

## 欄位定義（前後端共用）

每張表單一份定義：欄位（所屬區塊、型別、選項、長度、條件顯示）、民眾區驗證規則、院所區＊欄位、院所區預設值。

- 伺服器只接受定義內的欄位；單選／複選只接受定義的選項；文字限長度；簽名須為 PNG data URL 且不超過 300 KB；條件不成立（被隱藏）的欄位值一律清空。
- 民眾區驗證規則與原表單相同（身分證只檢查有填、民國日期是否存在、電話位數、地址必填部分、簽名）。

## Schema

```sql
CREATE TABLE submissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id              text NOT NULL CHECK (form_id IN ('hpv','pap','oral','hp','fit','adult')),
  status               text NOT NULL CHECK (status IN ('submitted','returned','completed','voided')),
  id_no                text NOT NULL,
  name                 text NOT NULL,
  birth_date           date,
  public_data          jsonb NOT NULL,
  staff_data           jsonb NOT NULL DEFAULT '{}',
  device_token_hash    text,
  device_expires_at    timestamptz,
  public_submitted_at  timestamptz NOT NULL,
  staff_updated_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  staff_updated_at     timestamptz,
  completed_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at         timestamptz,
  version              integer NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON submissions (id_no);
CREATE INDEX ON submissions (form_id, status);
CREATE INDEX ON submissions (created_at DESC);
CREATE INDEX ON submissions (device_token_hash);

CREATE TABLE submission_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id  uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  action         text NOT NULL CHECK (action IN
                   ('submitted','returned','resubmitted','completed','reopened','voided','restored')),
  actor_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

## 上線注意

部署到 Supabase 時，所有資料表開啟 RLS 且不設開放規則，資料只能經由後台程式存取。

## 測試

- 單元：身分證檢查碼、民國日期、地址與電話拆分、條件判斷、欄位清理、HPV 民眾區驗證、＊欄位檢查。
- 整合（資料庫）：送出（開放檢查）、裝置憑證、退回修改與再送出、院所暫存與版本衝突、確認送出、取消送出、作廢與復原、重複提示、操作紀錄。
- 瀏覽器：民眾端完整填寫與送出、退回修改、後台填寫與鎖定、列印頁。
