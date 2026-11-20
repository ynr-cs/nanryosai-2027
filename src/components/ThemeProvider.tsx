'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export const THEME_STORAGE_KEY = 'nanryosai2027:theme';

export interface ThemeContextValue {
  readonly mode: ThemeMode;
  readonly resolvedTheme: 'light' | 'dark';
  readonly setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDomTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (mode === 'light' || mode === 'dark') {
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    if (meta) {
      meta.setAttribute('content', mode);
    }
  } else {
    delete root.dataset.theme;
    root.style.colorScheme = 'light dark';
    if (meta) {
      meta.setAttribute('content', 'light dark');
    }
  }
}

function readStoredThemeMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * 3状態テーマ管理（ライト / ダーク / 自動）ルートプロバイダ
 * - RootLayout 直下に配置し、(portal) ↔ (mop) ↔ (venue) 間の遷移でもテーマ状態を維持する。
 * - `root.style.colorScheme` と `data-theme` を同期し、Next.js <head> 再調整時の瞬間ダーク化を防止。
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [systemDark, setSystemDark] = useState<boolean>(false);

  useEffect(() => {
    const initialMode = readStoredThemeMode();
    setMode(initialMode);
    applyDomTheme(initialMode);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);

    const onMediaChange = (ev: MediaQueryListEvent) => {
      setSystemDark(ev.matches);
    };
    const onStorageChange = (ev: StorageEvent) => {
      if (ev.key === THEME_STORAGE_KEY) {
        const synced = readStoredThemeMode();
        setMode(synced);
        applyDomTheme(synced);
      }
    };

    mq.addEventListener('change', onMediaChange);
    window.addEventListener('storage', onStorageChange);
    return () => {
      mq.removeEventListener('change', onMediaChange);
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    applyDomTheme(nextMode);
    try {
      if (nextMode === 'auto') {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      }
    } catch {
      // storage 無効環境ではメモリ・DOM反映のみ維持
    }
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setThemeMode,
    }),
    [mode, resolvedTheme, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
