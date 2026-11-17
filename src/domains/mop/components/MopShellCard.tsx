'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { isMopBuildEnabled } from '@/lib/env';
import { stripLocationHashOnly } from '@/lib/url-safety';

export interface MopShellCardProps {
  readonly screenTitle: string;
  readonly roleDescription: string;
  readonly queryParamName?: 'store';
}

function MopShellInner({
  screenTitle,
  roleDescription,
  queryParamName = 'store',
}: MopShellCardProps) {
  const searchParams = useSearchParams();
  const targetId = searchParams.get(queryParamName) ?? '(未指定)';
  const srcParam = searchParams.get('src') ?? '(なし)';
  const [strippedTokenInfo, setStrippedTokenInfo] = useState<string>('(なし)');

  useEffect(() => {
    const res = stripLocationHashOnly();
    if (res.didStrip && res.strippedHash) {
      setStrippedTokenInfo('URLフラグメントから安全消去済み');
    }
  }, []);

  return (
    <section className="card stack-md">
      <div className="row-wrap">
        <span className={isMopBuildEnabled ? 'badge badge-ok' : 'badge badge-warn'}>
          {isMopBuildEnabled ? 'MOPモジュール有効' : 'MOPキルスイッチ停止中 (Phase 1 静的シェル)'}
        </span>
        <span className="code-pill">
          ?{queryParamName}={targetId}
        </span>
      </div>
      <h1>{screenTitle}</h1>
      <p className="meta-text">{roleDescription}</p>
      <dl className="stack-md">
        <div>
          <dt className="meta-text">対象識別子 (`?{queryParamName}=`)</dt>
          <dd data-testid="mop-target-id">{targetId}</dd>
        </div>
        <div>
          <dt className="meta-text">保持された計測クエリ (`?src=`)</dt>
          <dd data-testid="mop-src-param">{srcParam}</dd>
        </div>
        <div>
          <dt className="meta-text">動的QRトークン消去状態 (`location.hash`)</dt>
          <dd data-testid="mop-hash-status">{strippedTokenInfo}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * 第2層（MOP / 有人POS）単一静的シェル枠（Phase 1 土台 / Phase 3 本実装）
 * - 動的 `[storeId]` ルートを使わず `?store=` クエリ方式に統一することで、
 *   Static Export 環境での店舗追加時 404 回避と朝8:30の単一PWAキャッシュ動作を保証する。
 */
export function MopShellCard(props: MopShellCardProps) {
  return (
    <Suspense
      fallback={
        <section className="card stack-md">
          <h1>{props.screenTitle}</h1>
          <p className="meta-text">シェルを読み込み中...</p>
        </section>
      }
    >
      <MopShellInner {...props} />
    </Suspense>
  );
}
