// Gebruikersbeheer voor de systeembeheerder: overzicht van alle Firebase
// Auth-accounts (met hun aantal groepslidmaatschappen) en het uitnodigen
// van een nieuwe gebruiker. Aanmaken gebeurt bewust zonder wachtwoord --
// de gebruiker stelt dat zelf in via de link in de uitnodigingsmail (zie
// app/wachtwoord-instellen), net als het gangbare "invite"-patroon. Wordt
// hetzelfde e-mailadres nogmaals uitgenodigd, dan krijgt het bestaande
// account gewoon een nieuwe link toegestuurd (handig om een uitnodiging
// opnieuw te versturen).
//
// Een groepsbeheerder-uitnodiging koppelt de gebruiker meteen aan een
// groep (groepId verplicht) -- zonder groep kan een gebruiker aanmelden
// maar nergens een beheerpagina laden (zie RequireGroepsbeheerder), wat
// zonder de uitlog-vluchtstrook die daar nu ook bij hoort tot een
// doodlopend scherm leidde.

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifieerSysteembeheerder } from "@/lib/systeembeheerderAuth";
import { verstuurEmail } from "@/lib/resend";

type GebruikerType = "groepsbeheerder" | "systeembeheerder";

export async function GET(request: NextRequest) {
  const auth = await verifieerSysteembeheerder(request);
  if (auth instanceof Response) return auth;

  try {
    const gebruikers: {
      uid: string;
      email: string | null;
      disabled: boolean;
      systeembeheerder: boolean;
      aangemaaktOp: string | null;
      laatsteAanmelding: string | null;
    }[] = [];

    let pageToken: string | undefined;
    do {
      const result = await adminAuth.listUsers(1000, pageToken);
      for (const u of result.users) {
        gebruikers.push({
          uid: u.uid,
          email: u.email ?? null,
          disabled: u.disabled,
          systeembeheerder: u.customClaims?.systeembeheerder === true,
          aangemaaktOp: u.metadata.creationTime ?? null,
          laatsteAanmelding: u.metadata.lastSignInTime ?? null,
        });
      }
      pageToken = result.pageToken;
    } while (pageToken);

    const lidmaatschapSnap = await adminDb.collection("lidmaatschappen").get();
    const aantalGroepen = new Map<string, number>();
    lidmaatschapSnap.docs.forEach((d) => {
      const userId = d.data().userId as string;
      aantalGroepen.set(userId, (aantalGroepen.get(userId) || 0) + 1);
    });

    gebruikers.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    return Response.json({
      gebruikers: gebruikers.map((g) => ({ ...g, aantalGroepen: aantalGroepen.get(g.uid) || 0 })),
    });
  } catch (err) {
    console.error("gebruikers ophalen mislukt:", err);
    const details = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Laden van gebruikers is mislukt: ${details}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifieerSysteembeheerder(request);
  if (auth instanceof Response) return auth;

  const { email, type, groepId } = (await request.json().catch(() => null)) || {};
  if (!email || typeof email !== "string" || !email.trim()) {
    return Response.json({ error: "E-mailadres is verplicht." }, { status: 400 });
  }
  if (type !== "groepsbeheerder" && type !== "systeembeheerder") {
    return Response.json({ error: "Type moet 'groepsbeheerder' of 'systeembeheerder' zijn." }, { status: 400 });
  }
  const gebruikerType = type as GebruikerType;
  if (gebruikerType === "groepsbeheerder" && (!groepId || typeof groepId !== "string")) {
    return Response.json({ error: "Kies een groep voor deze groepsbeheerder." }, { status: 400 });
  }
  if (gebruikerType === "groepsbeheerder") {
    const groepSnap = await adminDb.collection("groepen").doc(groepId).get();
    if (!groepSnap.exists) {
      return Response.json({ error: "Groep niet gevonden." }, { status: 404 });
    }
  }
  const schoonEmail = email.trim().toLowerCase();

  let uid: string;
  let opnieuwUitgenodigd: boolean;
  try {
    const bestaand = await adminAuth.getUserByEmail(schoonEmail);
    uid = bestaand.uid;
    opnieuwUitgenodigd = true;
  } catch (opzoekFout) {
    // getUserByEmail gooit ook een fout die niets met "niet gevonden" te
    // maken heeft (bv. een tijdelijk netwerk-/API-probleem) -- enkel de
    // eigenlijke "geen account met dit e-mailadres"-fout mag hier een
    // nieuw account aanmaken, anders verdrinkt een echt probleem stilzwijgend.
    if (!(opzoekFout as { code?: string })?.code?.includes("user-not-found")) {
      console.error("uitnodiging: opzoeken van gebruiker mislukt:", opzoekFout);
      return Response.json({ error: "Opzoeken van het account is mislukt." }, { status: 500 });
    }
    try {
      const nieuw = await adminAuth.createUser({ email: schoonEmail });
      uid = nieuw.uid;
      opnieuwUitgenodigd = false;
    } catch (aanmaakFout) {
      console.error("uitnodiging: aanmaken van gebruiker mislukt:", aanmaakFout);
      const details = aanmaakFout instanceof Error ? aanmaakFout.message : String(aanmaakFout);
      return Response.json({ error: `Aanmaken van het account is mislukt: ${details}` }, { status: 500 });
    }
  }

  try {
    if (gebruikerType === "systeembeheerder") {
      await adminAuth.setCustomUserClaims(uid, { systeembeheerder: true });
    } else {
      await adminDb
        .collection("lidmaatschappen")
        .doc(`${uid}_${groepId}`)
        .set({ userId: uid, groepId, rol: "groepsbeheerder", createdAt: FieldValue.serverTimestamp() });
    }
  } catch (err) {
    console.error("uitnodiging: toekennen van rol mislukt:", err);
    const details = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Account is aangemaakt, maar de rol toekennen is mislukt: ${details}` }, { status: 500 });
  }

  let link: string;
  try {
    link = await adminAuth.generatePasswordResetLink(schoonEmail, {
      url: `${request.nextUrl.origin}/wachtwoord-instellen`,
      handleCodeInApp: true,
    });
  } catch (err) {
    console.error("uitnodiging: genereren van wachtwoord-link mislukt:", err);
    return Response.json({ error: "Aanmaken van de uitnodigingslink is mislukt." }, { status: 500 });
  }

  try {
    await verstuurEmail({ to: schoonEmail, subject: "Uitnodiging voor Ons Stamboek", html: uitnodigingsEmail(link, gebruikerType) });
  } catch (err) {
    console.error("uitnodiging: versturen van e-mail mislukt:", err);
    return Response.json(
      { error: "Account is aangemaakt, maar de uitnodigingsmail versturen is mislukt. Probeer het opnieuw." },
      { status: 502 }
    );
  }

  return Response.json({ uid, email: schoonEmail, opnieuwUitgenodigd });
}

function uitnodigingsEmail(link: string, type: GebruikerType): string {
  const rolTekst = type === "systeembeheerder" ? "als systeembeheerder" : "als groepsbeheerder";
  return `
    <div style="font-family: 'Work Sans', Arial, sans-serif; color: #2C2419; max-width: 480px; margin: 0 auto;">
      <h1 style="font-family: Georgia, serif; font-size: 22px; margin-bottom: 4px;">Welkom bij Ons Stamboek</h1>
      <p>Je bent uitgenodigd om ${rolTekst} aan de slag te gaan op Ons Stamboek. Stel hieronder je wachtwoord in om je account te activeren.</p>
      <p style="margin: 28px 0;">
        <a href="${link}" style="display:inline-block; padding: 12px 22px; background:#3E5B45; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">
          Wachtwoord instellen
        </a>
      </p>
      <p style="font-size: 13px; color: #6B5F4C;">Werkt de knop niet? Kopieer dan deze link in je browser:<br />${link}</p>
      <p style="font-size: 12px; color: #6B5F4C; margin-top: 32px;">Deze link is een beperkte tijd geldig. Heb je deze uitnodiging niet verwacht, dan mag je deze e-mail gewoon negeren.</p>
    </div>
  `;
}
