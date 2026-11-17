import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'モバイルオーダー・店舗運用シェル',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MopGroupLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <span className="brand-title">南陵祭2027 第2層シェル（MOP / 有人POS）</span>
          <Link href="/" prefetch={false}>
            Webポータルへ戻る
          </Link>
        </div>
      </header>
      <main className="shell-container stack-lg">{children}</main>
    </>
  );
}
