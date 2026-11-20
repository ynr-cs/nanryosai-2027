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
import { appVersion } from '@/lib/env';

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

type RouteTransitionKind = 'none' | 'float-in';

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
      kind: 'float-in',
    });
  }
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; dx: number; tracking: boolean }>({
    startX: 0,
    startY: 0,
    dx: 0,
    tracking: false,
  });

  useEffect(() => {
    const coreRoutes = ['/', '/projects', '/order', '/stages', '/map', '/guide'];
    for (const route of coreRoutes) {
      if (route !== pathname) {
        router.prefetch(route);
      }
    }
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

  const closeDrawerImmediate = useCallback(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = '';
      sheet.style.transform = '';
    }
    if (dialog) {
      dialog.removeAttribute('data-closing');
      if (dialog.open) {
        dialog.close();
      }
    }
    setMenuOpen(false);
  }, []);

  const closeDrawer = useCallback(async () => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !dialog.open) {
      setMenuOpen(false);
      return;
    }
    if (dialog.hasAttribute('data-closing')) {
      return;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !sheet) {
      closeDrawerImmediate();
      return;
    }

    sheet.style.transition = '';
    sheet.style.transform = '';
    dialog.setAttribute('data-closing', 'true');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 220);
        }),
      ]);
    } else {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 190);
      });
    }
    if (!dialog.hasAttribute('data-closing')) {
      return;
    }
    dialog.removeAttribute('data-closing');
    if (dialog.open) {
      dialog.close();
    }
    setMenuOpen(false);
  }, [closeDrawerImmediate]);

  const openDrawer = useCallback(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !sheet) {
      return;
    }
    dialog.removeAttribute('data-closing');
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (!dialog.open) {
      dialog.showModal();
    }
    setMenuOpen(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleNativeClose = () => {
      dialog.removeAttribute('data-closing');
      if (sheetRef.current) {
        sheetRef.current.style.transition = '';
        sheetRef.current.style.transform = '';
      }
      setMenuOpen(false);
    };
    dialog.addEventListener('close', handleNativeClose);
    return () => {
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
          if (e.target === dialogRef.current) {
            void closeDrawer();
          }
        }}
        onCancel={(e) => {
          if (e.cancelable) {
            e.preventDefault();
            void closeDrawer();
          }
        }}
      >
        <aside
          className="portal-drawer-sheet"
          ref={sheetRef}
          aria-label="メニュー"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (!touch) {
              return;
            }
            swipeRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              dx: 0,
              tracking: true,
            };
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const sheet = sheetRef.current;
            if (!touch || !sheet || !swipeRef.current.tracking) {
              return;
            }
            const dx = touch.clientX - swipeRef.current.startX;
            const dy = touch.clientY - swipeRef.current.startY;
            if (Math.abs(dy) > Math.abs(dx) && swipeRef.current.dx === 0) {
              swipeRef.current.tracking = false;
              return;
            }
            if (dx > 10) {
              swipeRef.current.dx = dx;
              sheet.style.transition = 'none';
              sheet.style.transform = `translate3d(${dx}px, 0, 0)`;
            }
          }}
          onTouchEnd={() => {
            const sheet = sheetRef.current;
            const dx = swipeRef.current.dx;
            swipeRef.current.tracking = false;
            swipeRef.current.dx = 0;
            if (!sheet) {
              return;
            }
            sheet.style.transition = '';
            if (dx > 64) {
              void closeDrawer();
            } else {
              sheet.style.transform = '';
            }
          }}
        >
          <div className="menu-header">
            <span>メニュー</span>
            <button
              type="button"
              className="menu-close"
              aria-label="メニューを閉じる"
              autoFocus
              onClick={() => {
                void closeDrawer();
              }}
            >
              <PortalIcon name="close" size={18} />
            </button>
          </div>
            <ul className="menu-list">
              <li>
                <PortalLink href="/guide#overview" onClick={closeDrawerImmediate}>
                  <PortalIcon name="info" size={19} />
                  開催概要
                </PortalLink>
              </li>
              <li>
                <PortalLink
                  href="/order"
                  className="menu-order-glow"
                  onClick={closeDrawerImmediate}
                >
                  <PortalIcon name="bag" size={19} />
                  オーダー
                  <span className="menu-order-pill">注文</span>
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/projects" onClick={closeDrawerImmediate}>
                  <PortalIcon name="grid" size={19} />
                  企画一覧
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/stages" onClick={closeDrawerImmediate}>
                  <PortalIcon name="mic" size={19} />
                  ステージ一覧
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/map" onClick={closeDrawerImmediate}>
                  <PortalIcon name="map" size={19} />
                  マップ
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#access" onClick={closeDrawerImmediate}>
                  <PortalIcon name="train" size={19} />
                  アクセス
                </PortalLink>
              </li>
              <li>
                <PortalLink href="/guide#about" onClick={closeDrawerImmediate}>
                  <PortalIcon name="sparkles" size={19} />
                  コンピュータ科学部について
                </PortalLink>
              </li>
            </ul>

            <div className="menu-sub">
              <p className="menu-sub-label">便利機能</p>
              <div className="quick-grid quick-grid-lg">
                <PortalLink
                  href="/projects?fav=1"
                  className="quick-btn quick-btn-fav"
                  onClick={closeDrawerImmediate}
                >
                  <span className="quick-btn-icon fav">
                    <PortalIcon name="star-fill" size={18} />
                  </span>
                  <span>お気に入り</span>
                  <span className="count num">{favCount}</span>
                </PortalLink>
                <PortalLink
                  href="/guide#voting"
                  className="quick-btn"
                  onClick={closeDrawerImmediate}
                >
                  <span className="quick-btn-icon trophy">
                    <PortalIcon name="trophy" size={18} />
                  </span>
                  <span>人気投票</span>
                </PortalLink>
                <PortalLink
                  href="/guide#survey"
                  className="quick-btn"
                  onClick={closeDrawerImmediate}
                >
                  <span className="quick-btn-icon survey">
                    <PortalIcon name="chat-heart" size={18} />
                  </span>
                  <span>アンケート</span>
                </PortalLink>
              </div>
            </div>

            <details className="menu-accordion">
              <summary className="menu-accordion-summary">お知らせ・規約など</summary>
              <ul className="menu-accordion-list">
                <li>
                  <PortalLink href="/guide#news" onClick={closeDrawerImmediate}>
                    お知らせ
                  </PortalLink>
                </li>
                <li>
                  <PortalLink href="/guide#payment" onClick={closeDrawerImmediate}>
                    使える決済
                  </PortalLink>
                </li>
                <li>
                  <PortalLink href="/guide#terms" onClick={closeDrawerImmediate}>
                    利用規約
                  </PortalLink>
                </li>
                <li>
                  <PortalLink href="/guide#privacy" onClick={closeDrawerImmediate}>
                    プライバシーポリシー
                  </PortalLink>
                </li>
              </ul>
            </details>

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
              <div className="menu-meta-foot">
                <p className="menu-credit">Powered by コンピュータ科学部</p>
                <p className="menu-version num">v{appVersion}</p>
              </div>
            </div>
        </aside>
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
