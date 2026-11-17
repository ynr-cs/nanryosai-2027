import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import {
  allProjects,
  findProjectById,
  getStageSlotsForProject,
} from '@/domains/portal/lib/master-data';
import { isMopBuildEnabled } from '@/lib/env';
import { buildInstagramProfileUrl } from '@/lib/url-safety';

export function generateStaticParams(): Array<{ id: string }> {
  return allProjects.map((project) => ({
    id: project.id,
  }));
}

export default async function ProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = findProjectById(id);
  if (!project) {
    notFound();
  }

  const instagramUrl = buildInstagramProfileUrl(project.instagramHandle);
  const relatedSlots = getStageSlotsForProject(project.id);
  const galleryIndices = Array.from({ length: project.galleryCount }, (_, i) => i + 1);

  return (
    <article className="stack-lg">
      <div className="card stack-md">
        <div className="row-wrap">
          <span className="badge badge-stage">{project.groupName}</span>
          <span className="code-pill">{project.placeLabel}</span>
          {project.roomId ? <span className="meta-text">RoomID: {project.roomId}</span> : null}
        </div>
        <h1>{project.name}</h1>
        <p>{project.catchphrase}</p>
        {project.subPlaceNote ? (
          <p className="meta-text">補足会場案内: {project.subPlaceNote}</p>
        ) : null}
        {project.hasCoverImage ? (
          <Image
            src={`/images/projects/${project.id}_hero.webp`}
            alt={`${project.name} のメイン画像`}
            width={800}
            height={600}
            priority
          />
        ) : null}
        <p>{project.description}</p>

        {instagramUrl ? (
          <div>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="btn">
              公式Instagram (@{project.instagramHandle}) を開く
            </a>
          </div>
        ) : null}
      </div>

      {galleryIndices.length > 0 ? (
        <section className="card stack-md" aria-labelledby="gallery-heading">
          <h2 id="gallery-heading">フォトギャラリー</h2>
          <div className="grid-cards">
            {galleryIndices.map((idx) => (
              <Image
                key={idx}
                src={`/images/projects/${project.id}_${idx}.webp`}
                alt={`${project.name} ギャラリー画像 ${idx}`}
                width={800}
                height={600}
              />
            ))}
          </div>
        </section>
      ) : null}

      {project.menu.length > 0 ? (
        <section className="card stack-md" aria-labelledby="menu-heading">
          <h2 id="menu-heading">提供メニュー・オプション</h2>
          {project.menuNote ? <p className="meta-text">{project.menuNote}</p> : null}
          <div className="grid-cards">
            {project.menu.map((item) => (
              <div key={item.id} className="card stack-md">
                {item.hasImage ? (
                  <Image
                    src={`/images/items/${item.id}.webp`}
                    alt={item.name}
                    width={400}
                    height={400}
                  />
                ) : null}
                <div className="row-wrap">
                  <strong>{item.name}</strong>
                  {item.priceYen !== undefined ? (
                    <span className="badge badge-cooking">{item.priceYen}円</span>
                  ) : null}
                </div>
                {item.description ? <p className="meta-text">{item.description}</p> : null}
                {item.optionGroups?.map((group) => (
                  <div key={group.id} className="meta-text">
                    {group.label}:{' '}
                    {group.choices
                      .map((c) =>
                        c.priceDeltaYen > 0 ? `${c.label}(+${c.priceDeltaYen}円)` : c.label,
                      )
                      .join(' / ')}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relatedSlots.length > 0 ? (
        <section className="card stack-md" aria-labelledby="related-stages-heading">
          <h2 id="related-stages-heading">出演スケジュール</h2>
          {relatedSlots.map((slot) => (
            <div key={slot.id} className="row-wrap">
              <span className="code-pill">
                Day{slot.day} {slot.startTime}-{slot.endTime}
              </span>
              <span className="badge badge-stage">{slot.venueLabel}</span>
              {slot.sessionType === 'after_festival' ? (
                <span className="badge badge-danger">後夜祭・在校生限定</span>
              ) : null}
              <span>{slot.title}</span>
            </div>
          ))}
        </section>
      ) : null}

      {/* D-004: MOP連携導線の疎結合キルスイッチ枠（portal層はmop層のコードを1行もimportせずURL遷移のみで分離） */}
      {project.mopConfig?.enabled && isMopBuildEnabled ? (
        <section className="card stack-md">
          <h2>店頭モバイルオーダー対象店舗</h2>
          <p className="meta-text">
            店頭の注文QR専用iPadをスキャンすると順番待ち受付が可能です（お支払いは商品受取時のAirPAY決済）。
          </p>
          <div>
            <PortalLink href={`/order?store=${project.id}`} className="btn btn-primary">
              注文案内画面へ進む
            </PortalLink>
          </div>
        </section>
      ) : null}

      <div>
        <PortalLink href="/" className="btn">
          トップページへ戻る
        </PortalLink>
      </div>
    </article>
  );
}
