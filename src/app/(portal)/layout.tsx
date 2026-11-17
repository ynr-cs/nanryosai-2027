import type { ReactNode } from 'react';
import { PortalLink } from '@/domains/portal/components/PortalLink';

export default function PortalGroupLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <PortalLink href="/" className="brand-title">
            南陵祭2027 公式Webポータル
          </PortalLink>
          <nav aria-label="メインナビゲーション">
            <ul className="nav-list">
              <li>
                <PortalLink href="/">トップ</PortalLink>
              </li>
              <li>
                <PortalLink href="/projects/sample_mop_castella">検証企画詳細</PortalLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="shell-container stack-lg">{children}</main>
    </>
  );
}
