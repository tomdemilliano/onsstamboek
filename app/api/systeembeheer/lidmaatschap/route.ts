// Groepsbeheerders toewijzen aan/verwijderen van een groep, en de huidige
// beheerders van een groep opvragen. Enkel de systeembeheerder mag dit.
//
// Gebruikt de Admin SDK omdat (a) een e-mailadres naar een Firebase
// Auth-uid opzoeken niet via de client-SDK kan, en (b) de weergave van
// huidige beheerders hun e-mailadres nodig heeft, wat niet in het
// `lidmaatschappen`-document zelf staat (enkel userId/groepId/rol).
//
// Er is bewust geen "nodig account aanmaken"-flow: net als bij het
// systeembeheerder-account (zie README, stap 8) maakt de systeembeheerder
// eerst handmatig een Firebase Auth-gebruiker aan via de Firebase Console
// (Authentication-tabblad) met het gewenste e-mailadres, en wijst deze
// route daarna het lidmaatschap toe.

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

async function verifieerSysteembeheerder(request: NextRequest): Promise<Response | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Niet aangemeld." }, { status: 401 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.systeembeheerder !== true) {
      return Response.json({ error: "Enkel de systeembeheerder mag beheerders toewijzen." }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Ongeldige sessie -- meld opnieuw aan." }, { status: 401 });
  }
  return null;
}

function lidmaatschapDocId(userId: string, groepId: string) {
  return `${userId}_${groepId}`;
}

export async function GET(request: NextRequest) {
  const authFout = await verifieerSysteembeheerder(request);
  if (authFout) return authFout;

  const groepId = request.nextUrl.searchParams.get("groepId");
  if (!groepId) {
    return Response.json({ error: "groepId is verplicht." }, { status: 400 });
  }

  const snap = await adminDb.collection("lidmaatschappen").where("groepId", "==", groepId).get();
  const beheerders = await Promise.all(
    snap.docs.map(async (d) => {
      const userId = d.data().userId as string;
      let email: string | null = null;
      try {
        email = (await adminAuth.getUser(userId)).email ?? null;
      } catch {
        // Gebruiker bestaat niet meer in Firebase Auth (bv. elders verwijderd) --
        // toon het lidmaatschap toch, zodat de systeembeheerder het kan opkuisen.
      }
      return { userId, email };
    })
  );

  return Response.json({ beheerders });
}

export async function POST(request: NextRequest) {
  const authFout = await verifieerSysteembeheerder(request);
  if (authFout) return authFout;

  const { groepId, email } = (await request.json().catch(() => null)) || {};
  if (!groepId || typeof groepId !== "string" || !email || typeof email !== "string") {
    return Response.json({ error: "groepId en email zijn verplicht." }, { status: 400 });
  }

  const groepSnap = await adminDb.collection("groepen").doc(groepId).get();
  if (!groepSnap.exists) {
    return Response.json({ error: "Groep niet gevonden." }, { status: 404 });
  }

  let gebruiker;
  try {
    gebruiker = await adminAuth.getUserByEmail(email.trim());
  } catch {
    return Response.json(
      {
        error:
          "Geen Firebase Auth-account gevonden voor dit e-mailadres. Maak eerst handmatig een account aan via de Firebase Console (tabblad Authentication) met dit e-mailadres, en wijs daarna het beheerderschap opnieuw toe.",
      },
      { status: 404 }
    );
  }

  await adminDb
    .collection("lidmaatschappen")
    .doc(lidmaatschapDocId(gebruiker.uid, groepId))
    .set({
      userId: gebruiker.uid,
      groepId,
      rol: "groepsbeheerder",
      createdAt: FieldValue.serverTimestamp(),
    });

  return Response.json({ userId: gebruiker.uid, email: gebruiker.email ?? null });
}

export async function DELETE(request: NextRequest) {
  const authFout = await verifieerSysteembeheerder(request);
  if (authFout) return authFout;

  const { groepId, userId } = (await request.json().catch(() => null)) || {};
  if (!groepId || typeof groepId !== "string" || !userId || typeof userId !== "string") {
    return Response.json({ error: "groepId en userId zijn verplicht." }, { status: 400 });
  }

  await adminDb.collection("lidmaatschappen").doc(lidmaatschapDocId(userId, groepId)).delete();
  return Response.json({ ok: true });
}
