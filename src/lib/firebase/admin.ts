import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;
let firestoreConfigured = false;

/**
 * On Firebase App Hosting the Admin SDK picks up credentials automatically.
 * Locally, either point FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
 * at the emulators, or set FIREBASE_SERVICE_ACCOUNT_JSON.
 */
function adminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? undefined;
  app = serviceAccount
    ? initializeApp({ credential: cert(JSON.parse(serviceAccount)), projectId })
    : initializeApp(projectId ? { projectId } : undefined);
  return app;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function db() {
  const firestore = getFirestore(adminApp());
  if (!firestoreConfigured) {
    // Optional fields (e.g. an example's note) may be undefined.
    firestore.settings({ ignoreUndefinedProperties: true });
    firestoreConfigured = true;
  }
  return firestore;
}
