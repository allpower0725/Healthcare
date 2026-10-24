import type { Metadata, Viewport } from 'next';
import './globals.css';

// 手機網址列與各頁白色頂部列同色，看起來連成一片
export const viewport: Viewport = { themeColor: '#ffffff' };

export const metadata: Metadata = {
  title: {
    default: '預防保健表單後台｜烏日澄清醫院',
    template: '%s｜預防保健表單後台',
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
