'use client';

import { PortalLink } from '@/domains/portal/components/PortalLink';
import { usePortalLiveState } from '@/domains/portal/context/LiveStateProvider';
import { isMopBuildEnabled } from '@/lib/env';
import type { ProjectMaster } from '@/types/domain';

/**
 * 3段階キルスイッチ内蔵 MOP連携枠（D-004 準拠）
 * - portal 層は mop 層のコードを 1行も import せず、URL 遷移のみで完全分離する。
 * - ① isMopBuildEnabled × ② project.mopConfig?.enabled × ③ liveState.mopGlobalEnabled の3段階で判定。
 */
export function OrderEntrySlot({ project }: { readonly project: ProjectMaster }) {
  const { data } = usePortalLiveState();
  const mop = project.mopConfig;

  if (!mop || !mop.enabled) {
    return null;
  }

  if (!isMopBuildEnabled) {
    return (
      <section className="card stack-md" aria-label="モバイルオーダー対応店舗">
        <div className="row-wrap">
          <span className="tag mop">モバイルオーダー対応店舗</span>
          <span className="meta-text">現在は準備・検証期間中のため事前公開前です</span>
        </div>
        <p className="meta-text">
          当日は店頭QR専用iPadをスキャンすることで、スマホから順番待ち受付が可能になります（お支払いは商品受取時の完全キャッシュレス決済）。
        </p>
      </section>
    );
  }

  const storeSummary = data.mopStores[mop.storeId];
  const isGlobalOpen = data.mopGlobalEnabled;
  const isSoldOut = storeSummary?.status === 'sold_out' || storeSummary?.status === 'closed';

  return (
    <section className="card stack-md" aria-label="店頭モバイルオーダー">
      <div className="row-wrap">
        <span className="tag mop">店頭モバイルオーダー対象店舗</span>
        {!isGlobalOpen ? (
          <span className="badge badge-warn">現在受付時間外</span>
        ) : isSoldOut ? (
          <span className="badge badge-danger">本日の受付終了</span>
        ) : (
          <span className="badge badge-ok">受付可能</span>
        )}
      </div>
      <p className="meta-text">
        店頭の注文QR専用iPadをスキャンすると順番待ち受付が可能です（お支払いは商品受取時のAirPAY決済）。
      </p>
      <div>
        <PortalLink href={`/order?store=${project.id}`} className="btn btn-primary">
          注文案内画面へ進む
        </PortalLink>
      </div>
    </section>
  );
}
