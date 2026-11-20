'use client';

import { useEffect, useState } from 'react';

const TARGET_ISO = '2027-09-10T09:00:00+09:00';
const pad2 = (v: number): string => String(v).padStart(2, '0');

interface CountdownState {
  readonly days: string;
  readonly hours: string;
  readonly mins: string;
  readonly secs: string;
}

const INITIAL_COUNTDOWN: CountdownState = {
  days: '---',
  hours: '--',
  mins: '--',
  secs: '--',
};

/**
 * 開催カウントダウン4ボックス（SSRハイドレーション不一致ゼロ設計）
 */
export function HomeCountdown() {
  const [timeLeft, setTimeLeft] = useState<CountdownState>(INITIAL_COUNTDOWN);

  useEffect(() => {
    const targetMs = new Date(TARGET_ISO).getTime();
    const update = () => {
      const diff = Math.max(0, targetMs - Date.now());
      setTimeLeft({
        days: String(Math.floor(diff / 86_400_000)),
        hours: pad2(Math.floor((diff % 86_400_000) / 3_600_000)),
        mins: pad2(Math.floor((diff % 3_600_000) / 60_000)),
        secs: pad2(Math.floor((diff % 60_000) / 1_000)),
      });
    };
    update();
    const id = window.setInterval(update, 1_000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="countdown" aria-label="開催まであと">
      <h2 className="countdown-label">開催まであと</h2>
      <div className="timer">
        <div className="time-box">
          <span className="time-value num">{timeLeft.days}</span>
          <span className="time-unit num">DAYS</span>
        </div>
        <div className="time-box">
          <span className="time-value num">{timeLeft.hours}</span>
          <span className="time-unit num">HOURS</span>
        </div>
        <div className="time-box">
          <span className="time-value num">{timeLeft.mins}</span>
          <span className="time-unit num">MINS</span>
        </div>
        <div className="time-box">
          <span className="time-value num">{timeLeft.secs}</span>
          <span className="time-unit num">SECS</span>
        </div>
      </div>
    </section>
  );
}
