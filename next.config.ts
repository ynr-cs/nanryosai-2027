import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

const pkgJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
) as { readonly version?: string };

/**
 * 南陵祭2027 Next.js 設定（D-002 / D-003 準拠）
 * - output: 'export' により Firebase Hosting 向けの純粋な静的アセット（out/）を生成
 * - trailingSlash: false を firebase.json と完全一致させリダイレクトループや計測欠落を防止
 * - 画像はビルド前 scripts/process-assets.ts (sharp) で2段階WebP化するため unoptimized: true
 * - NEXT_PUBLIC_APP_VERSION はビルド時に package.json から自動埋め込み（CHANGELOG.md 読込不要）
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkgJson.version ?? '0.1.20',
  },
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // CI / npm run lint で ESLint 9 Flat Config を厳格実行する
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
