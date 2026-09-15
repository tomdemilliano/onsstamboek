import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifieerGroepsbeheerder } from "@/lib/groepsbeheerderAuth";
import { verstuurEmail } from "@/lib/resend";
import { naarRijkeHtml } from "@/lib/mailOpmaak";
import { maakAfmeldToken } from "@/lib/afmeldToken";
import type { Groep, MailContact } from "@/types/models";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GECHUNKT_PER = 10;

type Ontvanger = { id: string; email: string; entryId: string | null };

/**
 * Verstuurt een door de beheerder opgestelde ledenmailing. Herbevraagt de
 * mailbare contacten (magMailen==true, ingevuld e-mailadres) altijd zelf
 * server-side -- vertrouwt nooit een door de client meegegeven
 * ontvangerslijst/toestemmingsstatus, ook niet bij doelgroep:"selectie"
 * (enkel de opgegeven ID's worden hergebruikt, de toestemming wordt
 * opnieuw gecontroleerd). Verzending gebeurt in beperkt-parallelle
 * groepjes van ${GECHUNKT_PER} (i.p.v. Resend's batch-endpoint, dat geen
 * per-bericht custom headers ondersteunt -- nodig voor de
 * List-Unsubscribe-header), met per-ontvanger foutisolatie zoals de
 * bestaande dagelijkse cron (verwerkFeedbackWachtrij): 1 mislukte
 * verzending blokkeert de rest niet.
 *
 * Een meegegeven `campagneId` (een eerder als concept bewaarde mailing)
 * wordt na verzending bijgewerkt naar status:"verzonden" i.p.v. een
 * nieuw document aan te maken.
 *
 * Foutafhandeling blijft bewust licht (v1): elke mail krijgt `replyTo` op
 * het groepscontact, dus antwoorden/bounces van de ontvangende mailserver
 * komen daar terecht -- geen eigen bounce-webhook/dashboard.
 */
export async function POST(request: NextRequest) {
  let body: {
    groepId?: string;
    onderwerp?: string;
    inhoud?: string;
    test?: boolean;
    doelgroep?: "alle" | "selectie";
    contactIds?: string[];
    campagneId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { groepId: groepIdRuw, onderwerp: onderwerpRuw, inhoud: inhoudRuw, test, doelgroep, contactIds, campagneId } = body;
  if (!groepIdRuw || !onderwerpRuw?.trim() || !inhoudRuw?.trim()) {
    return Response.json({ error: "Onderwerp en inhoud zijn verplicht." }, { status: 400 });
  }
  const groepId: string = groepIdRuw;
  const onderwerp: string = onderwerpRuw;
  const inhoud: string = inhoudRuw;

  const auth = await verifieerGroepsbeheerder(request, groepId);
  if (auth instanceof Response) return auth;

  const groepSnap = await adminDb.collection("groepen").doc(groepId).get();
  if (!groepSnap.exists) {
    return Response.json({ error: "Groep bestaat niet." }, { status: 404 });
  }
  const groep = groepSnap.data() as Groep;
  const html = naarRijkeHtml(inhoud);
  const replyTo = groep.contactEmail || undefined;

  if (test) {
    const gebruiker = await adminAuth.getUser(auth.uid);
    if (!gebruiker.email) {
      return Response.json({ error: "Geen e-mailadres gekend voor je account." }, { status: 400 });
    }
    await verstuurEmail({ to: gebruiker.email, subject: `[TEST] ${onderwerp}`, html, replyTo });
    return Response.json({ ok: true });
  }

  let ontvangers: Ontvanger[];
  if (doelgroep === "selectie" && contactIds?.length) {
    const snaps = await Promise.all(contactIds.map((id) => adminDb.collection("mailContacten").doc(id).get()));
    ontvangers = snaps
      .filter((s) => s.exists)
      .map((s) => ({ id: s.id, ...(s.data() as MailContact) }))
      .filter((c) => c.groepId === groepId && c.magMailen && Boolean(c.email?.trim()))
      .map((c) => ({ id: c.id, email: c.email, entryId: c.entryId ?? null }));
  } else {
    const snap = await adminDb.collection("mailContacten").where("groepId", "==", groepId).where("magMailen", "==", true).get();
    ontvangers = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as MailContact) }))
      .filter((c) => Boolean(c.email?.trim()))
      .map((c) => ({ id: c.id, email: c.email, entryId: c.entryId ?? null }));
  }

  const campagneRef = campagneId ? adminDb.collection("mailCampagnes").doc(campagneId) : adminDb.collection("mailCampagnes").doc();
  if (campagneId) {
    const bestaandeSnap = await campagneRef.get();
    if (!bestaandeSnap.exists || bestaandeSnap.data()?.groepId !== groepId) {
      return Response.json({ error: "Concept bestaat niet." }, { status: 404 });
    }
  }

  let aantalVerzonden = 0;
  let aantalMislukt = 0;

  async function verstuurNaarContact(ontvanger: Ontvanger) {
    const ontvangerRef = campagneRef.collection("ontvangers").doc();
    try {
      const afmeldUrl = `https://onsstamboek.be/${groep.slug}/afmelden/${ontvanger.id}?token=${maakAfmeldToken(groepId, ontvanger.id)}`;
      const htmlMetAfmeldlink = `${html}\n<p style="font-size:12px;color:#888;margin-top:24px;">Wil je deze mails niet meer ontvangen? <a href="${afmeldUrl}">Afmelden</a>.</p>`;
      await verstuurEmail({
        to: ontvanger.email,
        subject: onderwerp,
        html: htmlMetAfmeldlink,
        replyTo,
        headers: {
          "List-Unsubscribe": `<mailto:${replyTo || "noreply@onsstamboek.be"}>, <${afmeldUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      await ontvangerRef.set({
        groepId,
        contactId: ontvanger.id,
        entryId: ontvanger.entryId,
        email: ontvanger.email,
        status: "verzonden",
        verzondenOp: FieldValue.serverTimestamp(),
      });
      aantalVerzonden++;
    } catch (err) {
      aantalMislukt++;
      await ontvangerRef.set({
        groepId,
        contactId: ontvanger.id,
        entryId: ontvanger.entryId,
        email: ontvanger.email,
        status: "mislukt",
        foutmelding: err instanceof Error ? err.message : String(err),
        verzondenOp: null,
      });
      console.error(`Ledenmail versturen mislukt voor contact ${ontvanger.id}:`, err);
    }
  }

  for (let i = 0; i < ontvangers.length; i += GECHUNKT_PER) {
    await Promise.all(ontvangers.slice(i, i + GECHUNKT_PER).map(verstuurNaarContact));
  }

  await campagneRef.set({
    groepId,
    onderwerp,
    inhoud,
    status: "verzonden",
    doelgroep: doelgroep === "selectie" ? "selectie" : "alle",
    contactIds: doelgroep === "selectie" ? ontvangers.map((o) => o.id) : [],
    verzondenDoor: auth.uid,
    aantalOntvangers: ontvangers.length,
    aantalVerzonden,
    aantalMislukt,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ aantalOntvangers: ontvangers.length, aantalVerzonden, aantalMislukt });
}
