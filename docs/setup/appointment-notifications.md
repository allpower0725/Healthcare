# 預約健檢部署與 Gmail 通知設定

排程每小時檢查尚待院所確認的預約。一般勞工體格檢查（在職）在勞工健康檢查表有效送出後列入待辦。每位收件人當小時有新待辦才收到一封摘要，信內提供件數及需登入的「協同完成」連結。

管理者可在「表單管理 → 預約健檢」編輯收件地址。關閉預約入口後，已存在的待辦仍會通知。清空收件地址可暫停寄送。

## 啟用預約前台

1. 部署前依序確認 `0007_health_check_appointments.sql` 與 `0008_appointment_public.sql` 已套用至目標資料庫。本機使用 `npm run db:migrate`，執行前確認 `DATABASE_URL` 指向預期的資料庫。
2. 在本機環境或 Vercel 加入 `APPOINTMENT_SESSION_SECRET`。使用獨立的高熵隨機值，例如執行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` 產生。每個環境使用自己的密鑰。同一環境的部署須共用相同值，變更會使既有查詢工作階段和原瀏覽器的預約操作憑證失效。
3. 依 [前台 reCAPTCHA 設定](recaptcha.md) 確認正式網域、網站金鑰及評估服務。預約查詢、送出、取消及關聯問卷異動均使用共用防護。
4. 到「表單管理 → 預約健檢」設定日期範圍及休診日，開啟新預約並掃描既有 QR code 驗證。預設可預約台灣時間起算 15 至 90 天內的週一至週六，已建立的預約仍可於關閉新預約後查詢。

民眾可用證件號與出生日期查到預約日期、套餐及狀態。開啟關聯健檢表或取消預約時，系統會自動核對送出預約的瀏覽器憑證。憑證遺失時可洽院所協助。

## 設定院所 Gmail SMTP

1. 使用院所指定的 Gmail 寄件帳號，確認帳號已啟用兩步驟驗證，且可建立應用程式密碼。由帳號持有人建立專供預約健檢通知使用的 16 字元應用程式密碼。 [Google 應用程式密碼](https://support.google.com/accounts/answer/185833)
2. 將寄件信箱和新密碼直接填入下列 Vercel Production 環境變數。系統透過 TLS 連線至 `smtp.gmail.com:465`。 [Gmail SMTP 設定](https://developers.google.com/workspace/gmail/imap/imap-smtp#server-addresses-and-ports)

## 設定正式 Vercel 環境變數

| 環境變數 | 值 |
| --- | --- |
| `APP_URL` | 正式網站的 HTTPS 網址，信件連結由此產生 |
| `APPOINTMENT_CRON_SECRET` | 此排程專用的隨機密鑰，至少 32 字元，可使用英數、底線及連字號 |
| `APPOINTMENT_GMAIL_SENDER` | Gmail 寄件信箱，也是 SMTP 登入帳號 |
| `APPOINTMENT_GMAIL_APP_PASSWORD` | 上述寄件帳號建立的 16 字元應用程式密碼 |

將排程密鑰及應用程式密碼存於 Vercel Production 的 Secret 環境變數，並重新部署以套用。確認專案啟用 Vercel 系統環境變數，以提供 `VERCEL_ENV=production`。寄件設定獨立於後台 Google 登入。 [Vercel 環境變數](https://vercel.com/docs/environment-variables) · [Vercel 系統環境變數](https://vercel.com/docs/environment-variables/system-environment-variables)

## 啟用 Supabase Cron

正式資料庫套用資料表 migration、部署程式並確認收件設定後，在 Supabase 啟用 Cron（`pg_cron`）及 `http` 擴充功能。使用 Vault 新增 `wjcch_appointment_cron_secret`，值與 Vercel 的 `APPOINTMENT_CRON_SECRET` 相同。此排程使用同步 HTTP 請求，不將驗證標頭寫入 `pg_net` 的請求佇列；Supabase 的佇列預設可由其他資料庫登入角色讀取，不能只以 `postgres` 撤銷其預設權限。密鑰只存於 Vault 和 Vercel Secret，不寫入排程 SQL。 [Supabase HTTP](https://supabase.com/docs/guides/database/extensions/http) · [Vault](https://supabase.com/docs/guides/database/vault) · [pg_net 權限限制](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16)

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists http with schema extensions;
```

把下列網址替換為正式 `APP_URL` 的網域，再於正式 Supabase 建立排程。`0 * * * *` 每小時第 0 分鐘觸發，台灣與 UTC 的整點相同。 [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)

```sql
select cron.schedule(
  'wjcch-appointment-notices-hourly',
  '0 * * * *',
  $job$
    do $send$
    declare
      response_status integer;
    begin
      perform set_config('http.curlopt_timeout_ms', '60000', true);
      perform set_config('http.curlopt_connecttimeout_ms', '5000', true);
      select response.status into response_status
      from vault.decrypted_secrets as secret
      cross join lateral extensions.http((
        'POST',
        'https://your-production-domain.example/api/internal/appointment-notices',
        array[extensions.http_header('Authorization', 'Bearer ' || secret.decrypted_secret)],
        'application/json',
        '{}'
      )::extensions.http_request) as response
      where secret.name = 'wjcch_appointment_cron_secret';
      if response_status is distinct from 200 then
        raise exception 'Appointment notices endpoint returned HTTP %',
          coalesce(response_status::text, 'no response');
      end if;
    end
    $send$;
  $job$
);
```

先確認正式站已重新部署以套用密鑰。執行上述 SQL 會啟用排程，若設定過同名排程，應先檢查 `cron.job`，避免由不同角色建立重複工作。排程 SQL 只記錄狀態碼，不記錄密鑰或回應內容。

## 查看通知結果

- 「表單管理 → 預約健檢」顯示目前收件人的最近嘗試、最近寄送及失敗或待核對的件數。最近寄送時間代表 Gmail SMTP 接受郵件的時間。
- 郵件明確被拒絕時，該預約仍待處理才會在下一小時重試。已寄送的預約對相同收件人只通知一次。
- Gmail 回應逾時或排程中斷時，送達結果可能不明。系統會保留「待核對」記錄。管理者可在已授權的 Gmail 寄件備份，依 `heal_appointment_notices.batch_id` 對照 `Message-ID` 中的 `appointment-digest.<batch_id>` 及最近嘗試時間查核。
- 在 Supabase「Integrations → Cron」查看工作是否啟用及執行歷史，或查詢 `cron.job_run_details`。此排程會在 HTTP 狀態非 `200` 時標為失敗；`401` 表示排程密鑰未通過，`503` 表示正式站缺少可用的 Gmail 寄件設定。`succeeded` 表示端點完成處理，實際寄送、失敗或待核對件數仍以後台通知結果為準。 [Supabase Cron 執行歷史](https://supabase.com/docs/guides/cron/quickstart)

本機自動測試透過模擬 Gmail 回應驗證上述流程。正式授權、排程啟用及測試寄件需由院所另外確認。
