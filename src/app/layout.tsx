import type { Metadata, Viewport } from 'next';
import { Noto_Sans_JP, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { ThemeProvider } from '@/components/ThemeProvider';
import '@/styles/tokens.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  title: {
    default: '第25回 南陵祭2027 公式Webポータル',
    template: '%s | 南陵祭2027',
  },
  description:
    '神奈川県立横浜南陵高等学校 第25回「南陵祭2027」公式デジタルパンフレット・キャンパスマップ基盤',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${plusJakartaSans.variable} ${notoSansJp.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body>
        <AnalyticsTracker />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
