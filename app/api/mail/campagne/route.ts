import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifieerGroepsbeheerder } from "@/lib/groepsbeheerderAuth";
import { verstuurEmail } from "@/lib/resend";
import { naarRijkeHtml } from "@/lib/mailOpmaak";
import { maakAfmeldToken } from "@/lib/afmeldToken";
import type { Entry, Groep } from "@/types/models";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GECHUNKT_PER = 10;

/**
 * Verstuurt een door de beheerder opgestelde ledenmailing. Herbevraagt de
 * mailbare leden (magMailen==true, ingevuld e-mailadres) altijd zelf
 * server-side -- vertrouwt nooit een door de client meegegeven
 * ontvangerslijst. Verzending gebeurt in beperkt-parallelle groepjes van
 * ${GECHUNKT_PER} (i.p.v. Resend's batch-endpoint, dat geen per-bericht
 * custom headers ondersteunt -- nodig voor de List-Unsubscribe-header),
 * met per-ontvanger foutisolatie zoals de bestaande dagelijkse cron
 * (verwerkFeedbackWachtrij): 1 mislukte verzending blokkeert de rest niet.
 *
 * Foutafhandeling blijft bewust licht (v1): elke mail krijgt `replyTo` op
 * het groepscontact, dus antwoorden/bounces van de ontvangende mailserver
 * komen daar terecht -- geen eigen bounce-webhook/dashboard.
 */
export async function POST(request: NextRequest) {
  let body: { groepId?: string; onderwerp?: string; inhoud?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { groepId: groepIdRuw, onderwerp: onderwerpRuw, inhoud: inhoudRuw, test } = body;
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

  const ledenSnap = await adminDb.collection("entries").where("groepId", "==", groepId).where("magMailen", "==", true).get();
  const ontvangers = ledenSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Entry) }))
    .filter((entry): entry is typeof entry & { email: string } => Boolean(entry.email?.trim()));

  const campagneRef = adminDb.collection("mailCampagnes").doc();
  let aantalVerzonden = 0;
  let aantalMislukt = 0;

  async function verstuurNaarLid(lid: (typeof ontvangers)[number]) {
    const ontvangerRef = campagneRef.collection("ontvangers").doc();
    try {
      const afmeldUrl = `https://onsstamboek.be/${groep.slug}/afmelden/${lid.id}?token=${maakAfmeldToken(groepId, lid.id)}`;
      const htmlMetAfmeldlink = `${html}\n<p style="font-size:12px;color:#888;margin-top:24px;">Wil je deze mails niet meer ontvangen? <a href="${afmeldUrl}">Afmelden</a>.</p>`;
      await verstuurEmail({
        to: lid.email,
        subject: onderwerp,
        html: htmlMetAfmeldlink,
        replyTo,
        headers: {
          "List-Unsubscribe": `<mailto:${replyTo || "noreply@onsstamboek.be"}>, <${afmeldUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      await ontvangerRef.set({ groepId, entryId: lid.id, email: lid.email, status: "verzonden", verzondenOp: FieldValue.serverTimestamp() });
      aantalVerzonden++;
    } catch (err) {
      aantalMislukt++;
      await ontvangerRef.set({
        groepId,
        entryId: lid.id,
        email: lid.email,
        status: "mislukt",
        foutmelding: err instanceof Error ? err.message : String(err),
        verzondenOp: null,
      });
      console.error(`Ledenmail versturen mislukt voor entry ${lid.id}:`, err);
    }
  }

  for (let i = 0; i < ontvangers.length; i += GECHUNKT_PER) {
    await Promise.all(ontvangers.slice(i, i + GECHUNKT_PER).map(verstuurNaarLid));
  }

  await campagneRef.set({
    groepId,
    onderwerp,
    inhoud,
    verzondenDoor: auth.uid,
    aantalOntvangers: ontvangers.length,
    aantalVerzonden,
    aantalMislukt,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ aantalOntvangers: ontvangers.length, aantalVerzonden, aantalMislukt });
}
