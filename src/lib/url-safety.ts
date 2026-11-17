import { isValidNormalizedInstagramHandle } from '@/types/schemas';

/**
 * URL安全処理・クエリ保護・SNSハンドル正規化ユーティリティ（D-006 / D-009 / 鉄則10）
 */

export interface HashStripResult {
  readonly cleanedPathAndSearch: string;
  readonly strippedHash: string | null;
  readonly didStrip: boolean;
}

/**
 * 純粋関数版: URL文字列から `#` 以降のフラグメントのみを除去し、
 * パスおよびクエリパラメータ（`?src=...`, `?store=...` 等）を損なわずに返す。
 * - 先頭連続スラッシュ（`//order` 等）はプロトコル相対URLと誤認されて
 *   `history.replaceState` が SecurityError を投げる原因となるため単一 `/` へ正規化する。
 */
export function computeHashStrippedUrl(rawHref: string): HashStripResult {
  const parsed = new URL(rawHref, 'https://nanryosai-2027.web.app');
  const safePathname = parsed.pathname.replace(/^\/{2,}/, '/');
  const hashIndex = rawHref.indexOf('#');
  if (hashIndex === -1) {
    return {
      cleanedPathAndSearch: `${safePathname}${parsed.search}`,
      strippedHash: null,
      didStrip: false,
    };
  }
  return {
    cleanedPathAndSearch: `${safePathname}${parsed.search}`,
    strippedHash: rawHref.slice(hashIndex),
    didStrip: true,
  };
}

export interface BrowserHistoryLike {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export interface BrowserLocationLike {
  readonly href: string;
  readonly pathname: string;
  readonly search: string;
  hash: string;
}

/**
 * ブラウザ上の現在の URL から `location.hash`（`#t=...` 等のワンタイムトークン）のみを消去する。
 * - `location.search`（GA4計測用 `?src=...` や店舗指定 `?store=...`）には絶対に触れない（D-006.3）。
 * - Next.js App Router の内部履歴ツリーを壊さないよう `window.history.state` をそのまま維持する。
 */
export function stripLocationHashOnly(
  win?: { readonly location: BrowserLocationLike; readonly history: BrowserHistoryLike } | null,
): HashStripResult {
  const targetWindow = win === undefined ? (typeof window !== 'undefined' ? window : null) : win;
  if (!targetWindow) {
    return {
      cleanedPathAndSearch: '',
      strippedHash: null,
      didStrip: false,
    };
  }

  const result = computeHashStrippedUrl(targetWindow.location.href);
  if (result.didStrip) {
    try {
      targetWindow.history.replaceState(
        targetWindow.history.state,
        '',
        result.cleanedPathAndSearch,
      );
    } catch {
      // 特殊アプリ内WebView等で replaceState が拒否された場合でもトークン露出だけは確実に防止する
      targetWindow.location.hash = '';
    }
  }
  return result;
}

// 制御文字（CR/LF/TAB/NULL等）の混入検査
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;

/**
 * 外部リンクの安全検証（XSS対策: `https:` のみ許可、`javascript:` / `data:` / 認証情報付きURLを完全遮断）
 */
export function safeExternalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0 || CONTROL_CHAR_REGEX.test(trimmed)) {
    return null;
  }

  // 相対パスがベースURL解決で https: に化けるのを防ぐため、明示的 https:// プレフィックスを要求
  if (!/^https:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || parsed.hostname.length === 0) {
      return null;
    }
    if (parsed.username !== '' || parsed.password !== '') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

const RESERVED_INSTAGRAM_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'about',
]);

const ALLOWED_INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
]);

/**
 * Instagramハンドル入力のクレンジング＆正規化
 * - `@handle`, `@@handle`, `https://www.instagram.com/handle/`, `instagram.com/handle` 等から純粋なハンドル名のみを抽出する。
 * - 2026年実データにあった自由文（例: "笹森ってインスタで打ったら出てきます"）やドメイン単体（"instagram.com"）は null を返して弾く。
 */
export function normalizeInstagramHandle(rawInput: string | null | undefined): string | null {
  if (!rawInput) {
    return null;
  }
  const trimmed = rawInput.trim();
  if (trimmed.length === 0 || CONTROL_CHAR_REGEX.test(trimmed)) {
    return null;
  }

  let candidate = trimmed;

  // スキーム省略 URL (例: instagram.com/ynr.1_3, www.instagram.com/ynr.1_3/) にも対応
  if (/^(?:(?:www|m)\.)?instagram\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();
      if (!ALLOWED_INSTAGRAM_HOSTS.has(host)) {
        return null;
      }
      const segments = parsed.pathname.split('/').filter((seg) => seg.length > 0);
      const firstSegment = segments[0];
      if (!firstSegment || segments.length !== 1) {
        return null;
      }
      if (RESERVED_INSTAGRAM_PATHS.has(firstSegment.toLowerCase())) {
        return null;
      }
      candidate = firstSegment;
    } catch {
      return null;
    }
  }

  candidate = candidate.replace(/^@+/, '');

  if (!isValidNormalizedInstagramHandle(candidate)) {
    return null;
  }

  return candidate;
}

/**
 * 正規化済みInstagramハンドルから安全なプロフィールURLを生成する
 */
export function buildInstagramProfileUrl(handle: string | null | undefined): string | null {
  const normalized = normalizeInstagramHandle(handle);
  if (!normalized) {
    return null;
  }
  return safeExternalUrl(`https://www.instagram.com/${normalized}/`);
}
