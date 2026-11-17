import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import '@/styles/tokens.css';

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
    <html lang="ja">
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
