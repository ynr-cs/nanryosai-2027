import Image from 'next/image';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { PortalSmokeStatus } from '@/domains/portal/components/PortalSmokeStatus';
import {
  allProjects,
  allStageSlots,
  campusMapData,
  getTotalIndoorRoomCount,
} from '@/domains/portal/lib/master-data';
import type { ProjectCategory } from '@/types/domain';

const CATEGORY_LABELS: Readonly<Record<ProjectCategory, { label: string; badgeClass: string }>> = {
  cooking: { label: '調理・屋台', badgeClass: 'badge badge-cooking' },
  shop: { label: '室内販売・カフェ', badgeClass: 'badge badge-shop' },
  exhibit: { label: '展示・体験', badgeClass: 'badge badge-exhibit' },
  stage: { label: 'ステージ発表', badgeClass: 'badge badge-stage' },
};

export default function PortalHomePage() {
  const indoorRoomCount = getTotalIndoorRoomCount();

  return (
    <>
      <section className="card stack-md">
        <div className="row-wrap">
          <span className="badge badge-stage">Phase 1 土台稼働中</span>
          <span className="meta-text">
            二層物理分離アーキテクチャ（Webポータル層 / MOP・有人POS層 完全疎結合）
          </span>
        </div>
        <h1>第25回 南陵祭2027 デジタル基盤</h1>
        <p className="meta-text">
          正規化キャンパスマップ（屋内 {indoorRoomCount} 室 ＋ 屋外・特別 {campusMapData.spots.length}{' '}
          スポット / {campusMapData.buildings.length} 棟 / バスアクセス{' '}
          {campusMapData.accessRoutes.length} 経路）・検証用企画 {allProjects.length} 件・ステージ枠{' '}
          {allStageSlots.length} 件を静的0ms描画用に統合済みです。
        </p>
      </section>

      <PortalSmokeStatus />

      <section className="stack-md" aria-labelledby="projects-heading">
        <h2 id="projects-heading">検証用企画マスタ一覧（`prefetch=false` 帯域保護リンク）</h2>
        <div className="grid-cards">
          {allProjects.map((project) => {
            const cat = CATEGORY_LABELS[project.category];
            return (
              <article key={project.id} className="card stack-md">
                <div className="row-wrap">
                  <span className={cat.badgeClass}>{cat.label}</span>
                  <span className="meta-text">{project.placeLabel}</span>
                </div>
                {project.hasCoverImage ? (
                  <Image
                    src={`/images/projects/${project.id}_thumb.webp`}
                    alt={`${project.name} のサムネイル`}
                    width={400}
                    height={300}
                  />
                ) : (
                  <div className="code-pill" aria-label="画像未提出プレースホルダー">
                    画像準備中（404リクエストゼロ描画）
                  </div>
                )}
                <div>
                  <h3>{project.name}</h3>
                  <p className="meta-text">{project.groupName}</p>
                </div>
                <p>{project.catchphrase}</p>
                <PortalLink href={`/projects/${project.id}`} className="btn">
                  企画詳細を見る
                </PortalLink>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card stack-md" aria-labelledby="stages-heading">
        <h2 id="stages-heading">検証用ステージタイムテーブル抜粋</h2>
        <div className="stack-md">
          {allStageSlots.map((slot) => (
            <div key={slot.id} className="row-wrap">
              <span className="code-pill">
                Day{slot.day} {slot.startTime}-{slot.endTime}
              </span>
              <span className="badge badge-stage">{slot.venueLabel}</span>
              {slot.sessionType === 'after_festival' ? (
                <span className="badge badge-danger">後夜祭・在校生限定</span>
              ) : null}
              <strong>{slot.title}</strong>
              <span className="meta-text">({slot.groupName})</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
