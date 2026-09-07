import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK -- enkel voor server-side code (Route Handlers, Server
 * Actions, het migratiescript). Nooit importeren in een Client Component:
 * de service-account-sleutel mag nooit naar de browser lekken.
 *
 * Vereist FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL en FIREBASE_PRIVATE_KEY
 * (uit een service-account-sleutel, zie Firebase Console -> Project
 * Settings -> Service accounts -> Generate new private key). Deze env vars
 * zijn *niet* NEXT_PUBLIC_-geprefixt: ze blijven server-only.
 */
function getFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK niet geconfigureerd: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL en FIREBASE_PRIVATE_KEY zijn vereist."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = getFirebaseAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export default adminApp;
