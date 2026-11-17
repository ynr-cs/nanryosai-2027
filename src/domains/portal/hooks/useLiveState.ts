'use client';

import { doc, getDoc } from 'firebase/firestore/lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isLiveStateAutoEnabled } from '@/lib/env';
import { getPortalFirestoreLite } from '@/lib/firebase-lite';
import type { PublicLiveStateDoc } from '@/types/domain';
import { PublicLiveStateDocSchema } from '@/types/schemas';

/**
 * 第1層 ライブ差分配信フック土台（`public/live_state` 単一Doc + 60秒スロットル + localStorage 安全降格）
 * - Phase 1 では `firestore.rules` が完全閉鎖（allow read, write: if false;）のため、
 *   デフォルトでは自動通信を行わず、キャッシュまたは初期フォールバック値を即時返却する。
 */

export const LIVE_STATE_STORAGE_KEY = 'nanryosai2027:public_live_state:v1';
export const LIVE_STATE_THROTTLE_MS = 60_000;

export const DEFAULT_LIVE_STATE: PublicLiveStateDoc = {
  schemaVersion: 1,
  updatedAtIso: '1970-01-01T00:00:00.000Z',
  mopGlobalEnabled: false,
  emergencyBanner: null,
  venues: {},
  mopStores: {},
};

export type LiveStateSource = 'default' | 'cache' | 'network' | 'fallback';

export interface UseLiveStateOptions {
  readonly enabled?: boolean;
  readonly throttleMs?: number;
}

export interface UseLiveStateResult {
  readonly data: PublicLiveStateDoc;
  readonly source: LiveStateSource;
  readonly isSyncing: boolean;
  readonly lastErrorCode: string | null;
  readonly refresh: (force?: boolean) => Promise<void>;
}

export function readCachedLiveState(storage?: Storage | null): PublicLiveStateDoc | null {
  const target =
    storage === undefined ? (typeof window !== 'undefined' ? window.localStorage : null) : storage;
  if (!target) {
    return null;
  }
  try {
    const raw = target.getItem(LIVE_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = PublicLiveStateDocSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeCachedLiveState(
  stateDoc: PublicLiveStateDoc,
  storage?: Storage | null,
): void {
  const target =
    storage === undefined ? (typeof window !== 'undefined' ? window.localStorage : null) : storage;
  if (!target) {
    return;
  }
  try {
    target.setItem(LIVE_STATE_STORAGE_KEY, JSON.stringify(stateDoc));
  } catch {
    // Safari プライベートブラウズや容量上限時は無害にスキップ
  }
}

export function useLiveState(options: UseLiveStateOptions = {}): UseLiveStateResult {
  const { enabled = isLiveStateAutoEnabled, throttleMs = LIVE_STATE_THROTTLE_MS } = options;

  const [data, setData] = useState<PublicLiveStateDoc>(DEFAULT_LIVE_STATE);
  const [source, setSource] = useState<LiveStateSource>('default');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  useEffect(() => {
    const cached = readCachedLiveState();
    if (cached) {
      setData(cached);
      setSource('cache');
    }
  }, []);

  const refresh = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && lastFetchedAtRef.current > 0 && now - lastFetchedAtRef.current < throttleMs) {
        return;
      }
      lastFetchedAtRef.current = now;
      setIsSyncing(true);

      try {
        const db = getPortalFirestoreLite();
        const snapshot = await getDoc(doc(db, 'public', 'live_state'));
        if (!snapshot.exists()) {
          setSource((prev) => (prev === 'cache' ? 'cache' : 'fallback'));
          setLastErrorCode(null);
          return;
        }
        const validated = PublicLiveStateDocSchema.safeParse(snapshot.data());
        if (validated.success) {
          setData(validated.data);
          setSource('network');
          setLastErrorCode(null);
          writeCachedLiveState(validated.data);
        } else {
          setSource('fallback');
          setLastErrorCode('invalid-schema');
        }
      } catch (err: unknown) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: unknown }).code)
            : 'network-or-rules-blocked';
        setSource((prev) => (prev === 'cache' ? 'cache' : 'fallback'));
        setLastErrorCode(code);
      } finally {
        setIsSyncing(false);
      }
    },
    [throttleMs],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh(false);
  }, [enabled, refresh]);

  return {
    data,
    source,
    isSyncing,
    lastErrorCode,
    refresh,
  };
}
