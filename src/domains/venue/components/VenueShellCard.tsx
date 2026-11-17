'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { isLiveStateAutoEnabled } from '@/lib/env';
import { stripLocationHashOnly } from '@/lib/url-safety';
import type { StageVenueId, StageVenueLabel } from '@/types/domain';
import { StageVenueIdSchema } from '@/types/schemas';

const STAGE_VENUE_LABELS: Readonly<Record<StageVenueId, StageVenueLabel>> = {
  gym_stage: '体育館',
  admin_3f_av_room: '視聴覚室',
  student_4f_music_room: '音楽室',
};

export interface VenueShellCardProps {
  readonly screenTitle: string;
  readonly roleDescription: string;
}

function VenueShellInner({ screenTitle, roleDescription }: VenueShellCardProps) {
  const searchParams = useSearchParams();
  const rawVenue = searchParams.get('venue');
  const srcParam = searchParams.get('src') ?? '(なし)';
  const [strippedTokenInfo, setStrippedTokenInfo] = useState<string>('(なし)');

  useEffect(() => {
    const res = stripLocationHashOnly();
    if (res.didStrip && res.strippedHash) {
      setStrippedTokenInfo('URLフラグメントから安全消去済み');
    }
  }, []);

  const parsedVenue = rawVenue ? StageVenueIdSchema.safeParse(rawVenue) : null;
  const resolvedVenueDisplay =
    rawVenue === null || rawVenue === ''
      ? '(未指定)'
      : parsedVenue?.success
        ? `${parsedVenue.data} (${STAGE_VENUE_LABELS[parsedVenue.data]})`
        : `${rawVenue} (未登録会場ID)`;

  return (
    <section className="card stack-md">
      <div className="row-wrap">
        <span className="badge badge-ok" data-testid="venue-operational-badge">
          ステージ会場運用シェル 稼働中 (MOPキルスイッチ非連動)
        </span>
        <span className={isLiveStateAutoEnabled ? 'badge badge-stage' : 'code-pill'}>
          {isLiveStateAutoEnabled
            ? 'live_state 自動同期: 有効'
            : 'Phase 1 静的シェル (Phase 2-3 本実装枠)'}
        </span>
        <span className="code-pill">?venue={rawVenue ?? '(未指定)'}</span>
      </div>
      <h1>{screenTitle}</h1>
      <p className="meta-text">{roleDescription}</p>
      <dl className="stack-md">
        <div>
          <dt className="meta-text">対象ステージ会場 (`?venue=`)</dt>
          <dd data-testid="venue-target-id">{resolvedVenueDisplay}</dd>
        </div>
        <div>
          <dt className="meta-text">保持された計測クエリ (`?src=`)</dt>
          <dd data-testid="venue-src-param">{srcParam}</dd>
        </div>
        <div>
          <dt className="meta-text">URLフラグメント消去状態 (`location.hash`)</dt>
          <dd data-testid="venue-hash-status">{strippedTokenInfo}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * 会場スタッフ向けステージ混雑・遅延更新シェル (/venue — D-004 / D-009.1 / ROADMAP 2-3)
 * - MOPモジュール無効化時も第1層ポータルのライブステータス運用として単独稼働する。
 * - 来場者向け (portal) ルートグループからは分離し、firebase/auth・firebase/functions のポータル混入を防ぐ。
 */
export function VenueShellCard(props: VenueShellCardProps) {
  return (
    <Suspense
      fallback={
        <section className="card stack-md">
          <h1>{props.screenTitle}</h1>
          <p className="meta-text">会場管理シェルを読み込み中...</p>
        </section>
      }
    >
      <VenueShellInner {...props} />
    </Suspense>
  );
}
