# 表單 QR code 與開放填寫時間（第 4 項）設計

日期：2026-10-24　狀態：已確認

## 範圍

- 每種表單一個固定的 QR code（共 6 個），網址 `{APP_URL}/f/{表單代號}`。
- 後台可設定每張表單的開放開關與開放期間。
- 民眾端 `/f/{表單代號}` 這一項只做開放狀態檢查；表單本身在第 5 項。

表單代號沿用原 HTML 檔名：`hpv`（人類乳突病毒）、`pap`（子宮頸抹片）、`oral`（口腔黏膜）、`hp`（胃幽門螺旋桿菌）、`fit`（糞便潛血）、`adult`（成人預防保健）。

## 開放時間

- 每張表單：開放開關＋可留空的開始、結束時間（以台灣時間輸入與顯示）。
- 開放中＝開關打開，且（未設開始或現在 ≥ 開始），且（未設結束或現在 < 結束）。
- 後台顯示四種狀態：關閉、尚未開始、開放中、已結束。
- 6 張表單預設關閉。
- 不在開放時間掃描時，民眾端顯示「目前未開放填寫」與開放期間；第 5 項送出時伺服器端再檢查一次。

## QR code

- 伺服器以 `qrcode` 套件產生 QR 矩陣（容錯等級 H），自行繪製 SVG：
  - 資料點為圓點，顏色取該表單插圖的主色（選夠深的色號）。
  - 三個定位點為圓角外框＋圓角內點。
  - 中央留白圓形，放該表單的主題插圖（約占寬度 30%，在容錯 H 的範圍內）。
- 下載：PNG（高解析度，瀏覽器以 canvas 轉檔）、SVG、A4 列印海報（院徽、表單名稱、QR、掃描說明、開放期間）。
- QR 網址取自 `APP_URL`；正式列印須在部署並確定網域後進行。

## 頁面與權限

- `/admin/forms`：6 張表單卡片（插圖、名稱、狀態、開放期間）。
- `/admin/forms/{代號}`：QR 預覽與下載、開放設定。
- `/admin/forms/{代號}/poster`：A4 列印海報。
- 所有已啟用人員可檢視與下載 QR；只有管理者、最高管理者可修改開放設定（伺服器端檢查）。
- 表單名稱、插圖、主色寫在程式（`src/lib/forms/catalog.ts`），不放資料庫。

## Schema

```sql
CREATE TABLE form_settings (
  form_id     text PRIMARY KEY
              CHECK (form_id IN ('hpv','pap','oral','hp','fit','adult')),
  is_open     boolean NOT NULL DEFAULT false,
  opens_at    timestamptz,
  closes_at   timestamptz,
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_settings_period_check
    CHECK (opens_at IS NULL OR closes_at IS NULL OR opens_at < closes_at)
);
INSERT INTO form_settings (form_id) VALUES ('hpv'),('pap'),('oral'),('hp'),('fit'),('adult');
```

## 測試

- 單元測試：開放狀態判斷（各種開關與期間組合）、台灣時間輸入轉換、QR SVG 產生（定位點、中央留白、顏色）。
- 整合測試：讀取 6 筆設定、管理者更新設定、一般人員被拒、期間不合法被拒。
- 瀏覽器實測：表單管理頁、設定開放時間、下載、海報、民眾端狀態頁；以解碼器確認 QR 可被掃描。
