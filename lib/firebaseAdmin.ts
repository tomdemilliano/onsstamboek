import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminCredential } from "./adminCredential";

/**
 * Firebase Admin SDK -- enkel voor server-side code (Route Handlers, Server
 * Actions, het migratiescript). Nooit importeren in een Client Component:
 * de service-account-sleutel mag nooit naar de browser lekken.
 *
 * Vereist ofwel `FIREBASE_SERVICE_ACCOUNT_KEY` (aanbevolen, zie
 * lib/adminCredential.ts) ofwel `FIREBASE_PROJECT_ID` +
 * `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` apart. Deze env vars
 * zijn *niet* NEXT_PUBLIC_-geprefixt: ze blijven server-only.
 */
function getFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  return initializeApp({
    credential: getAdminCredential("FIREBASE_"),
    // Hergebruikt dezelfde bucket als de client-config (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    // zodat adminStorageBucket hieronder zonder aparte env var werkt.
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = getFirebaseAdminApp();

type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorageBucket: Bucket = getStorage(adminApp).bucket();
export default adminApp;
