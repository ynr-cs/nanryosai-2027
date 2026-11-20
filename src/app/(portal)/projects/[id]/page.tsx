import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FavoriteButton } from '@/domains/portal/components/FavoriteButton';
import { OrderEntrySlot } from '@/domains/portal/components/OrderEntrySlot';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import {
  allProjects,
  findProjectById,
  getStageSlotsForProject,
} from '@/domains/portal/lib/portal-master';
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
    <main className="portal-main">
      <article className="stack-lg">
        <div className="card stack-md">
          <div className="row-wrap">
            <span className="badge badge-stage">{project.groupName}</span>
            <span className="code-pill">{project.placeLabel}</span>
            {project.roomId ? <span className="meta-text">RoomID: {project.roomId}</span> : null}
          </div>
          <h1 className="page-title">{project.name}</h1>
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
              style={{ borderRadius: '14px' }}
            />
          ) : null}
          <p>{project.description}</p>

          <div className="row-wrap">
            <FavoriteButton projectId={project.id} projectName={project.name} />
            {!project.hiddenOnMap ? (
              <PortalLink href={`/map?project=${project.id}`} className="btn">
                この場所をマップで見る
              </PortalLink>
            ) : null}
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="btn">
                公式Instagram (@{project.instagramHandle})
              </a>
            ) : null}
          </div>
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
                  style={{ borderRadius: '12px' }}
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
                      style={{ borderRadius: '12px' }}
                    />
                  ) : null}
                  <div className="row-wrap">
                    <strong>{item.name}</strong>
                    {item.priceYen !== undefined ? (
                      <span className="badge badge-cooking num">{item.priceYen}円</span>
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
                <span className="code-pill num">
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

        {/* D-004: 3段階キルスイッチ内蔵 MOP連携枠（portal層はmop層のコードを1行もimportしない） */}
        <OrderEntrySlot project={project} />

        <div className="row-wrap">
          <PortalLink href="/projects" className="btn">
            企画一覧へ戻る
          </PortalLink>
          <PortalLink href="/" className="btn">
            トップページへ戻る
          </PortalLink>
        </div>
      </article>
    </main>
  );
}
