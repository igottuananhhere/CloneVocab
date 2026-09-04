import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

/**
 * Inter bi doi sang Geist. Google khong khai bao subset "vietnamese" rieng cho font
 * nay (chi co cyrillic/latin/latin-ext) nen next/font/google se bao loi neu khai bao
 * subset do - nhung da kiem tra bang fontTools rang file "latin" van chua du glyph
 * tieng Viet co dau (a hoi, o moc sac, u moc nang, d gach...), vi Geist khong thuc su
 * chia file theo subset ma phat hanh mot file day du glyph duy nhat. Outfit (lua chon
 * dau tien theo goi y cua skill thiet ke) bi loai vi thieu han nhung glyph nay.
 */
const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Vocab Quiz - Học bằng thẻ ghi nhớ',
    template: '%s | Vocab Quiz',
  },
  description:
    'Tạo bộ thẻ ghi nhớ của riêng bạn, học theo nhiều chế độ và khám phá bộ thẻ công khai của người khác.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Vocab Quiz',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes gan class theme len <html> truoc khi React
    // hydrate, nen HTML server va client khac nhau o dung thuoc tinh nay.
    <html lang="vi" suppressHydrationWarning className={geist.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Bỏ qua, đến nội dung chính
          </a>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
