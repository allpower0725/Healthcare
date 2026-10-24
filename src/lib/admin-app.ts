import type { Metadata } from 'next';

/**
 * 院內平板把後台「加入主畫面」後，以沒有網址列的 App 方式開啟。
 * 只有後台與登入頁連結 manifest；民眾表單頁沒有，民眾的瀏覽器不會提示安裝。
 */
export const ADMIN_APP_METADATA: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: '預防保健後台', statusBarStyle: 'default' },
  icons: { apple: '/brand/app-icon-180.png' },
};
