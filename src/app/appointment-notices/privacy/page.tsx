import type { Metadata } from 'next';

export const metadata: Metadata = { title: '隱私權政策' };

export default function AppointmentNoticePrivacyPage() {
  return (
    <>
      <h1>隱私權政策</h1>
      <p>本政策說明「烏日澄清醫院 預約健檢通知」如何使用指定的 Gmail 帳號寄信及處理寄件資料。</p>
      <h2>Gmail 寄件與資料用途</h2>
      <p>
        系統在 Vercel 正式環境的伺服器端保管寄件帳號的應用程式密碼，並透過 TLS 加密的 Gmail SMTP 連線寄送待辦摘要。
        Google 會收到寄件與收件地址、郵件標頭，以及包含待辦件數和後台連結的摘要，以完成寄送。
        摘要不含個別案件的姓名、證件號碼、表單答案、簽名或檢查結果。
      </p>
      <h2>寄送紀錄與資料保護</h2>
      <p>
        系統會記錄收件地址、寄送批次、嘗試時間、結果及郵件識別碼（如有），供院方核對寄送與避免重複通知。
        案件資料由具權限的工作人員登入後台查閱。
      </p>
      <h2>停用寄件與資料請求</h2>
      <p>
        寄件帳號持有人可在 <a href="https://myaccount.google.com/apppasswords">Google 帳戶的應用程式密碼管理頁</a>
        撤銷供本系統使用的應用程式密碼。撤銷後，系統便無法再用該密碼寄信。
      </p>
      <p>
        系統保留寄送紀錄供核對與避免重複通知，目前未設定固定期限自動刪除。
        若要詢問紀錄保留情形、申請刪除寄送紀錄，或在停用寄件時申請移除系統保管的授權憑證，請透過院方的
        <a href="https://www.wjcch.com.tw/contact">聯絡管道</a>提出。
      </p>
    </>
  );
}
