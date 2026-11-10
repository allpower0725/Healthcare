import type { Metadata } from 'next';

export const metadata: Metadata = { title: '隱私權政策' };

export default function AppointmentNoticePrivacyPage() {
  return (
    <>
      <h1>隱私權政策</h1>
      <p>本政策說明「烏日澄清醫院 預約健檢通知」如何使用 Google 帳號授權及處理寄件資料。</p>
      <h2>Google 授權與資料用途</h2>
      <p>
        系統向指定寄件帳號請求 Gmail 的 <code>gmail.send</code> 權限，用於寄送預約健檢待辦摘要。
        系統不透過這項授權讀取收件匣、郵件內容或聯絡人。
      </p>
      <p>
        系統在 Vercel 正式環境的伺服器端保管 Gmail 更新權杖和 OAuth 用戶端密鑰。
        需要寄件時，伺服器向 Google 交換短效存取權杖，並透過 HTTPS 呼叫 Gmail API。
        Google 會收到寄件與收件地址、郵件標頭，以及包含待辦件數和後台連結的摘要，以完成寄送。
        摘要不含個別案件的姓名、證件號碼、表單答案、簽名或檢查結果。
      </p>
      <h2>寄送紀錄與資料保護</h2>
      <p>
        系統會記錄收件地址、寄送批次、嘗試時間、結果及 Gmail 回傳的郵件識別碼（如有），供院方核對寄送與避免重複通知。
        案件資料由具權限的工作人員登入後台查閱。Google 授權及寄件資料用於提供本通知功能，並依照
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API 服務使用者資料政策</a>
        的有限使用要求處理。
      </p>
      <h2>撤銷授權與資料請求</h2>
      <p>
        寄件帳號持有人可在 <a href="https://myaccount.google.com/connections">Google 帳戶的第三方連結管理頁面</a>
        撤銷本應用程式的授權。撤銷後，系統便無法再用該授權寄信。
      </p>
      <p>公開聯絡方式、寄送紀錄保留與刪除規則，以及政策生效日期，待院方確認後補入。</p>
    </>
  );
}
