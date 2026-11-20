'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalLiveState } from '@/domains/portal/context/LiveStateProvider';
import type { StageSlotMaster, StageVenueId } from '@/types/domain';

type VenueLayoutMode = 'bar' | 'grid';

const VENUES: ReadonlyArray<{
  readonly id: StageVenueId;
  readonly label: string;
}> = [
  { id: 'gym_stage', label: '体育館' },
  { id: 'student_4f_music_room', label: '音楽室' },
  { id: 'admin_3f_av_room', label: '視聴覚室' },
];

const CONGESTION_TEXT: Readonly<Record<string, string>> = {
  low: '空きあり',
  medium: 'やや混雑',
  high: '混雑',
  restricted: '入場制限中',
};

function shortGroupLabel(raw: string): string {
  return raw.replace(/^【検証用】/, '');
}

function HomeLiveVenuesInner({
  slots,
  layoutMode,
  showCompareToggle,
}: {
  readonly slots: readonly StageSlotMaster[];
  readonly layoutMode: VenueLayoutMode;
  readonly showCompareToggle: boolean;
}) {
  const { data } = usePortalLiveState();

  return (
    <section aria-labelledby="h-live">
      <div className="sec-head">
        <div className="sec-title-group">
          <h2 className="sec-title" id="h-live">
            リアルタイム情報
          </h2>
          {showCompareToggle ? (
            <div className="venue-compare-switch" role="group" aria-label="表示比較切替">
              <PortalLink
                href="/?venues=bar"
                className={layoutMode === 'bar' ? 'vcs-btn active' : 'vcs-btn'}
                scroll={false}
              >
                横長バー
              </PortalLink>
              <PortalLink
                href="/?venues=grid"
                className={layoutMode === 'grid' ? 'vcs-btn active' : 'vcs-btn'}
                scroll={false}
              >
                3列
              </PortalLink>
            </div>
          ) : null}
        </div>
        <span className="live-badge num">LIVE</span>
      </div>
      <div className="venue-grid" data-venue-layout={layoutMode}>
        {VENUES.map((venue) => {
          const venueSlots = [...slots]
            .filter((s) => s.venueId === venue.id)
            .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));

          const live = data.venues[venue.id];
          const liveSlot = live?.currentSlotId
            ? venueSlots.find((s) => s.id === live.currentSlotId)
            : undefined;
          const nowSlot = liveSlot ?? venueSlots[0];

          const nowIndex = nowSlot ? venueSlots.findIndex((s) => s.id === nowSlot.id) : -1;
          const nextSlot = nowIndex >= 0 ? venueSlots[nowIndex + 1] : undefined;

          const statusText = live
            ? (CONGESTION_TEXT[live.congestion] ?? '開催中')
            : venue.id === 'admin_3f_av_room'
              ? 'まもなく'
              : '上演予定';
          const statusClass =
            live?.congestion === 'high' || live?.congestion === 'restricted'
              ? 'venue-status'
              : live
                ? 'venue-status soon'
                : venue.id === 'admin_3f_av_room'
                  ? 'venue-status soon'
                  : 'venue-status';

          const timeLabel = nowSlot ? `${nowSlot.startTime} – ${nowSlot.endTime}` : '日程確定後に更新';
          const delayNote =
            live && live.delayMinutes > 0 ? ` (+${live.delayMinutes}分)` : '';

          return (
            <div key={venue.id} className="venue-card">
              <div className="venue-head">
                <h3 className="venue-name">{venue.label}</h3>
                <span className={statusClass}>
                  <span className="dot" aria-hidden="true" />
                  {statusText}
                </span>
                <span className="venue-time venue-time-bar num">
                  {timeLabel}
                  {delayNote}
                </span>
              </div>
              <div className="venue-now">
                <span className="venue-now-pill num">NOW</span>
                <div className="venue-now-body">
                  <div className="venue-group">
                    {nowSlot ? shortGroupLabel(nowSlot.groupName) : 'スケジュール確認'}
                  </div>
                  <div className="venue-time venue-time-grid num">
                    {timeLabel}
                    {delayNote}
                  </div>
                </div>
              </div>
              <div className="venue-next">
                <span className="venue-next-label num">NEXT</span>
                <span className="venue-next-title">
                  {nextSlot ? nextSlot.title : 'タイムテーブル参照'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomeLiveVenuesWithQuery({ slots }: { readonly slots: readonly StageSlotMaster[] }) {
  const searchParams = useSearchParams();
  const venuesParam = searchParams.get('venues');
  const layoutMode: VenueLayoutMode = venuesParam === 'grid' ? 'grid' : 'bar';
  const showCompareToggle = venuesParam === 'grid' || venuesParam === 'bar';

  return (
    <HomeLiveVenuesInner
      slots={slots}
      layoutMode={layoutMode}
      showCompareToggle={showCompareToggle}
    />
  );
}

/**
 * トップページ「リアルタイム情報」3会場 NOW / NEXT
 * - スマホ（<= 640px）ではデフォルトで縦積み横長バー表示（`?venues=grid` で旧3列比較可）
 * - Static Export の CSR 退行防止のため `useSearchParams()` を `<Suspense>` で分離
 */
export function HomeLiveVenues({ slots }: { readonly slots: readonly StageSlotMaster[] }) {
  return (
    <Suspense
      fallback={
        <HomeLiveVenuesInner slots={slots} layoutMode="bar" showCompareToggle={false} />
      }
    >
      <HomeLiveVenuesWithQuery slots={slots} />
    </Suspense>
  );
}
