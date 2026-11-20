'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { PortalLink } from '@/domains/portal/components/PortalLink';

const DAY1_START_MS = new Date('2027-09-10T09:00:00+09:00').getTime();
const DAY1_END_MS = new Date('2027-09-10T17:00:00+09:00').getTime();
const DAY2_START_MS = new Date('2027-09-11T09:00:00+09:00').getTime();
const DAY2_END_MS = new Date('2027-09-11T17:30:00+09:00').getTime();
const ONE_DAY_MS = 86_400_000;

const pad2 = (v: number): string => String(v).padStart(2, '0');

type CountdownPreviewMode = 'under24h' | 'last10s' | 'live' | 'live1' | 'ended';

type FestivalPhase =
  | {
      readonly kind: 'countdown';
      readonly under24h: boolean;
      readonly label: string;
      readonly days: string;
      readonly hours: string;
      readonly mins: string;
      readonly secs: string;
      readonly secTick: number;
    }
  | {
      readonly kind: 'live';
      readonly dayLabel: string;
      readonly title: string;
      readonly sub: string;
    }
  | {
      readonly kind: 'ended';
      readonly title: string;
      readonly sub: string;
    };

const INITIAL_PHASE: FestivalPhase = {
  kind: 'countdown',
  under24h: false,
  label: '開催まであと',
  days: '---',
  hours: '--',
  mins: '--',
  secs: '--',
  secTick: 0,
};

function parsePreviewMode(raw: string | null): CountdownPreviewMode | null {
  if (
    raw === 'under24h' ||
    raw === 'last10s' ||
    raw === 'live' ||
    raw === 'live1' ||
    raw === 'ended'
  ) {
    return raw;
  }
  return null;
}

function getPreviewBaseNowMs(mode: CountdownPreviewMode): number {
  switch (mode) {
    case 'under24h':
      // 開幕 23時間59分50秒前（1日未満の特別アニメーション確認用）
      return DAY1_START_MS - (ONE_DAY_MS - 10_000);
    case 'last10s':
      // 開幕 8秒前（0秒到達→「開催中！」自動切替のリアルタイム確認用）
      return DAY1_START_MS - 8_000;
    case 'live1':
      return DAY1_START_MS + 3_600_000;
    case 'live':
      return DAY2_START_MS + 3_600_000;
    case 'ended':
      return DAY2_END_MS + 3_600_000;
  }
}

function computeFestivalPhase(nowMs: number): FestivalPhase {
  if (nowMs < DAY1_START_MS) {
    const diff = Math.max(0, DAY1_START_MS - nowMs);
    const totalSecs = Math.floor(diff / 1_000);
    return {
      kind: 'countdown',
      under24h: diff <= ONE_DAY_MS,
      label: diff <= ONE_DAY_MS ? 'まもなく開幕！開催まであと' : '開催まであと',
      days: String(Math.floor(diff / ONE_DAY_MS)),
      hours: pad2(Math.floor((diff % ONE_DAY_MS) / 3_600_000)),
      mins: pad2(Math.floor((diff % 3_600_000) / 60_000)),
      secs: pad2(Math.floor((diff % 60_000) / 1_000)),
      secTick: totalSecs,
    };
  }

  if (nowMs < DAY1_END_MS) {
    return {
      kind: 'live',
      dayLabel: 'DAY 1 校内発表',
      title: '南陵祭 2027 開催中！',
      sub: '校内ステージ・企画をリアルタイム案内中',
    };
  }

  if (nowMs < DAY2_START_MS) {
    const diff = Math.max(0, DAY2_START_MS - nowMs);
    const totalSecs = Math.floor(diff / 1_000);
    return {
      kind: 'countdown',
      under24h: true,
      label: 'DAY 2 一般公開まであと',
      days: String(Math.floor(diff / ONE_DAY_MS)),
      hours: pad2(Math.floor((diff % ONE_DAY_MS) / 3_600_000)),
      mins: pad2(Math.floor((diff % 3_600_000) / 60_000)),
      secs: pad2(Math.floor((diff % 60_000) / 1_000)),
      secTick: totalSecs,
    };
  }

  if (nowMs <= DAY2_END_MS) {
    return {
      kind: 'live',
      dayLabel: 'DAY 2 一般公開',
      title: '南陵祭 2027 開催中！',
      sub: '10:00〜15:00 一般公開・各模擬店＆ステージ開催中',
    };
  }

  return {
    kind: 'ended',
    title: '第25回 南陵祭 2027 閉幕',
    sub: 'ご来場ありがとうございました！',
  };
}

