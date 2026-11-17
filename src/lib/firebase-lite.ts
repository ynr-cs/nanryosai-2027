import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore as FirestoreLite,
} from 'firebase/firestore/lite';
import {
  EMULATOR_PORTS,
  firebaseClientConfig,
  shouldConnectClientEmulator,
} from './env';

/**
 * 第1層（Webポータル）専用の超軽量 Firestore Lite クライアント（D-003 / D-004）
 * - firebase/auth, firebase/functions, 通常版 firebase/firestore を一切含めない。
 * - 単一ドキュメント `public/live_state` の差分読込のみに使用する。
 */

const PORTAL_APP_NAME = 'nanryosai-portal-lite';
let cachedDb: FirestoreLite | null = null;
let emulatorConnected = false;

function getOrCreatePortalApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === PORTAL_APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp(firebaseClientConfig, PORTAL_APP_NAME);
}

export function getPortalFirestoreLite(): FirestoreLite {
  if (cachedDb) {
    return cachedDb;
  }
  const app = getOrCreatePortalApp();
  const db = getFirestore(app);

  if (!emulatorConnected && shouldConnectClientEmulator()) {
    connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    emulatorConnected = true;
  }

  cachedDb = db;
  return db;
}
