/**
 * Eenmalig scriptje om de custom claim `systeembeheerder: true` te zetten
 * op een Firebase Auth-account -- dit kan niet via de Firebase Console-UI,
 * enkel via de Admin SDK. Draai dit tegen het NIEUWE Firebase-project van
 * dit platform.
 *
 * Gebruik (aanbevolen -- de volledige inhoud van het gedownloade
 * service-account-JSON-bestand, ongewijzigd geplakt):
 *   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *     npx tsx scripts/setSysteembeheerder.ts jouw@email.be
 *
 * Of met de 3 losse velden apart:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *     npx tsx scripts/setSysteembeheerder.ts jouw@email.be
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAdminCredential } from "../lib/adminCredential";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Gebruik: npx tsx scripts/setSysteembeheerder.ts <email>");
    process.exit(1);
  }

  const app = initializeApp({ credential: getAdminCredential("FIREBASE_") });
  const auth = getAuth(app);

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, systeembeheerder: true });
  console.log(`${email} (${user.uid}) is nu systeembeheerder. Opnieuw inloggen is nodig om het token te vernieuwen.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
