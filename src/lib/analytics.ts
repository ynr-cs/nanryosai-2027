import { publicEnv } from './env';

/**
 * GA4 独立計測モジュール（G-VTX813ECF9 / D-003 / D-005 / 鉄則10）
 * - firebase/auth や firebase/analytics に一切依存せず軽量 gtag.js で計測する。
 * - `?src=...` 等の流入元クエリを確実に page_location として保持・送信する。
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __nanryoGa4Configured?: boolean;
  }
}

export const GA_MEASUREMENT_ID = publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * gtag.js 本体ロード完了前でも初回 page_view（?src=... 含む）を取りこぼさないよう、
 * dataLayer と gtag キュー関数、および初回 config（自動 page_view 無効化）を同期的に初期化する。
 * ※ Google gtag.js 仕様上、dataLayer には配列ではなく Arguments オブジェクトを push する。
 */
export function ensureGtagInitialized(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  if (!window.__nanryoGa4Configured) {
    window.__nanryoGa4Configured = true;
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  }
  return true;
}

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'password',
  'pw',
  'secret',
  'passcode',
  'auth',
  'key',
]);

export function buildPageViewPayload(
  pathname: string,
  searchParamsString: string,
  origin?: string,
): {
  readonly page_path: string;
  readonly page_location?: string;
  readonly traffic_source_param?: string;
} {
  const normalizedQuery = searchParamsString.startsWith('?')
    ? searchParamsString.slice(1)
    : searchParamsString;
  const searchParams = new URLSearchParams(normalizedQuery);
  // D-006.5 & Web Security データ衛生: 誤って URL クエリに認証関連キーが付与された場合は GA4 送信前に除去する
  for (const paramKey of [...searchParams.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(paramKey.toLowerCase())) {
      searchParams.delete(paramKey);
    }
  }
  const sanitizedQuery = searchParams.toString();
  const pagePath = sanitizedQuery.length > 0 ? `${pathname}?${sanitizedQuery}` : pathname;
  const srcParam = searchParams.get('src') ?? undefined;

  return {
    page_path: pagePath,
    ...(origin ? { page_location: `${origin}${pagePath}` } : {}),
    ...(srcParam ? { traffic_source_param: srcParam } : {}),
  };
}

export function trackPageView(pathname: string, searchParamsString: string): void {
  if (!ensureGtagInitialized() || typeof window.gtag !== 'function') {
    return;
  }
  const payload = buildPageViewPayload(pathname, searchParamsString, window.location.origin);
  window.gtag('event', 'page_view', {
    send_to: GA_MEASUREMENT_ID,
    ...payload,
  });
}

export function trackPortalEvent(
  eventName: string,
  params?: Readonly<Record<string, string | number | boolean>>,
): void {
  if (!ensureGtagInitialized() || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', eventName, params ?? {});
}
