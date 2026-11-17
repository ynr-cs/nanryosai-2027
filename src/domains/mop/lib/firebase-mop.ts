import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import {
  EMULATOR_PORTS,
  firebaseClientConfig,
  publicEnv,
  shouldConnectClientEmulator,
} from '@/lib/env';

/**
 * 第2層（MOP / 有人POS）専用 Firebase SDK 初期化モジュール（D-004 二層完全分離）
 * - 第1層（src/domains/portal, src/app/(portal)）および会場管理層（/venue）からこのファイルを import すると ESLint エラーで遮断される。
 * - Phase 3 でカスタムトークン認証・リアルタイム注文監視・Cloud Functions 呼び出しの本実装を行う。
 */

const MOP_APP_NAME = 'nanryosai-mop-layer';

interface MopFirebaseServices {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;
}

let cachedServices: MopFirebaseServices | null = null;

export function getMopFirebaseServices(): MopFirebaseServices {
  if (cachedServices) {
    return cachedServices;
  }

  const existing = getApps().find((candidate) => candidate.name === MOP_APP_NAME);
  const app = existing ?? initializeApp(firebaseClientConfig, MOP_APP_NAME);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, publicEnv.NEXT_PUBLIC_FUNCTIONS_REGION);

  if (shouldConnectClientEmulator()) {
    connectAuthEmulator(auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    connectFunctionsEmulator(functions, '127.0.0.1', EMULATOR_PORTS.functions);
  }

  cachedServices = { app, auth, db, functions };
  return cachedServices;
}
