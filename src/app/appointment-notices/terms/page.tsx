import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '服務條款' };

export default function AppointmentNoticeTermsPage() {
  return (
    <>
      <h1>服務條款</h1>
      <p>
        「烏日澄清醫院 預約健檢通知」供院方授權人員處理預約健檢待辦。
        院方管理者負責指定寄件帳號及收件人，並在工作分派變更時更新收件設定。
        寄件帳號的應用程式密碼應由帳號持有人建立，並由院方授權人員管理寄件設定。
      </p>
      <p>
        工作人員應登入後台查閱案件狀態及安排後續作業。民眾的預約結果以院方確認為準。
        請妥善保管登入及授權資訊，並避免將待辦通知轉寄給未獲授權的人員。
      </p>
      <p>
        若有寄件異常、需變更通知設定，或需停用寄件，請聯絡院方管理者。
        寄件資料的處理方式見<Link href="/appointment-notices/privacy">隱私權政策</Link>。
      </p>
    </>
  );
}
