/**
 * Eenmalig scriptje om de custom claim `systeembeheerder: true` te zetten
 * op een Firebase Auth-account -- dit kan niet via de Firebase Console-UI,
 * enkel via de Admin SDK. Draai dit tegen het NIEUWE Firebase-project van
 * dit platform.
 *
 * Gebruik:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *     npx tsx scripts/setSysteembeheerder.ts jouw@email.be
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Gebruik: npx tsx scripts/setSysteembeheerder.ts <email>");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL en FIREBASE_PRIVATE_KEY zijn vereist.");
    process.exit(1);
  }

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const auth = getAuth(app);

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, systeembeheerder: true });
  console.log(`${email} (${user.uid}) is nu systeembeheerder. Opnieuw inloggen is nodig om het token te vernieuwen.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
