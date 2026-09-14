import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifieerGroepsbeheerder } from "@/lib/groepsbeheerderAuth";
import { bepaalFeedbackTiming, renderFeedbackTekst, naarHtml } from "@/lib/feedbackMail";
import { verstuurEmail } from "@/lib/resend";
import type { FeedbackActie, FeedbackCategorie, Groep } from "@/types/models";

const CATEGORIEËN: FeedbackCategorie[] = ["fiche", "wijziging", "foto", "kampplaats", "mijlpaal", "leidingsploeg"];
const ACTIES: FeedbackActie[] = ["goedgekeurd", "afgewezen"];

/**
 * Enige plek die beslist of een feedbackmail (naar een indiener, over de
 * goed-/afkeuring van diens inzending) meteen verstuurd of gebundeld voor de
 * nachtelijke job klaargezet wordt -- alle 13 goed-/afkeur-handlers in
 * app/[groep]/beheer/** roepen dit aan via FeedbackFactory.stuur() en hoeven
 * zelf niets van die keuze te weten.
 */
export async function POST(request: NextRequest) {
  let body: { groepId?: string; categorie?: string; actie?: string; ontvangerEmail?: string; referentie?: string; itemId?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { groepId, categorie, actie, ontvangerEmail, referentie, itemId } = body;
  if (
    !groepId ||
    !categorie ||
    !CATEGORIEËN.includes(categorie as FeedbackCategorie) ||
    !actie ||
    !ACTIES.includes(actie as FeedbackActie) ||
    !ontvangerEmail ||
    !referentie
  ) {
    return Response.json({ error: "Ontbrekende of ongeldige velden." }, { status: 400 });
  }

  const auth = await verifieerGroepsbeheerder(request, groepId);
  if (auth instanceof Response) return auth;

  const groepSnap = await adminDb.collection("groepen").doc(groepId).get();
  if (!groepSnap.exists) {
    return Response.json({ error: "Groep bestaat niet." }, { status: 404 });
  }
  const groep = groepSnap.data() as Groep;

  const categorieTyped = categorie as FeedbackCategorie;
  const actieTyped = actie as FeedbackActie;
  const timing = bepaalFeedbackTiming(groep.feedbackTiming, categorieTyped);

  if (timing === "nachtelijk") {
    await adminDb.collection("feedbackWachtrij").add({
      groepId,
      ontvangerEmail,
      categorie: categorieTyped,
      actie: actieTyped,
      referentie,
      itemId: itemId || null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, timing });
  }

  const { onderwerp, inhoud } = renderFeedbackTekst(groep.naam, [{ categorie: categorieTyped, actie: actieTyped, referentie }]);
  await verstuurEmail({ to: ontvangerEmail, subject: onderwerp, html: naarHtml(inhoud) });
  await adminDb.collection("verzondenMails").add({
    groepId,
    soort: "feedback",
    ontvanger: ontvangerEmail,
    onderwerp,
    inhoud,
    type: "onmiddellijk",
    categorieën: [categorieTyped],
    aantalItems: 1,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ ok: true, timing });
}
