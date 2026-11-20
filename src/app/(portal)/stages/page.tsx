import type { Metadata } from 'next';
import { StagesCatalogClient } from '@/domains/portal/components/StagesCatalogClient';
import { allStageSlots } from '@/domains/portal/lib/portal-master';

export const metadata: Metadata = {
  title: 'ステージタイムテーブル',
};

export default function StagesPage() {
  return (
    <main className="portal-main">
      <section className="page-head">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <h1 className="sec-title">ステージタイムテーブル</h1>
          <span className="tag num">{allStageSlots.length} 枠</span>
        </div>
        <p className="meta-text">
          体育館・音楽室・視聴覚室のタイムテーブルです。後夜祭ステージは在校生限定となります。
        </p>
      </section>

      <StagesCatalogClient slots={allStageSlots} />
    </main>
  );
}
