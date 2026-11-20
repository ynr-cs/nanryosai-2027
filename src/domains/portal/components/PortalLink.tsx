'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  type AnchorHTMLAttributes,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from 'react';

export type PortalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps
> &
  LinkProps & {
    readonly children: ReactNode;
    readonly prefetch?: boolean;
    readonly prefetchOnIntent?: boolean;
  };

const prefetchedPaths = new Set<string>();

function resolvePrefetchTarget(href: LinkProps['href']): string | null {
  if (typeof href !== 'string' || !href.startsWith('/')) {
    return null;
  }
  const hashIdx = href.indexOf('#');
  const clean = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  return clean.length > 0 ? clean : '/';
}

/**
 * 第1層（Webポータル）専用リンクコンポーネント（D-002 実装ガードレール準拠）
 * - デフォルトでは `<Link prefetch={false}>` により大量一覧画面での無差別先読みを防止しつつ、
 *   ホバー／タッチ開始／フォーカス時（ユーザー意図検知時）のみ 1 回だけ `router.prefetch` を走らせ、
 *   タップ後のページ遷移待ちを実質 0ms へ短縮する。
 */
export function PortalLink({
  prefetch = false,
  prefetchOnIntent = true,
  href,
  children,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...rest
}: PortalLinkProps) {
  const router = useRouter();

  const triggerPrefetch = useCallback(() => {
    if (!prefetchOnIntent) {
      return;
    }
    const target = resolvePrefetchTarget(href);
    if (!target || prefetchedPaths.has(target)) {
      return;
    }
    prefetchedPaths.add(target);
    router.prefetch(target);
  }, [href, prefetchOnIntent, router]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      triggerPrefetch();
      onMouseEnter?.(e);
    },
    [onMouseEnter, triggerPrefetch],
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLAnchorElement>) => {
      triggerPrefetch();
      onTouchStart?.(e);
    },
    [onTouchStart, triggerPrefetch],
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLAnchorElement>) => {
      triggerPrefetch();
      onFocus?.(e);
    },
    [onFocus, triggerPrefetch],
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      onFocus={handleFocus}
      {...rest}
    >
      {children}
    </Link>
  );
}
