# 預約健檢 Gmail 通知設定

排程每小時檢查尚待院所確認的預約。一般勞工體格檢查（在職）在勞工健康檢查表有效送出後列入待辦。每位收件人當小時有新待辦才收到一封摘要，信內提供件數及需登入的「協同完成」連結。

管理者可在「表單管理 → 預約健檢」編輯收件地址。關閉預約入口後，已存在的待辦仍會通知。清空收件地址可暫停寄送。

## 建立院所 Gmail 寄件授權

1. 選用院所專用的 Gmail 或 Google Workspace 帳號。於 Google Cloud 啟用 Gmail API，並為寄件建立專用的 Web OAuth 用戶端。
2. 將 `https://developers.google.com/oauthplayground` 加入該用戶端的授權重新導向 URI。開啟 Google 的 OAuth 2.0 Playground，在設定選擇 Server-side、Offline、Consent Screen、Use your own OAuth credentials，再填入這個寄件用戶端的資料。 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
3. 在 Step 1 填入 `https://www.googleapis.com/auth/gmail.send`，由院所寄件帳號授權。在 Step 2 交換授權碼，取得 refresh token。 [Gmail OAuth 權限](https://developers.google.com/workspace/gmail/api/auth/scopes)
4. 正式寄信請選用適用的 Google OAuth 發布設定，例如院所 Workspace 內部應用程式。外部應用程式處於測試狀態時，含 Gmail 權限的 refresh token 會在七天後到期。 [Google 權杖效期說明](https://developers.google.com/identity/protocols/oauth2#expiration)

## 設定正式 Vercel 環境變數

| 環境變數 | 值 |
| --- | --- |
| `APP_URL` | 正式網站的 HTTPS 網址，信件連結由此產生 |
| `APPOINTMENT_CRON_SECRET` | 此排程專用的隨機密鑰，至少 32 字元，可使用英數、底線及連字號 |
| `APPOINTMENT_GMAIL_CLIENT_ID` | 寄件用 OAuth 用戶端 ID |
| `APPOINTMENT_GMAIL_CLIENT_SECRET` | 寄件用 OAuth 用戶端密鑰 |
| `APPOINTMENT_GMAIL_REFRESH_TOKEN` | 院所寄件帳號授權取得的 refresh token |
| `APPOINTMENT_GMAIL_SENDER` | 已授權的寄件信箱 |

密鑰及 refresh token 存於 Vercel Production 的 Secret 環境變數。確認專案啟用 Vercel 系統環境變數，以提供 `VERCEL_ENV=production`。寄件授權獨立於後台 Google 登入。 [Vercel 系統環境變數](https://vercel.com/docs/environment-variables/system-environment-variables)

## 啟用 Supabase Cron

正式資料庫套用資料表 migration、部署程式並確認收件設定後，在 Supabase 啟用 Cron（`pg_cron`）及 `pg_net`。使用 Vault 新增 `wjcch_appointment_cron_secret`，值與 Vercel 的 `APPOINTMENT_CRON_SECRET` 相同。`pg_net` 送出前會短暫保留請求標頭，應限制資料庫角色存取佇列。 [Supabase 定時 HTTP 請求及 Vault](https://supabase.com/docs/guides/functions/schedule-functions)

把下列網址替換為正式 `APP_URL` 的網域，再於正式 Supabase 建立排程。`0 * * * *` 每小時第 0 分鐘觸發，台灣與 UTC 的整點相同。 [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)

```sql
select cron.schedule(
  'wjcch-appointment-notices-hourly',
  '0 * * * *',
  $job$
    select net.http_post(
      url := 'https://your-production-domain.example/api/internal/appointment-notices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret.decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    from vault.decrypted_secrets as secret
    where secret.name = 'wjcch_appointment_cron_secret';
  $job$
);
```

## 查看通知結果

- 「表單管理 → 預約健檢」顯示目前收件人的最近嘗試、最近寄送及失敗或待核對的件數。最近寄送時間代表 Gmail API 接受郵件的時間。
- 郵件明確被拒絕時，該預約仍待處理才會在下一小時重試。已寄送的預約對相同收件人只通知一次。
- Gmail 回應逾時或排程中斷時，送達結果可能不明。系統會保留「待核對」記錄。管理者可在已授權的 Gmail 寄件備份，依 `heal_appointment_notices.batch_id` 對照 `Message-ID` 中的 `appointment-digest.<batch_id>` 及最近嘗試時間查核。
- 若排程歷史有執行但設定頁沒有結果，可查同時段的 `pg_net` 回應狀態碼。`401` 表示排程密鑰未通過，`503` 表示正式站缺少可用的 Gmail 寄件設定。 [pg_net 查詢回應](https://supabase.com/docs/guides/database/extensions/pg_net)

本機自動測試透過模擬 Gmail 回應驗證上述流程。正式授權、排程啟用及測試寄件需由院所另外確認。
