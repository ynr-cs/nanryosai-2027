'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  useLiveState,
  type UseLiveStateResult,
} from '@/domains/portal/hooks/useLiveState';
import { isLiveStateAutoEnabled } from '@/lib/env';

const LiveStateContext = createContext<UseLiveStateResult | null>(null);

/**
 * ポータル全体で単一ドキュメント `public/live_state` の60秒スロットルと状態を共有するプロバイダ
 * - SPA ページ遷移を跨いでもキャッシュとスロットルが維持され、タブ復帰時のみ差分再取得を行う。
 */
export function LiveStateProvider({ children }: { readonly children: ReactNode }) {
  const liveState = useLiveState();

  const { refresh } = liveState;

  useEffect(() => {
    if (!isLiveStateAutoEnabled) {
      return;
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return <LiveStateContext.Provider value={liveState}>{children}</LiveStateContext.Provider>;
}

export function usePortalLiveState(): UseLiveStateResult {
  const ctx = useContext(LiveStateContext);
  if (!ctx) {
    throw new Error('usePortalLiveState must be used inside <LiveStateProvider>');
  }
  return ctx;
}
