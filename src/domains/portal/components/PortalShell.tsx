'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EmergencyBanner } from '@/domains/portal/components/EmergencyBanner';
import { PortalIcon } from '@/domains/portal/components/PortalIcon';
import { PortalLink } from '@/domains/portal/components/PortalLink';
import { PortalToastProvider } from '@/domains/portal/components/PortalToastContext';
import { WaveLogo } from '@/domains/portal/components/WaveLogo';
import { FavoritesProvider, useFavorites } from '@/domains/portal/context/FavoritesProvider';
import { LiveStateProvider } from '@/domains/portal/context/LiveStateProvider';
import { useTheme, type ThemeMode } from '@/domains/portal/context/ThemeProvider';

function syncViewportDensity(): void {
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  const density = w <= 400 || h <= 700 ? 'compact' : w <= 520 ? 'cozy' : 'normal';
  document.documentElement.dataset.density = density;
  if (w <= 520) {
    const wScale = 12.2 + ((Math.max(320, w) - 320) / 200) * 2.8;
    const hFactor = h < 660 ? Math.max(0.9, h / 660) : 1;
    document.documentElement.style.fontSize = `${Math.max(11.5, Math.min(15.5, wScale * hFactor)).toFixed(2)}px`;
  } else {
    document.documentElement.style.fontSize = '';
  }
}

type RouteTransitionKind = 'none' | 'tab-forward' | 'tab-backward' | 'drill-in' | 'drill-out';

function getTabOrder(pathname: string): number | null {
  if (pathname === '/') {
    return 0;
  }
  if (pathname === '/projects') {
    return 1;
  }
  if (pathname === '/order') {
    return 2;
  }
  if (pathname === '/stages') {
    return 3;
  }
  if (pathname === '/map') {
    return 4;
  }
  return null;
}

function resolveRouteTransition(prevPath: string, nextPath: string): RouteTransitionKind {
  if (prevPath === nextPath) {
    return 'none';
  }
  const prevTab = getTabOrder(prevPath);
  const nextTab = getTabOrder(nextPath);
  if (prevTab !== null && nextTab !== null) {
    return nextTab > prevTab ? 'tab-forward' : 'tab-backward';
  }
  if (prevPath.startsWith('/projects/') && nextPath === '/projects') {
    return 'drill-out';
  }
  if (nextPath.startsWith('/projects/') || nextPath === '/guide') {
    return 'drill-in';
  }
  return 'tab-backward';
}

function getActiveNavKey(pathname: string): 'home' | 'projects' | 'order' | 'stage' | 'map' {
  if (pathname.startsWith('/projects')) {
    return 'projects';
  }
  if (pathname.startsWith('/order')) {
    return 'order';
  }
  if (pathname.startsWith('/stages')) {
    return 'stage';
  }
  if (pathname.startsWith('/map')) {
    return 'map';
  }
  return 'home';
}

const THEME_OPTIONS: ReadonlyArray<{
  readonly mode: ThemeMode;
  readonly label: string;
  readonly icon: 'sun' | 'moon' | 'display';
}> = [
  { mode: 'light', label: 'ライト', icon: 'sun' },
  { mode: 'dark', label: 'ダーク', icon: 'moon' },
  { mode: 'auto', label: '自動', icon: 'display' },
];

