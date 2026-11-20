'use client';

import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalLiveState } from '@/domains/portal/context/LiveStateProvider';
import type { StageSlotMaster, StageVenueId } from '@/types/domain';

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

/**
 * トップページ「リアルタイム情報」3会場 NOW / NEXT
 * - スマホ（<= 640px）では縦積み横長バー、PC/タブレットでは3列グリッドとしてレスポンシブ表示
 * - 各カード／バーのタップで該当会場のステージ詳細（/stages?venue=...）へ遷移し、
 *   出演団体に企画ページがある場合は NOW 枠から直接企画詳細へも移動可能
 */
export function HomeLiveVenues({ slots }: { readonly slots: readonly StageSlotMaster[] }) {
  const { data } = usePortalLiveState();

  return (
    <section aria-labelledby="h-live">
      <div className="sec-head">
        <h2 className="sec-title" id="h-live">
          リアルタイム情報
        </h2>
        <span className="live-badge num">LIVE</span>
      </div>
      <div className="venue-grid">
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

          const timeLabel = nowSlot
            ? `${nowSlot.startTime} – ${nowSlot.endTime}`
            : '日程確定後に更新';
          const delayNote =
            live && live.delayMinutes > 0 ? ` (+${live.delayMinutes}分)` : '';

          const nowGroupName = nowSlot ? nowSlot.groupName : 'スケジュール確認';

          return (
            <div key={venue.id} className="venue-card">
              <div className="venue-head">
                <h3 className="venue-name">
                  <PortalLink
                    href={`/stages?venue=${venue.id}`}
                    className="venue-card-link"
                    aria-label={`${venue.label}のステージタイムテーブルを見る`}
                  >
                    <span>{venue.label}</span>
                    <PortalIcon name="chevron-right" size={14} className="venue-arrow" />
                  </PortalLink>
                </h3>
                <span className={statusClass}>
                  <span className="dot" aria-hidden="true" />
                  {statusText}
                </span>
                <span className="venue-time venue-time-bar num">
                  {timeLabel}
                  {delayNote}
                </span>
              </div>

              {nowSlot?.linkedProjectId ? (
                <PortalLink
                  href={`/projects/${nowSlot.linkedProjectId}`}
                  className="venue-now venue-now-link"
                  aria-label={`${nowGroupName} の企画詳細を見る`}
                >
                  <span className="venue-now-pill num">NOW</span>
                  <div className="venue-now-body">
                    <div className="venue-group">{nowGroupName}</div>
                    <div className="venue-time venue-time-grid num">
                      {timeLabel}
                      {delayNote}
                    </div>
                  </div>
                  <PortalIcon name="chevron-right" size={14} className="venue-now-arrow" />
                </PortalLink>
              ) : (
                <div className="venue-now">
                  <span className="venue-now-pill num">NOW</span>
                  <div className="venue-now-body">
                    <div className="venue-group">{nowGroupName}</div>
                    <div className="venue-time venue-time-grid num">
                      {timeLabel}
                      {delayNote}
                    </div>
                  </div>
                </div>
              )}

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
