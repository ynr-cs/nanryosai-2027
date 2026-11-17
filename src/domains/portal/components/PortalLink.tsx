import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

export type PortalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps
> &
  LinkProps & {
    readonly children: ReactNode;
    readonly prefetch?: boolean;
  };

/**
 * 第1層（Webポータル）専用リンクコンポーネント（D-002 実装ガードレール）
 * - デフォルトで `prefetch={false}` を強制し、企画一覧画面等で大量の RSC `.txt` プリフェッチが発生して
 *   校内Wi-Fi（BYOD2018）やモバイル回線の帯域を圧迫する事故を防止する。
 */
export function PortalLink({ prefetch = false, children, ...rest }: PortalLinkProps) {
  return (
    <Link prefetch={prefetch} {...rest}>
      {children}
    </Link>
  );
}
