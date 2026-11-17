import { describe, expect, it } from 'vitest';
import {
  LIVE_STATE_STORAGE_KEY,
  readCachedLiveState,
  writeCachedLiveState,
} from '@/domains/portal/hooks/useLiveState';
import type { PublicLiveStateDoc } from '@/types/domain';

function createMemoryStorage(throwOnSet = false): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      if (throwOnSet) {
        throw new Error('QuotaExceededError');
      }
      map.set(key, value);
    },
  };
}

describe('useLiveState localStorage キャッシュ安全降格ロジック', () => {
  const validState: PublicLiveStateDoc = {
    schemaVersion: 1,
    updatedAtIso: '2026-11-17T05:00:00.000Z',
    mopGlobalEnabled: true,
    emergencyBanner: null,
    venues: {
      gym_stage: {
        venueId: 'gym_stage',
        congestion: 'low',
        currentSlotId: 'keion_gym_d1',
        delayMinutes: 0,
        updatedAtIso: '2026-11-17T05:00:00.000Z',
      },
    },
    mopStores: {
      sample_mop_castella: {
        storeId: 'sample_mop_castella',
        status: 'open',
        remainingTotal: 320,
        soldOutItemIds: [],
        updatedAtIso: '2026-11-17T05:00:00.000Z',
      },
    },
  };

  it('正常な PublicLiveStateDoc を保存・復元できる', () => {
    const storage = createMemoryStorage();
    writeCachedLiveState(validState, storage);
    expect(readCachedLiveState(storage)).toEqual(validState);
  });

  it('破損したJSONやスキーマ不一致データがキャッシュされていた場合は null に安全降格する', () => {
    const storage = createMemoryStorage();
    storage.setItem(LIVE_STATE_STORAGE_KEY, '{broken-json');
    expect(readCachedLiveState(storage)).toBeNull();

    storage.setItem(LIVE_STATE_STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }));
    expect(readCachedLiveState(storage)).toBeNull();
  });

  it('プライベートブラウズ等の QuotaExceededError でも例外を外へ漏らさない', () => {
    const throwingStorage = createMemoryStorage(true);
    expect(() => writeCachedLiveState(validState, throwingStorage)).not.toThrow();
  });
});
