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

export const FAVORITES_STORAGE_KEY = 'nanryosai2027:favorites:v1';

export interface FavoritesContextValue {
  readonly favoriteIds: readonly string[];
  readonly count: number;
  readonly isFavorite: (projectId: string) => boolean;
  readonly toggleFavorite: (projectId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readFavoritesFromStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeFavoritesToStorage(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // プライベートブラウズ等の容量上限時は無害にスキップ
  }
}

/**
 * ログイン不要（D-005）の localStorage お気に入り同期プロバイダ
 * - SSR 初期値は空配列で固定し、ハイドレーション後にクライアントストレージを復元する。
 */
export function FavoritesProvider({ children }: { readonly children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(readFavoritesFromStorage());
    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === FAVORITES_STORAGE_KEY) {
        setFavoriteIds(readFavoritesFromStorage());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (projectId: string) => favoriteSet.has(projectId),
    [favoriteSet],
  );

  const toggleFavorite = useCallback((projectId: string): boolean => {
    let added = false;
    setFavoriteIds((prev) => {
      const exists = prev.includes(projectId);
      const next = exists ? prev.filter((id) => id !== projectId) : [...prev, projectId];
      added = !exists;
      writeFavoritesToStorage(next);
      return next;
    });
    return added;
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      count: favoriteIds.length,
      isFavorite,
      toggleFavorite,
    }),
    [favoriteIds, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used inside <FavoritesProvider>');
  }
  return ctx;
}
