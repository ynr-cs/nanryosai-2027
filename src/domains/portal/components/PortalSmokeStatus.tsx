'use client';

import { useEffect, useState } from 'react';
import { useLiveState } from '@/domains/portal/hooks/useLiveState';
import { EMULATOR_PORTS, publicEnv } from '@/lib/env';
import { stripLocationHashOnly } from '@/lib/url-safety';

interface HealthCheckPayload {
  readonly ok: boolean;
  readonly service: string;
  readonly region: string;
  readonly runtime: string;
  readonly sharedSchemaVerified: boolean;
  readonly timestampIso: string;
}

export function PortalSmokeStatus() {
  const liveState = useLiveState();
  const [preservedSearch, setPreservedSearch] = useState<string>('');
  const [strippedHash, setStrippedHash] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'unavailable'>(
    'idle',
  );
  const [healthDetail, setHealthDetail] = useState<string>('確認中...');

  useEffect(() => {
    const stripRes = stripLocationHashOnly();
    setPreservedSearch(window.location.search || '(クエリなし)');
    if (stripRes.didStrip && stripRes.strippedHash) {
      setStrippedHash(stripRes.strippedHash);
    }

    let cancelled = false;
    async function checkBackendHealth() {
      setHealthStatus('checking');
      const endpoint =
        window.location.port === '3070'
          ? `http://127.0.0.1:${EMULATOR_PORTS.functions}/${publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/${publicEnv.NEXT_PUBLIC_FUNCTIONS_REGION}/healthCheck`
          : '/api/health';

      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) {
            setHealthStatus('unavailable');
            setHealthDetail(`HTTP ${res.status}（静的単体配信モード）`);
          }
          return;
        }
        const body = (await res.json()) as HealthCheckPayload;
        if (!cancelled && body.ok) {
          setHealthStatus('ok');
          setHealthDetail(
            `応答OK (${body.region} / ${body.runtime} / Zod共有=${String(body.sharedSchemaVerified)})`,
          );
        }
      } catch {
        if (!cancelled) {
          setHealthStatus('unavailable');
          setHealthDetail('オフラインまたは静的単体配信モード（ポータルは100%稼働）');
        }
      }
    }

    void checkBackendHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card stack-md" aria-labelledby="smoke-heading">
      <div className="row-wrap">
        <h2 id="smoke-heading">Phase 1 基盤ステータス検証パネル</h2>
        <span className={healthStatus === 'ok' ? 'badge badge-ok' : 'badge badge-warn'}>
          {healthStatus === 'ok' ? 'Functions 疎通OK' : '静的自律モード'}
        </span>
      </div>

      <dl className="stack-md">
        <div>
          <dt className="meta-text">Cloud Functions 2nd Gen (`healthCheck`)</dt>
          <dd data-testid="health-check-detail">{healthDetail}</dd>
        </div>
        <div>
          <dt className="meta-text">URLクエリ保護 (`location.search` 維持 / `#` トークン消去)</dt>
          <dd>
            保持クエリ: <code className="code-pill" data-testid="preserved-search">{preservedSearch}</code>{' '}
            / 消去済ハッシュ:{' '}
            <code className="code-pill" data-testid="stripped-hash">
              {strippedHash ?? '(なし)'}
            </code>
          </dd>
        </div>
        <div>
          <dt className="meta-text">
            ライブ差分配信 (`public/live_state` / Phase 1 `firestore.rules` 完全閉鎖維持)
          </dt>
          <dd className="row-wrap">
            <span data-testid="live-state-source">取得元: {liveState.source}</span>
            {liveState.lastErrorCode ? (
              <code className="code-pill" data-testid="live-state-error">
                遮断確認: {liveState.lastErrorCode}
              </code>
            ) : null}
            <button
              type="button"
              className="btn"
              disabled={liveState.isSyncing}
              onClick={() => {
                void liveState.refresh(true);
              }}
              data-testid="btn-verify-fail-closed"
            >
              {liveState.isSyncing ? '確認中...' : 'Firestore閉鎖フォールバック検証'}
            </button>
          </dd>
        </div>
      </dl>
    </section>
  );
}
