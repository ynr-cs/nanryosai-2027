import { z } from 'zod';

/**
 * 公開クライアント環境変数の Zod 検証＆型安全アクセサ
 * - Next.js の静的インライン置換（process.env.NEXT_PUBLIC_*）を直接参照してパースする。
 * - 秘密情報（パスワードソルト・HMAC鍵等）はここへ一切追加してはならない。
 */

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/),
  NEXT_PUBLIC_FUNCTIONS_REGION: z.string().min(1).default('asia-northeast1'),
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
  NEXT_PUBLIC_MOP_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  NEXT_PUBLIC_LIVE_STATE_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

export type ValidatedPublicEnv = z.infer<typeof PublicEnvSchema>;

export function parsePublicEnv(raw: Record<string, string | undefined>): ValidatedPublicEnv {
  return PublicEnvSchema.parse(raw);
}

// Next.js Static Export がビルド時にリテラル置換できるよう明示的プロパティ参照で渡す
export const publicEnv: ValidatedPublicEnv = parsePublicEnv({
  NEXT_PUBLIC_FIREBASE_API_KEY:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBHwgFrPhKtEteRD-ZYrMrxQ3cUgwb8QDo',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'nanryosai-2027.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'nanryosai-2027',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'nanryosai-2027.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '490638573949',
  NEXT_PUBLIC_FIREBASE_APP_ID:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:490638573949:web:6aa6210be3396bb4278c14',
  NEXT_PUBLIC_GA_MEASUREMENT_ID:
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-VTX813ECF9',
  NEXT_PUBLIC_FUNCTIONS_REGION:
    process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'asia-northeast1',
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR:
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? 'false',
  NEXT_PUBLIC_MOP_ENABLED: process.env.NEXT_PUBLIC_MOP_ENABLED ?? 'false',
  NEXT_PUBLIC_LIVE_STATE_ENABLED:
    process.env.NEXT_PUBLIC_LIVE_STATE_ENABLED ?? 'false',
});

export const firebaseClientConfig = {
  apiKey: publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: publicEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID,
} as const;

export const EMULATOR_PORTS = {
  hosting: 5000,
  functions: 5001,
  firestore: 8080,
  auth: 9099,
} as const;

/**
 * Firebase クライアント SDK をローカルエミュレータへ接続すべきか判定する。
 * - 本番ビルド (NODE_ENV === 'production') へ .env.local の設定が誤混入して本番配備される事故と、
 *   本番 Hosting CSP (localhost 非許可) 上での違反を防ぐため、開発モード実行時のみ有効化する。
 */
export function shouldConnectClientEmulator(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  hostname?: string,
): boolean {
  if (publicEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
    return false;
  }
  if (nodeEnv !== 'development') {
    return false;
  }
  const currentHost =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  return currentHost === 'localhost' || currentHost === '127.0.0.1';
}

export const isMopBuildEnabled = publicEnv.NEXT_PUBLIC_MOP_ENABLED === 'true';
export const isLiveStateAutoEnabled = publicEnv.NEXT_PUBLIC_LIVE_STATE_ENABLED === 'true';
