import { VenueShellCard } from '@/domains/venue/components/VenueShellCard';

export default function VenueAdminPage() {
  return (
    <VenueShellCard
      screenTitle="ステージ会場スタッフ混雑・進行更新シェル (/venue)"
      roleDescription="会場ID＋パスワード手入力による限定認証（venue_staff ロール・自会場1箇所のみ更新可）＋ 1タップ遅延/混雑ステータス切替画面（Phase 2-3 本実装対象 / MOPキルスイッチ停止時も単独稼働）。"
    />
  );
}
