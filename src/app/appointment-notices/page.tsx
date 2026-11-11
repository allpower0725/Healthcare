import type { Metadata } from 'next';

export const metadata: Metadata = { title: { absolute: '預約健檢通知｜烏日澄清醫院' } };

export default function AppointmentNoticePage() {
  return (
    <>
      <h1>預約健檢通知</h1>
      <p>
        預約健檢通知協助烏日澄清醫院的工作人員掌握待確認的健檢預約。有新待辦時，系統會寄送摘要給院方指定的收件人。
        摘要提供待辦件數及後台連結，工作人員須登入並具備權限才能查看及處理案件。
      </p>
      <h2>寄件帳號設定</h2>
      <p>
        院方使用指定的 Gmail 帳號定時寄送待辦摘要，並由帳號持有人建立應用程式密碼供系統寄件。
      </p>
    </>
  );
}
