import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '会場スタッフ管理 (/venue)',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VenueGroupLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <span className="brand-title">
            南陵祭2027 会場スタッフ管理シェル（ステージ混雑・進行運用）
          </span>
          <Link href="/" prefetch={false}>
            Webポータルへ戻る
          </Link>
        </div>
      </header>
      <main className="shell-container stack-lg">{children}</main>
    </>
  );
}
