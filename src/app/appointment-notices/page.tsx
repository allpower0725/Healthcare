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
      <h2>寄件帳號授權</h2>
      <p>
        啟用寄件時，指定寄件帳號的持有人須授予 Gmail 寄件權限，讓系統定時代為寄送待辦摘要。
        民眾填寫公開健檢表單時無須授予這項權限。
      </p>
    </>
  );
}
