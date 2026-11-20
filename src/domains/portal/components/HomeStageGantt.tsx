'use client';

import { useEffect, useRef, useState } from 'react';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import type { StageSlotMaster, StageVenueId } from '@/types/domain';

const GANTT_LANES: ReadonlyArray<{ readonly id: StageVenueId; readonly label: string }> = [
  { id: 'gym_stage', label: '体育館' },
  { id: 'admin_3f_av_room', label: '視聴覚室' },
  { id: 'student_4f_music_room', label: '音楽室' },
];

const START_HOUR = 9;
const TOTAL_HOURS = 10; // 09:00〜18:00台（09:00〜19:00）
const HOURS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
] as const;

const DAY1_JST_DATE = '2027-09-10';
const DAY2_JST_DATE = '2027-09-11';

function pad2(v: number): string {
  return String(v).padStart(2, '0');
}

function getJstNowParts(now: Date = new Date()): {
  readonly isoDate: string;
  readonly decHour: number;
  readonly label: string;
} {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = pad2(jst.getUTCMonth() + 1);
  const date = pad2(jst.getUTCDate());
  const hour = jst.getUTCHours();
  const minute = jst.getUTCMinutes();
  return {
    isoDate: `${year}-${month}-${date}`,
    decHour: hour + minute / 60,
    label: `${pad2(hour)}:${pad2(minute)}`,
  };
}

function detectFestivalDay(isoDate: string): 1 | 2 {
  if (isoDate === DAY2_JST_DATE) {
    return 2;
  }
  if (isoDate === DAY1_JST_DATE) {
    return 1;
  }
  // 事前期間（開催前）は DAY 1 をデフォルト表示
  return 1;
}

function hhmmToHours(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  return Number(hStr) + Number(mStr) / 60;
}

/**
 * トップページ／ステージページ「ステージ タイムテーブル」Day1 / Day2 ガントチャート
 * - 09:00〜18:00台（10列）表示
 * - JST 日付に基づく DAY1 / DAY2 自動判別
 * - 現在時刻の赤いライン表示＋初期表示時の現在時刻位置への自動スクロール
 */
