import { MopShellCard } from '@/domains/mop/components/MopShellCard';

export default function MopQrStandPage() {
  return (
    <MopShellCard
      screenTitle="店頭独立 注文QR表示専用シェル (/mop/qr)"
      roleDescription="通信ゼロ・オフラインHMAC計算により15秒ごとに動的チェックインQRを更新する専用iPad画面（Phase 3 本実装対象）。"
      queryParamName="store"
    />
  );
}