function PortalChrome({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerId = useId();
  const { count: favCount } = useFavorites();
  const { mode, setThemeMode } = useTheme();

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [routeAnim, setRouteAnim] = useState<{
    readonly path: string;
    readonly kind: RouteTransitionKind;
  }>({ path: pathname, kind: 'none' });
  if (routeAnim.path !== pathname) {
    setRouteAnim({
      path: pathname,
      kind: resolveRouteTransition(routeAnim.path, pathname),
    });
  }
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const isOpeningRef = useRef<boolean>(false);

  useEffect(() => {
    const coreRoutes = ['/', '/projects', '/order', '/stages', '/map', '/guide'];
    const prefetchCoreRoutes = () => {
      for (const route of coreRoutes) {
        if (route !== pathname) {
          router.prefetch(route);
        }
      }
    };
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(prefetchCoreRoutes, { timeout: 1500 });
      return () => {
        win.cancelIdleCallback?.(idleId);
      };
    }
    const timerId = window.setTimeout(prefetchCoreRoutes, 600);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname, router]);

  useEffect(() => {
    syncViewportDensity();
    window.addEventListener('resize', syncViewportDensity);
    window.visualViewport?.addEventListener('resize', syncViewportDensity);
    return () => {
      window.removeEventListener('resize', syncViewportDensity);
      window.visualViewport?.removeEventListener('resize', syncViewportDensity);
    };
  }, []);

  const closeDrawer = useCallback(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    if (!dialog || !dialog.open) {
      setMenuOpen(false);
      return;
    }
    if (!scroller) {
      dialog.close();
      setMenuOpen(false);
      return;
    }
    isOpeningRef.current = false;
    scroller.scrollTo({ left: 0, behavior: 'auto' });
  }, []);

  const openDrawer = useCallback(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !scroller || !sheet) {
      return;
    }
    isOpeningRef.current = true;
    if (!dialog.open) {
      dialog.showModal();
    }
    scroller.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scroller.scrollTo({ left: sheet.offsetWidth, behavior: 'auto' });
      });
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !scroller || !sheet) {
      return;
    }

    const visibleThreshold = Math.min(0.05, 1 / Math.max(window.innerWidth, 320));
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry || !dialog.open) {
          return;
        }
        if (entry.intersectionRatio >= 0.08) {
          isOpeningRef.current = false;
        }
        if (entry.intersectionRatio === 1) {
          setMenuOpen(true);
        } else if (!isOpeningRef.current && entry.intersectionRatio < visibleThreshold) {
          dialog.close();
          setMenuOpen(false);
        }
      },
      { root: dialog, threshold: [visibleThreshold, 0.1, 1] },
    );
    observer.observe(sheet);

    const supportsScrollTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline: scroll()');

    const syncBackdrop = () => {
      const width = sheet.offsetWidth || 1;
      const ratio = Math.min(1, Math.max(0, scroller.scrollLeft / width));
      dialog.style.setProperty('--drawer-backdrop', String(ratio));
    };

    if (!supportsScrollTimeline) {
      scroller.addEventListener('scroll', syncBackdrop, { passive: true });
    }

    const handleNativeClose = () => {
      isOpeningRef.current = false;
      setMenuOpen(false);
    };
    dialog.addEventListener('close', handleNativeClose);

    return () => {
      observer.disconnect();
      if (!supportsScrollTimeline) {
        scroller.removeEventListener('scroll', syncBackdrop);
      }
      dialog.removeEventListener('close', handleNativeClose);
    };
  }, []);

  const activeNav = getActiveNavKey(pathname);

  return (
    <div className="portal-shell">
      <header className="app-header">
        <PortalLink href="/" className="app-logo">
          南陵祭&apos;27
        </PortalLink>
        <button
          type="button"
          className="menu-btn"
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          onClick={openDrawer}
        >
          <PortalIcon name="menu" size={26} />
        </button>
      </header>

      <EmergencyBanner />

      <div
        key={pathname}
        className="portal-route-stage"
        data-transition={routeAnim.kind}
      >
        {children}

        <footer className="app-footer">
        <nav className="footer-sitemap" aria-label="サイトマップ">
          <div>
            <div className="fs-heading">イベント</div>
            <ul className="fs-list">
              <li>
                <PortalLink href="/guide#overview">概要</PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#access">アクセス</PortalLink>
              </li>
              <li>
                <PortalLink href="/projects">企画一覧</PortalLink>
              </li>
              <li>
                <PortalLink href="/stages">ステージ</PortalLink>
              </li>
              <li>
                <PortalLink href="/map">校内マップ</PortalLink>
              </li>
            </ul>
          </div>
          <div>
            <div className="fs-heading">サービス</div>
            <ul className="fs-list">
              <li>
                <PortalLink href="/order">モバイルオーダー</PortalLink>
              </li>
              <li>
                <PortalLink href="/projects?fav=1">お気に入り</PortalLink>
              </li>
            </ul>
          </div>
          <div>
            <div className="fs-heading">サポート</div>
            <ul className="fs-list">
              <li>
                <PortalLink href="/guide#about">お問い合わせ</PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#terms">利用規約</PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#privacy">プライバシーポリシー</PortalLink>
              </li>
            </ul>
          </div>
          <div>
            <div className="fs-heading">運営</div>
            <ul className="fs-list">
              <li>
                <PortalLink href="/guide#overview">南陵祭実行委員会・生徒会</PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#about">制作：コンピュータ科学部</PortalLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="footer-cards">
          <PortalLink href="/guide#voting" className="fc">
            <span className="fc-icon trophy">
              <PortalIcon name="trophy" size={18} />
            </span>
            <span>
              <span className="fc-label">生徒会 人気投票</span>
              <span className="fc-title">推し企画に投票しよう</span>
            </span>
          </PortalLink>
          <PortalLink href="/guide#survey" className="fc">
            <span className="fc-icon">
              <PortalIcon name="checks" size={18} />
            </span>
            <span>
              <span className="fc-label">アンケート</span>
              <span className="fc-title">サイトへのご意見・感想</span>
            </span>
          </PortalLink>
        </div>

        <WaveLogo />

        <div className="footer-bottom">
          &copy; 2027 横浜南陵高等学校 南陵祭実行委員会・生徒会
          <br />
          デジタルパンフレット制作・運営：コンピュータ科学部
        </div>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="メインナビゲーション">
        <PortalLink
          href="/"
          className={activeNav === 'home' ? 'nav-item active' : 'nav-item'}
          aria-current={activeNav === 'home' ? 'page' : undefined}
        >
          <span className="nav-icon-wrap">
            <PortalIcon name="home" size={21} />
          </span>
          <span className="nav-label">ホーム</span>
        </PortalLink>
        <PortalLink
          href="/projects"
          className={activeNav === 'projects' ? 'nav-item active' : 'nav-item'}
          aria-current={activeNav === 'projects' ? 'page' : undefined}
        >
          <span className="nav-icon-wrap">
            <PortalIcon name="grid" size={20} />
          </span>
          <span className="nav-label">企画</span>
        </PortalLink>
        <PortalLink
          href="/order"
          className={
            activeNav === 'order' ? 'nav-item nav-order active' : 'nav-item nav-order'
          }
          aria-current={activeNav === 'order' ? 'page' : undefined}
        >
          <span className="order-orb">
            <PortalIcon name="bag" size={22} />
          </span>
          <span className="nav-label">オーダー</span>
        </PortalLink>
        <PortalLink
          href="/stages"
          className={activeNav === 'stage' ? 'nav-item active' : 'nav-item'}
          aria-current={activeNav === 'stage' ? 'page' : undefined}
        >
          <span className="nav-icon-wrap">
            <PortalIcon name="mic" size={21} />
          </span>
          <span className="nav-label">ステージ</span>
        </PortalLink>
        <PortalLink
          href="/map"
          className={activeNav === 'map' ? 'nav-item active' : 'nav-item'}
          aria-current={activeNav === 'map' ? 'page' : undefined}
        >
          <span className="nav-icon-wrap">
            <PortalIcon name="map" size={21} />
          </span>
          <span className="nav-label">マップ</span>
        </PortalLink>
      </nav>

      <dialog
        id={drawerId}
        ref={dialogRef}
        className="portal-drawer"
        aria-label="メニュー"
        onClick={(e) => {
          if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
            closeDrawer();
          }
        }}
        onCancel={(e) => {
          if (e.cancelable) {
            e.preventDefault();
            closeDrawer();
          }
        }}
      >
        <div className="portal-drawer-scroller" ref={scrollerRef}>
          <div className="portal-drawer-spacer" aria-hidden="true" />
          <aside className="portal-drawer-sheet" ref={sheetRef} aria-label="メニュー">
            <div className="menu-header">
              <span>メニュー</span>
              <button
                type="button"
                className="menu-close"
                aria-label="メニューを閉じる"
                autoFocus
                onClick={closeDrawer}
              >
                <PortalIcon name="close" size={18} />
              </button>
            </div>
            <ul className="menu-list">
              <li>
                <PortalLink href="/guide#overview" onClick={closeDrawer}>
                  <PortalIcon name="info" size={19} />
                  開催概要
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#access" onClick={closeDrawer}>
                  <PortalIcon name="train" size={19} />
                  アクセス
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#news" onClick={closeDrawer}>
                  <PortalIcon name="megaphone" size={19} />
                  お知らせ
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#payment" onClick={closeDrawer}>
                  <PortalIcon name="credit-card" size={19} />
                  使える決済
                </PortalLink>
              </li>
            </ul>

            <div className="menu-sub">
              <p className="menu-sub-label">便利機能</p>
              <div className="quick-grid">
                <PortalLink href="/projects?fav=1" className="quick-btn" onClick={closeDrawer}>
                  <PortalIcon name="star-fill" size={15} style={{ color: '#f59e0b' }} />
                  お気に入り
                  <span className="count num">{favCount}</span>
                </PortalLink>
                <PortalLink href="/guide#voting" className="quick-btn" onClick={closeDrawer}>
                  <PortalIcon name="trophy" size={15} style={{ color: '#f59e0b' }} />
                  人気投票
                </PortalLink>
                <PortalLink href="/guide#survey" className="quick-btn" onClick={closeDrawer}>
                  <PortalIcon name="chat-heart" size={15} style={{ color: '#ec4899' }} />
                  アンケート
                </PortalLink>
                <PortalLink href="/guide#terms" className="quick-btn" onClick={closeDrawer}>
                  <PortalIcon name="file-text" size={15} />
                  利用規約
                </PortalLink>
              </div>
            </div>

            <div className="menu-bottom">
              <div className="theme-grid" role="group" aria-label="テーマ設定">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    className={mode === opt.mode ? 'theme-btn active' : 'theme-btn'}
                    aria-pressed={mode === opt.mode}
                    onClick={() => setThemeMode(opt.mode)}
                  >
                    <PortalIcon name={opt.icon} size={16} />
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="menu-credit">Powered by コンピュータ科学部</p>
            </div>
          </aside>
        </div>
      </dialog>
    </div>
  );
}

export function PortalShell({ children }: { readonly children: ReactNode }) {
  return (
    <LiveStateProvider>
      <FavoritesProvider>
        <PortalToastProvider>
          <PortalChrome>{children}</PortalChrome>
        </PortalToastProvider>
      </FavoritesProvider>
    </LiveStateProvider>
  );
}
