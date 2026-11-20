import type { Metadata } from 'next';
import { HomeStageGantt } from '@/domains/portal/components/HomeStageGantt';
import { PortalLink } from '@/domains/portal/components/PortalLink';
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
          体育館・視聴覚室・音楽室のタイムテーブルです。後夜祭ステージは在校生限定となります。
        </p>
      </section>

      <HomeStageGantt slots={allStageSlots} />

      <section className="card stack-md" aria-labelledby="stage-list-heading">
        <h2 id="stage-list-heading">全プログラム一覧</h2>
        {allStageSlots.map((slot) => (
          <div key={slot.id} className="row-wrap" style={{ paddingBlock: 4 }}>
            <span className="code-pill num">
              Day{slot.day} {slot.startTime}–{slot.endTime}
            </span>
            <span className="badge badge-stage">{slot.venueLabel}</span>
            {slot.sessionType === 'after_festival' ? (
              <span className="badge badge-danger">後夜祭・在校生限定</span>
            ) : null}
            <strong>{slot.title}</strong>
            <span className="meta-text">({slot.groupName})</span>
            {slot.linkedProjectId ? (
              <PortalLink href={`/projects/${slot.linkedProjectId}`} className="sec-link">
                企画詳細
              </PortalLink>
            ) : null}
          </div>
        ))}
      </section>
    </main>
  );
}
