// Groepsbeheerders van je eigen groep beheren: overzicht opvragen, iemand
// uitnodigen/toevoegen, of een beheerder verwijderen. In tegenstelling tot
// app/api/systeembeheer/lidmaatschap/route.ts (systeembeheerder-only, vereist
// al een bestaand account) mag hier elke groepsbeheerder van déze groep dit
// zelf doen, en wordt er -- als het e-mailadres nog nergens een account
// heeft -- meteen een nieuw account aangemaakt + een uitnodigingsmail
// verstuurd (zelfde patroon als app/api/systeembeheer/gebruikers/route.ts).
//
// Verwijderen raakt uitsluitend het `lidmaatschappen`-document; het
// Firebase Auth-account zelf wordt nooit aangeraakt (adminAuth.deleteUser
// wordt hier bewust nergens aangeroepen).

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifieerGroepsbeheerder } from "@/lib/groepsbeheerderAuth";
import { verstuurEmail } from "@/lib/resend";

function lidmaatschapDocId(userId: string, groepId: string) {
  return `${userId}_${groepId}`;
}

export async function GET(request: NextRequest) {
  const groepId = request.nextUrl.searchParams.get("groepId");
  if (!groepId) {
    return Response.json({ error: "groepId is verplicht." }, { status: 400 });
  }
  const auth = await verifieerGroepsbeheerder(request, groepId);
  if (auth instanceof Response) return auth;

  const snap = await adminDb.collection("lidmaatschappen").where("groepId", "==", groepId).get();
  const beheerders = await Promise.all(
    snap.docs.map(async (d) => {
      const userId = d.data().userId as string;
      let email: string | null = null;
      try {
        email = (await adminAuth.getUser(userId)).email ?? null;
      } catch {
        // Gebruiker bestaat niet meer in Firebase Auth -- toon het
        // lidmaatschap toch, zodat het opgekuist kan worden.
      }
      return { userId, email };
    })
  );

  return Response.json({ beheerders, huidigeUid: auth.uid });
}

export async function POST(request: NextRequest) {
  const { groepId, email } = (await request.json().catch(() => null)) || {};
  if (!groepId || typeof groepId !== "string" || !email || typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "groepId en een geldig e-mailadres zijn verplicht." }, { status: 400 });
  }
  const auth = await verifieerGroepsbeheerder(request, groepId);
  if (auth instanceof Response) return auth;

  const groepSnap = await adminDb.collection("groepen").doc(groepId).get();
  if (!groepSnap.exists) {
    return Response.json({ error: "Groep niet gevonden." }, { status: 404 });
  }
  const groepNaam = (groepSnap.data()?.naam as string) || "je groep";

  const schoonEmail = email.trim().toLowerCase();

  let uid: string;
  let nieuwAccount: boolean;
  try {
    const bestaand = await adminAuth.getUserByEmail(schoonEmail);
    uid = bestaand.uid;
    nieuwAccount = false;
  } catch (opzoekFout) {
    if (!(opzoekFout as { code?: string })?.code?.includes("user-not-found")) {
      console.error("beheerder uitnodigen: opzoeken van gebruiker mislukt:", opzoekFout);
      return Response.json({ error: "Opzoeken van het account is mislukt." }, { status: 500 });
    }
    try {
      const nieuw = await adminAuth.createUser({ email: schoonEmail });
      uid = nieuw.uid;
      nieuwAccount = true;
    } catch (aanmaakFout) {
      console.error("beheerder uitnodigen: aanmaken van gebruiker mislukt:", aanmaakFout);
      const details = aanmaakFout instanceof Error ? aanmaakFout.message : String(aanmaakFout);
      return Response.json({ error: `Aanmaken van het account is mislukt: ${details}` }, { status: 500 });
    }
  }

  const bestaandLidmaatschap = await adminDb.collection("lidmaatschappen").doc(lidmaatschapDocId(uid, groepId)).get();
  if (bestaandLidmaatschap.exists) {
    return Response.json({ error: "Deze persoon is al beheerder van deze groep." }, { status: 400 });
  }

  await adminDb
    .collection("lidmaatschappen")
    .doc(lidmaatschapDocId(uid, groepId))
    .set({ userId: uid, groepId, rol: "groepsbeheerder", createdAt: FieldValue.serverTimestamp() });

  try {
    if (nieuwAccount) {
      const link = await adminAuth.generatePasswordResetLink(schoonEmail, {
        url: `${request.nextUrl.origin}/wachtwoord-instellen`,
        handleCodeInApp: true,
      });
      await verstuurEmail({
        to: schoonEmail,
        subject: `Uitnodiging: groepsbeheerder van ${groepNaam}`,
        html: beheerderEmail({ groepNaam, link, nieuwAccount: true }),
      });
    } else {
      await verstuurEmail({
        to: schoonEmail,
        subject: `Je bent toegevoegd als groepsbeheerder van ${groepNaam}`,
        html: beheerderEmail({ groepNaam, link: `${request.nextUrl.origin}/aanmelden`, nieuwAccount: false }),
      });
    }
  } catch (err) {
    console.error("beheerder uitnodigen: versturen van e-mail mislukt:", err);
    return Response.json(
      { error: "Beheerderschap is toegekend, maar de mail versturen is mislukt. Probeer het opnieuw of laat het de persoon zelf weten." },
      { status: 502 }
    );
  }

  return Response.json({ userId: uid, email: schoonEmail, nieuwAccount });
}

