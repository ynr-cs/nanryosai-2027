'use client';

import { useEffect, useState } from 'react';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalToast } from '@/domains/portal/components/PortalToastContext';
import type { StageSlotMaster, StageVenueId } from '@/types/domain';

const GANTT_LANES: ReadonlyArray<{ readonly id: StageVenueId; readonly label: string }> = [
  { id: 'gym_stage', label: '体育館' },
  { id: 'admin_3f_av_room', label: '視聴覚室' },
  { id: 'student_4f_music_room', label: '音楽室' },
];

const HOURS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'] as const;

function hhmmToHours(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  return Number(hStr) + Number(mStr) / 60;
}

/**
 * トップページ／ステージページ「ステージ タイムテーブル」Day1 / Day2 ガントチャート
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
  const [day, setDay] = useState<1 | 2>(2);
  const [nowPct, setNowPct] = useState<number | null>(null);
  const { showToast } = usePortalToast();

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const decHour = now.getHours() + now.getMinutes() / 60;
      if (decHour >= 10 && decHour <= 17) {
        setNowPct(((decHour - 10) / 7) * 100);
      } else {
        setNowPct(null);
      }
    };
    updateNow();
    const id = window.setInterval(updateNow, 60_000);
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
          onClick={() => setDay(1)}
        >
          DAY 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={day === 2}
          className={day === 2 ? 'day-btn num active' : 'day-btn num'}
          onClick={() => setDay(2)}
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
        <div className="gantt-scroll">
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
                {daySlots
                  .filter((slot) => slot.venueId === lane.id)
                  .map((slot) => {
                    const startH = hhmmToHours(slot.startTime);
                    const endH = hhmmToHours(slot.endTime);
                    const leftPct = Math.max(0, ((startH - 10) / 7) * 100);
                    const widthPct = Math.max(9.5, ((endH - startH) / 7) * 100);
                    const cls = slot.sessionType === 'after_festival' ? 'bar after' : 'bar';
                    const posStyle = {
                      left: `${leftPct}%`,
                      width: `${Math.min(100 - leftPct, widthPct)}%`,
                    };

                    if (slot.linkedProjectId) {
                      return (
                        <PortalLink
                          key={slot.id}
                          href={`/projects/${slot.linkedProjectId}`}
                          className={cls}
                          style={posStyle}
                        >
                          <b>{slot.groupName.replace(/^【検証用】/, '')}</b>
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
                  })}
              </div>
            ))}
            {nowPct !== null ? (
              <div className="now-line" style={{ left: `${nowPct}%` }} aria-hidden="true" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
