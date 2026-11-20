import type { Metadata } from 'next';
import { PortalLink } from '@/domains/portal/components/PortalLink';

export const metadata: Metadata = {
  title: '校内マップ',
};

export default function MapPage() {
  return (
    <main className="portal-main">
      <section className="page-head">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <h1 className="sec-title">校内マップ</h1>
          <span className="tag mop">UI構築準備中</span>
        </div>
        <p className="meta-text">
          1F〜5Fの屋内教室マップ・屋外テント・バス停アクセスルートを掲載予定です。次の画面設計ステップで Leaflet インタラクティブマップを実装します。
        </p>
      </section>

      <div className="row-wrap">
        <PortalLink href="/projects" className="btn btn-primary">
          企画一覧を見る
        </PortalLink>
        <PortalLink href="/" className="btn">
          トップページへ戻る
        </PortalLink>
      </div>
    </main>
  );
}
