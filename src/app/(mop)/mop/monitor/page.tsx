import { MopShellCard } from '@/domains/mop/components/MopShellCard';

export default function MopPresentationMonitorPage() {
  return (
    <MopShellCard
      screenTitle="独立プレゼンモニター表示シェル (/mop/monitor)"
      roleDescription="上部「お呼び出し中」特大表示＋下部「順番待ち・調理中」控えめ表示モニター（MOP 4桁・POS 3桁対応 / Phase 3 本実装対象）。"
      queryParamName="store"
    />
  );
}
