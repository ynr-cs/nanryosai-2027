'use client';

import { useEffect, useState } from 'react';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { usePortalLiveState } from '@/domains/portal/context/LiveStateProvider';

/**
 * 共通ヘッダー直下の緊急・案内バナー（D-003 / D-009）
 * - React 標準テキスト描画により XSS を構造的に遮断する。
 */
export function EmergencyBanner() {
  const { data } = usePortalLiveState();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const banner = data.emergencyBanner;

  const bannerKey = banner ? `${banner.level}:${banner.message}` : null;

  useEffect(() => {
    if (!banner || !banner.active) {
      setDismissedKey(null);
    }
  }, [banner]);

  if (!banner || !banner.active || !banner.message) {
    return null;
  }

  if (banner.level !== 'critical' && dismissedKey === bannerKey) {
    return null;
  }

  const iconName =
    banner.level === 'critical'
      ? 'alert-triangle'
      : banner.level === 'warning'
        ? 'alert-circle'
        : 'info';

  return (
    <div
      className={`global-alert ${banner.level}`}
      role={banner.level === 'critical' ? 'alert' : 'status'}
    >
      <PortalIcon name={iconName} size={17} />
      <span>{banner.message}</span>
      {banner.level !== 'critical' ? (
        <button
          type="button"
          className="global-alert-close"
          aria-label="バナーを閉じる"
          onClick={() => setDismissedKey(bannerKey)}
        >
          <PortalIcon name="close" size={16} />
        </button>
      ) : null}
    </div>
  );
}
