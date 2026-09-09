"use client";

import {
  confirmPasswordReset,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export async function login(email: string, wachtwoord: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, wachtwoord);
  return credential.user;
}

/**
 * Rondt de uitnodigings-/wachtwoord-instellen-flow af (zie
 * app/wachtwoord-instellen en app/api/systeembeheer/gebruikers/route.ts,
 * die de `oobCode` via een Firebase-wachtwoordherstellink verstuurt).
 * `verifyPasswordResetCode` gooit een fout bij een verlopen/ongeldige code,
 * nog voor er een wachtwoord wordt weggeschreven.
 */
export async function stelWachtwoordIn(oobCode: string, nieuwWachtwoord: string): Promise<string> {
  const email = await verifyPasswordResetCode(auth, oobCode);
  await confirmPasswordReset(auth, oobCode, nieuwWachtwoord);
  return email;
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Roept `callback` aan bij elke wijziging van de auth-status (login/logout). */
export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Systeembeheerders krijgen de custom claim `systeembeheerder: true` op hun
 * Firebase Auth-token (gezet via de Admin SDK, zie scripts/setSysteembeheerder.ts
 * -- dit kan niet via de Firebase Console-UI). Groepsbeheerders daarentegen
 * worden herkend via een document in de `lidmaatschappen`-collectie (zie
 * lib/dbSchema.ts, LidmaatschapFactory) omdat één gebruiker beheerder kan
 * zijn van meerdere groepen -- dat past slecht in een klein, statisch
 * custom-claims-object.
 */
export async function isSysteembeheerder(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult();
  return token.claims.systeembeheerder === true;
}
