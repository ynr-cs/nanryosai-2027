import { getApps, initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import type { PublicLiveStateDoc } from '../../src/types/domain';
import { PublicLiveStateDocSchema } from '../../src/types/schemas';

/**
 * 南陵祭2027 Cloud Functions 2nd Gen エントリポイント（D-003 準拠）
 * - リージョン: asia-northeast1（東京） / concurrency: 80
 * - googleapis 等の巨大パッケージ同期読込および 1分間隔常時 Cron は厳禁とする。
 * - esbuild により ../../src/types/* (Zod スキーマ) は lib/index.js へ安全にインライン同梱され、
 *   firebase-admin / firebase-functions のみ外部解決として CLI トリガー検出と高速起動を両立する。
 */

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({
  region: 'asia-northeast1',
  concurrency: 80,
  maxInstances: 10,
});

const PROBE_LIVE_STATE: PublicLiveStateDoc = {
  schemaVersion: 1,
  updatedAtIso: '2026-11-17T00:00:00.000Z',
  mopGlobalEnabled: false,
  emergencyBanner: null,
  venues: {},
  mopStores: {},
};

export const healthCheck = onRequest(
  {
    region: 'asia-northeast1',
    concurrency: 80,
    cors: true,
  },
  (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.set('Allow', 'GET, HEAD');
      res.status(405).json({
        ok: false,
        error: 'Method Not Allowed',
      });
      return;
    }

    const schemaCheck = PublicLiveStateDocSchema.safeParse(PROBE_LIVE_STATE);

    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      ok: schemaCheck.success,
      service: 'nanryosai-2027-functions',
      region: 'asia-northeast1',
      runtime: process.version,
      sharedSchemaVerified: schemaCheck.success,
      timestampIso: new Date().toISOString(),
    });
  },
);