export function HomeStageGantt({
  slots,
  highlightVenueId = 'all',
  hideViewAllLink = false,
}: {
  readonly slots: readonly StageSlotMaster[];
  readonly highlightVenueId?: StageVenueId | 'all';
  readonly hideViewAllLink?: boolean;
}) {
  const [day, setDay] = useState<1 | 2>(1);
  const [nowState, setNowState] = useState<{
    readonly pct: number;
    readonly label: string;
  } | null>(null);
  const { showToast } = usePortalToast();

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const userSelectedDayRef = useRef<boolean>(false);
  const hasAutoScrolledRef = useRef<boolean>(false);

  useEffect(() => {
    const syncClockAndDay = () => {
      const { isoDate, decHour, label } = getJstNowParts();
      if (!userSelectedDayRef.current) {
        setDay(detectFestivalDay(isoDate));
      }
      if (decHour >= START_HOUR && decHour <= START_HOUR + TOTAL_HOURS) {
        const pct = ((decHour - START_HOUR) / TOTAL_HOURS) * 100;
        setNowState({ pct, label });

        const scroller = scrollerRef.current;
        if (scroller && !hasAutoScrolledRef.current) {
          hasAutoScrolledRef.current = true;
          window.requestAnimationFrame(() => {
            const targetX = (pct / 100) * scroller.scrollWidth - scroller.clientWidth / 2;
            const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
            scroller.scrollTo({
              left: Math.max(0, Math.min(maxScroll, targetX)),
              behavior: 'auto',
            });
          });
        }
      } else {
        setNowState(null);
      }
    };

    syncClockAndDay();
    const id = window.setInterval(syncClockAndDay, 30_000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const daySlots = slots.filter((s) => s.day === day);

  return (
    <section aria-labelledby="h-stage">
      <div className="sec-head">
        <h2 className="sec-title" id="h-stage">
          ステージ タイムテーブル
        </h2>
        {!hideViewAllLink ? (
          <PortalLink href="/stages" className="sec-link">
            すべて見る <PortalIcon name="arrow-right" size={15} />
          </PortalLink>
        ) : null}
      </div>

      <div className="day-selector" role="tablist" aria-label="開催日切替">
        <button
          type="button"
          role="tab"
          aria-selected={day === 1}
          className={day === 1 ? 'day-btn num active' : 'day-btn num'}
          onClick={() => {
            userSelectedDayRef.current = true;
            setDay(1);
          }}
        >
          DAY 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={day === 2}
          className={day === 2 ? 'day-btn num active' : 'day-btn num'}
          onClick={() => {
            userSelectedDayRef.current = true;
            setDay(2);
          }}
        >
          DAY 2
        </button>
      </div>

      <div className="gantt">
        <div className="gantt-side">
          <div>場所</div>
          {GANTT_LANES.map((lane) => (
            <div
              key={lane.id}
              className={highlightVenueId === lane.id ? 'gantt-lane-active' : undefined}
            >
              {lane.label}
            </div>
          ))}
        </div>
        <div ref={scrollerRef} className="gantt-scroll">
          <div className="gantt-canvas">
            <div className="gantt-head num">
              {HOURS.map((hour) => (
                <div key={hour}>{hour}</div>
              ))}
            </div>
            {GANTT_LANES.map((lane) => (
              <div
                key={lane.id}
                className={
                  highlightVenueId !== 'all' && highlightVenueId !== lane.id
                    ? 'gantt-row dimmed'
                    : 'gantt-row'
                }
              >
                {(() => {
                  const laneSlots = daySlots
                    .filter((slot) => slot.venueId === lane.id)
                    .sort((a, b) => hhmmToHours(a.startTime) - hhmmToHours(b.startTime));

                  return laneSlots.map((slot, slotIdx) => {
                    const startH = hhmmToHours(slot.startTime);
                    const endH = hhmmToHours(slot.endTime);
                    const leftPct = Math.max(0, ((startH - START_HOUR) / TOTAL_HOURS) * 100);
                    const rawWidthPct = ((endH - startH) / TOTAL_HOURS) * 100;
                    const nextSlot = laneSlots[slotIdx + 1];
                    const maxUntilNextPct = nextSlot
                      ? Math.max(
                          rawWidthPct,
                          ((hhmmToHours(nextSlot.startTime) - START_HOUR) / TOTAL_HOURS) * 100 -
                            leftPct -
                            0.3,
                        )
                      : 100 - leftPct;
                    const widthPct = Math.min(
                      100 - leftPct,
                      maxUntilNextPct,
                      Math.max(2.4, rawWidthPct),
                    );
                    const cls = slot.sessionType === 'after_festival' ? 'bar after' : 'bar';
                    const posStyle = {
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    };

                    if (slot.linkedProjectId) {
                      return (
                        <PortalLink
                          key={slot.id}
                          href={`/projects/${slot.linkedProjectId}`}
                          className={cls}
                          style={posStyle}
                        >
                          <b>{slot.groupName}</b>
                          <small>{slot.title}</small>
                        </PortalLink>
                      );
                    }

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={cls}
                        style={posStyle}
                        onClick={() =>
                          showToast(
                            `${slot.title}（${slot.startTime}–${slot.endTime} / ${slot.venueLabel}）`,
                          )
                        }
                      >
                        <b>{slot.groupName}</b>
                        <small>{slot.title}</small>
                      </button>
                    );
                  });
                })()}
              </div>
            ))}
            {nowState !== null ? (
              <div
                className="now-line"
                style={{ left: `${nowState.pct}%` }}
                aria-hidden="true"
              >
                <span className="now-pill num">{nowState.label}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
