import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
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
  });
}

const adminApp = getFirebaseAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export default adminApp;
