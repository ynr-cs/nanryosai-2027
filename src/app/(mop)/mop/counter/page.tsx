import { MopShellCard } from '@/domains/mop/components/MopShellCard';

export default function MopCounterPosPage() {
  return (
    <MopShellCard
      screenTitle="出し口呼び出し＆有人POS統合シェル (/mop/counter)"
      roleDescription="呼び出し・3絵文字＆AirPAY金額確認・不在パス残数自動戻し・有人POS（100〜999発番）画面（Phase 3 本実装対象）。"
      queryParamName="store"
    />
  );
}
