import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { mailContactId, genormaliseerdEmail } from "@/lib/mailContact";
import type { MailContact } from "@/types/models";

/**
 * Publiek endpoint (geen auth), aangeroepen (best-effort, non-blocking)
 * vanuit /toevoegen ná een geslaagde fiche-indiening: koppelt het
 * opgegeven e-mailadres aan een bestaand of nieuw mailContacten-
 * document. Loopt bewust via de Admin SDK -- een anonieme client mag
 * nooit rechtstreeks een bestaand contact van iemand anders kunnen
 * ombuigen (vandaar geen publieke Firestore-rule hiervoor, zie
 * firestore.rules).
 */
export async function POST(request: NextRequest) {
  let body: { groepId?: string; entryId?: string; naam?: string; email?: string; magMailen?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { groepId, entryId, naam, email, magMailen } = body;
  if (!groepId || !entryId || !email?.trim()) {
    return Response.json({ error: "Ontbrekende velden." }, { status: 400 });
  }

  const ref = adminDb.collection("mailContacten").doc(mailContactId(groepId, email));
  const snap = await ref.get();

  if (snap.exists) {
    const bestaand = snap.data() as MailContact;
    await ref.update({
      entryId,
      // Nooit een al ingevulde naam overschrijven (die kan door de beheerder zelf gezet zijn).
      ...(bestaand.naam ? {} : { naam: naam || "" }),
      // Toestemming enkel optillen naar true -- nooit stilzwijgend afmelden via dit pad.
      ...(magMailen ? { magMailen: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set({
      groepId,
      naam: naam || "",
      email: genormaliseerdEmail(email),
      magMailen: Boolean(magMailen),
      entryId,
      afgemeldOp: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return Response.json({ ok: true });
}
