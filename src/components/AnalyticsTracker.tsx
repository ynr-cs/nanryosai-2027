'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { Suspense, useEffect, useRef } from 'react';
import { ensureGtagInitialized, GA_MEASUREMENT_ID, trackPageView } from '@/lib/analytics';

/**
 * Static Export (output: 'export') 環境では useSearchParams() を <Suspense> なしで呼ぶと
 * ページ全体が空の CSR フォールバックへ退行するため、必ず内部コンポーネントを分離してラップする。
 */
function AnalyticsRouteObserver(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedKeyRef = useRef<string | null>(null);

  const queryString = searchParams.toString();

  useEffect(() => {
    const key = queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
    if (lastTrackedKeyRef.current === key) {
      return;
    }
    lastTrackedKeyRef.current = key;
    trackPageView(pathname, queryString);
  }, [pathname, queryString]);

  return null;
}

export function AnalyticsTracker() {
  useEffect(() => {
    ensureGtagInitialized();
  }, []);

  return (
    <>
      <Script
        id="ga4-gtag-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <AnalyticsRouteObserver />
      </Suspense>
    </>
  );
}
