'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { HomeStageGantt } from '@/domains/portal/components/HomeStageGantt';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalLiveState } from '@/domains/portal/context/LiveStateProvider';
import type { StageSlotMaster, StageVenueId } from '@/types/domain';

type VenueFilter = 'all' | StageVenueId;

const VENUE_TABS: ReadonlyArray<{ readonly id: VenueFilter; readonly label: string }> = [
  { id: 'all', label: 'すべての会場' },
  { id: 'gym_stage', label: '体育館' },
  { id: 'student_4f_music_room', label: '音楽室' },
  { id: 'admin_3f_av_room', label: '視聴覚室' },
];

const CONGESTION_LABEL: Readonly<Record<string, string>> = {
  low: '空きあり',
  medium: 'やや混雑',
  high: '混雑',
  restricted: '入場制限中',
};

function parseVenueParam(raw: string | null): VenueFilter {
  if (
    raw === 'gym_stage' ||
    raw === 'student_4f_music_room' ||
    raw === 'admin_3f_av_room'
  ) {
    return raw;
  }
  return 'all';
}

function StagesCatalogContent({
  slots,
  venueFilter,
  onSelectVenue,
}: {
  readonly slots: readonly StageSlotMaster[];
  readonly venueFilter: VenueFilter;
  readonly onSelectVenue: (v: VenueFilter) => void;
}) {
  const { data } = usePortalLiveState();

  const filteredSlots = useMemo(() => {
    const base =
      venueFilter === 'all' ? slots : slots.filter((s) => s.venueId === venueFilter);
    return [...base].sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  }, [slots, venueFilter]);

  const activeLive = venueFilter !== 'all' ? data.venues[venueFilter] : undefined;

  return (
    <>
      <div className="filter-row" role="tablist" aria-label="ステージ会場絞り込み">
        {VENUE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={venueFilter === tab.id}
            className={venueFilter === tab.id ? 'chip active' : 'chip'}
            onClick={() => onSelectVenue(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeLive ? (
        <div className="card row-wrap" role="status">
          <span className="badge badge-stage">
            {VENUE_TABS.find((t) => t.id === venueFilter)?.label}
          </span>
          <span className="badge badge-ok">
            混雑度: {CONGESTION_LABEL[activeLive.congestion] ?? '開催中'}
          </span>
          {activeLive.delayMinutes > 0 ? (
            <span className="badge badge-warn num">進行 +{activeLive.delayMinutes}分遅れ</span>
          ) : null}
          {activeLive.note ? <span className="meta-text">{activeLive.note}</span> : null}
        </div>
      ) : null}

      <HomeStageGantt
        slots={slots}
        highlightVenueId={venueFilter}
        hideViewAllLink
      />

      <section className="card stack-md" aria-labelledby="stage-list-heading">
        <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
          <h2 id="stage-list-heading">
            {venueFilter === 'all'
              ? '全プログラム一覧'
              : `${VENUE_TABS.find((t) => t.id === venueFilter)?.label} プログラム一覧`}
          </h2>
          <span className="tag num">{filteredSlots.length} 枠</span>
        </div>
        {filteredSlots.map((slot) => (
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
    </>
  );
}

function StagesCatalogWithQuery({ slots }: { readonly slots: readonly StageSlotMaster[] }) {
  const searchParams = useSearchParams();
  const urlVenue = parseVenueParam(searchParams.get('venue'));
  const [venueFilter, setVenueFilter] = useState<VenueFilter>(urlVenue);

  useEffect(() => {
    setVenueFilter(urlVenue);
  }, [urlVenue]);

  return (
    <StagesCatalogContent
      slots={slots}
      venueFilter={venueFilter}
      onSelectVenue={setVenueFilter}
    />
  );
}

/**
 * Static Export 環境で useSearchParams() がページ全体の CSR 退行を起こさないよう <Suspense> 分離
 */
export function StagesCatalogClient({ slots }: { readonly slots: readonly StageSlotMaster[] }) {
  return (
    <Suspense
      fallback={
        <StagesCatalogContent slots={slots} venueFilter="all" onSelectVenue={() => {}} />
      }
    >
      <StagesCatalogWithQuery slots={slots} />
    </Suspense>
  );
}