const PREVIEW_LINKS: ReadonlyArray<{
  readonly mode: CountdownPreviewMode | 'normal';
  readonly label: string;
}> = [
  { mode: 'normal', label: '実時刻' },
  { mode: 'under24h', label: '1日未満' },
  { mode: 'last10s', label: '開幕8秒前' },
  { mode: 'live', label: '開催中' },
  { mode: 'ended', label: '閉幕' },
];

function HomeCountdownInner({
  previewMode,
}: {
  readonly previewMode: CountdownPreviewMode | null;
}) {
  const [phase, setPhase] = useState<FestivalPhase>(INITIAL_PHASE);

  const previewOffsetMs = useMemo(() => {
    if (!previewMode) {
      return 0;
    }
    return getPreviewBaseNowMs(previewMode) - Date.now();
  }, [previewMode]);

  useEffect(() => {
    const update = () => {
      const simulatedNow = Date.now() + previewOffsetMs;
      setPhase(computeFestivalPhase(simulatedNow));
    };
    update();
    const id = window.setInterval(update, 1_000);
    return () => {
      window.clearInterval(id);
    };
  }, [previewOffsetMs]);

  return (
    <section
      className={
        phase.kind === 'countdown' && phase.under24h
          ? 'countdown countdown-imminent'
          : 'countdown'
      }
      aria-label={phase.kind === 'countdown' ? phase.label : phase.title}
    >
      {phase.kind === 'countdown' ? (
        <>
          <h2 className="countdown-label">
            {phase.under24h ? (
              <span className="countdown-imminent-pill">24H COUNTDOWN</span>
            ) : null}
            <span>{phase.label}</span>
          </h2>
          <div className="timer">
            <div className="time-box">
              <span className="time-value num">{phase.days}</span>
              <span className="time-unit num">DAYS</span>
            </div>
            <div className="time-box">
              <span className="time-value num">{phase.hours}</span>
              <span className="time-unit num">HOURS</span>
            </div>
            <div className="time-box">
              <span className="time-value num">{phase.mins}</span>
              <span className="time-unit num">MINS</span>
            </div>
            <div
              className={phase.under24h ? 'time-box time-box-secs' : 'time-box'}
              data-tick={phase.under24h ? phase.secTick % 2 : undefined}
            >
              <span className="time-value num">{phase.secs}</span>
              <span className="time-unit num">SECS</span>
            </div>
          </div>
        </>
      ) : phase.kind === 'live' ? (
        <div className="countdown-live-card" role="status">
          <span className="countdown-live-badge num">
            <span className="countdown-live-dot" aria-hidden="true" />
            NOW OPEN · {phase.dayLabel}
          </span>
          <h2 className="countdown-live-title">{phase.title}</h2>
          <p className="countdown-live-sub">{phase.sub}</p>
        </div>
      ) : (
        <div className="countdown-ended-card" role="status">
          <h2 className="countdown-ended-title">{phase.title}</h2>
          <p className="countdown-live-sub">{phase.sub}</p>
        </div>
      )}

      {previewMode ? (
        <div className="countdown-preview-bar" role="group" aria-label="カウントダウン状態確認">
          {PREVIEW_LINKS.map((item) => {
            const href = item.mode === 'normal' ? '/' : `/?countdown=${item.mode}`;
            const isActive = previewMode === item.mode;
            return (
              <PortalLink
                key={item.mode}
                href={href}
                scroll={false}
                className={isActive ? 'cdp-btn active' : 'cdp-btn'}
              >
                {item.label}
              </PortalLink>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function HomeCountdownWithQuery() {
  const searchParams = useSearchParams();
  const previewMode = parsePreviewMode(
    searchParams.get('countdown') ?? searchParams.get('cd'),
  );
  return <HomeCountdownInner previewMode={previewMode} />;
}

/**
 * 開催カウントダウン4ボックス（SSRハイドレーション不一致ゼロ設計）
 * - 開幕24時間前（1日未満）で特別アニメーションモードへ切替
 * - 開催時間帯（Day1 / Day2）は「開催中！」バナーへ自動切替
 * - 一時確認クエリ: `?countdown=under24h | last10s | live | live1 | ended`
 */
export function HomeCountdown() {
  return (
    <Suspense fallback={<HomeCountdownInner previewMode={null} />}>
      <HomeCountdownWithQuery />
    </Suspense>
  );
}
