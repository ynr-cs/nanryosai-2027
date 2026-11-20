'use client';

import { useEffect, useState } from 'react';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';

const pad2 = (v: number): string => String(v).padStart(2, '0');

/**
 * トップページ「モバイルオーダー紹介バナー＋0.1秒時計付き引換券モック」(D-008)
 */
export function HomeOrderPromo() {
  const [clockText, setClockText] = useState<string>('--:--:--.-');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const tenth = Math.floor(now.getMilliseconds() / 100);
      setClockText(
        `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}.${tenth}`,
      );
    };
    updateClock();
    const id = window.setInterval(updateClock, 100);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <section aria-label="モバイルオーダー">
      <div className="promo">
        <div className="promo-body">
          <span className="promo-badge">店頭QRで受付・ログイン不要</span>
          <h2 className="promo-title">
            並ばずに注文、
            <br />
            呼ばれたら受け取るだけ。
          </h2>
          <p className="promo-desc">
            対象の模擬店で店頭iPadのQRを読み取ると、スマホで順番待ちができます。お支払いは受け取り時のキャッシュレス決済です。
          </p>
          <PortalLink href="/projects?mop=1" className="promo-btn">
            対象店舗を見る <PortalIcon name="arrow-right" size={16} />
          </PortalLink>
        </div>
        <div className="ticket" aria-hidden="true">
          <div className="ticket-label">お呼び出し番号</div>
          <div className="ticket-no num">1024</div>
          <div className="ticket-emoji">🍓🐳🌻</div>
          <div className="ticket-clock num">{clockText}</div>
        </div>
      </div>
    </section>
  );
}
