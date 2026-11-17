import { MopShellCard } from '@/domains/mop/components/MopShellCard';

export default function MopOrderPage() {
  return (
    <MopShellCard
      screenTitle="店頭モバイルオーダー注文シェル (/order)"
      roleDescription="店頭独立QRスキャン後のワンタイムチケット交換・商品オプション選択・3絵文字＋0.1秒時計デジタル引換券画面（Phase 3 本実装対象）。"
      queryParamName="store"
    />
  );
}
