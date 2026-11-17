import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore as FirestoreLite,
} from 'firebase/firestore/lite';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import {
  EMULATOR_PORTS,
  firebaseClientConfig,
  publicEnv,
  shouldConnectClientEmulator,
} from '@/lib/env';

/**
 * 会場スタッフ管理画面（/venue）専用 Firebase SDK 初期化モジュール（D-003 / D-004 / D-006 / D-009.1）
 * - ステージ会場ステータス運用は第1層（Webポータル）側の機能であるため、MOPキルスイッチ停止時も単独稼働する。
 * - 同時に、一般来場者向け (portal) バンドルへ firebase/auth・firebase/functions を混入させないよう、
 *   専用の src/domains/venue 境界へ分離し ESLint で (portal) / 共有層からの import を遮断する。
 */

const VENUE_APP_NAME = 'nanryosai-venue-layer';

export interface VenueFirebaseServices {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: FirestoreLite;
  readonly functions: Functions;
}

let cachedServices: VenueFirebaseServices | null = null;

export function getVenueFirebaseServices(): VenueFirebaseServices {
  if (cachedServices) {
    return cachedServices;
  }

  const existing = getApps().find((candidate) => candidate.name === VENUE_APP_NAME);
  const app = existing ?? initializeApp(firebaseClientConfig, VENUE_APP_NAME);
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
