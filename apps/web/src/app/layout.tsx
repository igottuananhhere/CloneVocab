import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Thebai - Hoc bang the ghi nho',
    template: '%s | Thebai',
  },
  description:
    'Tao bo the ghi nho cua rieng ban, hoc theo nhieu che do va kham pha bo the cong khai cua nguoi khac.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Thebai',
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
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Bo qua, den noi dung chinh
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
