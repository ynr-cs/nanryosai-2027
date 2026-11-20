import { HomeCountdown } from '@/domains/portal/components/HomeCountdown';
import { HomeLiveVenues } from '@/domains/portal/components/HomeLiveVenues';
import { HomeOrderPromo } from '@/domains/portal/components/HomeOrderPromo';
import { HomeProjectHighlights } from '@/domains/portal/components/HomeProjectHighlights';
import { HomeStageGantt } from '@/domains/portal/components/HomeStageGantt';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { allProjects, allStageSlots } from '@/domains/portal/lib/portal-master';

const ANNOUNCEMENTS = [
  {
    id: 'stage-tt',
    date: '2027.09.08',
    title: 'ステージタイムテーブルを公開しました',
    href: '/stages',
  },
  {
    id: 'mop-stores',
    date: '2027.09.05',
    title: 'モバイルオーダー対象の模擬店が決まりました',
    href: '/projects?mop=1',
  },
  {
    id: 'portal-open',
    date: '2027.09.01',
    title: '公式デジタルパンフレットを公開しました',
    href: '/guide#news',
  },
] as const;

export default function PortalHomePage() {
  return (
    <>
      <section className="hero" id="top">
        <span className="hero-badge num">2027.9.10 – 11</span>
        <h1 className="hero-title">
          南陵祭
          <br />
          2027
        </h1>
        <p className="hero-slogan">スローガン決定後にここへ入ります</p>
      </section>

      <HomeCountdown />

      <main className="portal-main">
        <HomeLiveVenues slots={allStageSlots} />

        <HomeProjectHighlights projects={allProjects} />

        <HomeOrderPromo />

        <HomeStageGantt slots={allStageSlots} />

        <section aria-label="開催概要">
          <div className="overview-card">
            <div className="ov-grid">
              <div className="ov-item">
                <div className="ov-icon" aria-hidden="true">
                  <PortalIcon name="calendar" size={22} />
                </div>
                <div>
                  <p className="ov-label">開催日程・時間</p>
                  <p className="ov-value">令和9年度 第25回 南陵祭</p>
                  <p className="ov-sub">
                    <strong>9月10日(金)</strong>：校内発表（一般来校不可）
                  </p>
                  <p className="ov-sub">
                    <strong>9月11日(土)</strong>：一般公開 10:00〜15:00
                  </p>
                </div>
              </div>
              <div className="ov-item">
                <div className="ov-icon" aria-hidden="true">
                  <PortalIcon name="geo-fill" size={22} />
                </div>
                <div>
                  <p className="ov-label">会場</p>
                  <p className="ov-value">神奈川県立 横浜南陵高等学校</p>
                  <p className="ov-sub">横浜市港南区日野中央2-26-1</p>
                  <PortalLink href="/guide#access" className="sec-link" style={{ marginTop: 6 }}>
                    <PortalIcon name="cursor" size={14} /> アクセス方法を見る
                  </PortalLink>
                </div>
              </div>
            </div>
            <div className="ov-divider" />
            <div className="notes">
              <h3 className="notes-title">
                <PortalIcon name="alert-triangle" size={18} /> ご来場の皆様へ
              </h3>
              <ol>
                <li>車でのご来場はご遠慮ください。公共交通機関をご利用ください。</li>
                <li>入場は正門のみです。必ず正門で受付をしてください。</li>
                <li>上履きは不要です（土足の一足制）。</li>
                <li>校内は完全キャッシュレスです。模擬店で現金は使えません。</li>
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-upd">
          <div className="sec-head">
            <h2 className="sec-title" id="h-upd">
              お知らせ
            </h2>
            <PortalLink href="/guide#news" className="sec-link">
              もっと見る <PortalIcon name="chevron-right" size={15} />
            </PortalLink>
          </div>
          <div className="upd-list">
            {ANNOUNCEMENTS.map((item) => (
              <PortalLink key={item.id} href={item.href} className="upd-item">
                <span className="upd-date num">{item.date}</span>
                <span className="upd-title">{item.title}</span>
              </PortalLink>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
