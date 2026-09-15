import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifieerAfmeldToken } from "@/lib/afmeldToken";

/**
 * Publiek endpoint (geen login) voor de afmeldlink onderaan elke
 * ledenmailing -- ook het one-click-unsubscribe-doel (RFC 8058, de
 * List-Unsubscribe-Post-header). Verifieert het token server-side i.p.v.
 * via een Firestore-rule (een HMAC-check is niet in rules uit te drukken),
 * en antwoordt bewust generiek bij een ongeldig token -- nooit *waarom*
 * (bestaat de fiche niet, of klopt de handtekening niet), om geen bestaan
 * van een entryId te kunnen aftoetsen.
 */
export async function POST(request: NextRequest) {
  let body: { groepId?: string; entryId?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Deze afmeldlink is ongeldig." }, { status: 400 });
  }

  const { groepId, entryId, token } = body;
  if (!groepId || !entryId || !token || !verifieerAfmeldToken(groepId, entryId, token)) {
    return Response.json({ error: "Deze afmeldlink is ongeldig." }, { status: 400 });
  }

  try {
    await adminDb.collection("entries").doc(entryId).update({ magMailen: false });
  } catch (err) {
    // Fiche kan intussen verwijderd zijn -- geen fout tonen die iets over het bestaan ervan verraadt.
    console.error(`Afmelden mislukt voor entry ${entryId}:`, err);
  }

  return Response.json({ ok: true });
}