export async function DELETE(request: NextRequest) {
  const { groepId, userId } = (await request.json().catch(() => null)) || {};
  if (!groepId || typeof groepId !== "string" || !userId || typeof userId !== "string") {
    return Response.json({ error: "groepId en userId zijn verplicht." }, { status: 400 });
  }
  const auth = await verifieerGroepsbeheerder(request, groepId);
  if (auth instanceof Response) return auth;

  if (userId === auth.uid) {
    return Response.json({ error: "Je kan jezelf niet verwijderen als beheerder." }, { status: 400 });
  }

  const snap = await adminDb.collection("lidmaatschappen").where("groepId", "==", groepId).get();
  if (snap.size <= 1 && snap.docs.some((d) => d.data().userId === userId)) {
    return Response.json({ error: "Je kan de laatste beheerder van een groep niet verwijderen." }, { status: 400 });
  }

  await adminDb.collection("lidmaatschappen").doc(lidmaatschapDocId(userId, groepId)).delete();
  return Response.json({ ok: true });
}

function beheerderEmail({ groepNaam, link, nieuwAccount }: { groepNaam: string; link: string; nieuwAccount: boolean }): string {
  const intro = nieuwAccount
    ? `Je bent uitgenodigd om samen met de andere beheerders <strong>${groepNaam}</strong> te beheren op Ons Stamboek. Stel hieronder je wachtwoord in om je account te activeren.`
    : `Je bent toegevoegd als groepsbeheerder van <strong>${groepNaam}</strong> op Ons Stamboek. Je kan meteen aanmelden met je bestaande account om deze groep mee te beheren.`;
  const knopTekst = nieuwAccount ? "Wachtwoord instellen" : "Aanmelden";
  return `
    <div style="font-family: 'Work Sans', Arial, sans-serif; color: #2C2419; max-width: 480px; margin: 0 auto;">
      <h1 style="font-family: Georgia, serif; font-size: 22px; margin-bottom: 4px;">Welkom bij Ons Stamboek</h1>
      <p>${intro}</p>
      <p style="margin: 28px 0;">
        <a href="${link}" style="display:inline-block; padding: 12px 22px; background:#3E5B45; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">
          ${knopTekst}
        </a>
      </p>
      <p style="font-size: 13px; color: #6B5F4C;">Werkt de knop niet? Kopieer dan deze link in je browser:<br />${link}</p>
      <p style="font-size: 12px; color: #6B5F4C; margin-top: 32px;">Heb je dit niet verwacht, dan mag je deze e-mail gewoon negeren.</p>
    </div>
  `;
}
