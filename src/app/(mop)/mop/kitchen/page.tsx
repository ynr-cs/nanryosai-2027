import { MopShellCard } from '@/domains/mop/components/MopShellCard';

export default function MopKitchenPage() {
  return (
    <MopShellCard
      screenTitle="調理KVSバンプ画面シェル (/mop/kitchen)"
      roleDescription="kitchenMode: on の店舗向け調理指示・1タップ完了バンプ画面（Phase 3 本実装対象）。"
      queryParamName="store"
    />
  );
}
