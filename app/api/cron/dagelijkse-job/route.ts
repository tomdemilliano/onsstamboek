import { NextRequest } from "next/server";
import { FieldValue, Timestamp, type Query } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verstuurEmail } from "@/lib/resend";
import { renderFeedbackTekst, naarHtml, type FeedbackItem } from "@/lib/feedbackMail";
import type { FeedbackCategorie } from "@/types/models";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NEGENTIG_DAGEN_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Dagelijkse Vercel Cron-job (zie vercel.json) met 2 onafhankelijke taken:
 * 1. de "nachtelijke" feedback-wachtrij draineren (zie app/api/feedback) --
 *    één gebundelde mail per groep+ontvanger, over alle klaarstaande
 *    categorieën heen;
 * 2. elke groep controleren op nieuwe, nog onbehandelde items sinds de
 *    vorige run, en zo ja elke groepsbeheerder daarover één samenvattende
 *    mail sturen.
 * Nadien wordt de mailhistoriek ouder dan 3 maanden opgeruimd. Enkel Vercel
 * zelf (via de CRON_SECRET-header) mag dit aanroepen.
 */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || header !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feedback = await verwerkFeedbackWachtrij();
  const notificaties = await notificeerBeheerders();
  const opgeruimd = await ruimMailhistoriekOp();

  return Response.json({ feedback, notificaties, opgeruimd });
}

async function groepNaamOphalen(groepId: string, cache: Map<string, string>): Promise<string> {
  const bestaand = cache.get(groepId);
  if (bestaand) return bestaand;
  const snap = await adminDb.collection("groepen").doc(groepId).get();
  const naam = (snap.data()?.naam as string) || "je scoutsgroep";
  cache.set(groepId, naam);
  return naam;
}

/** Groepeert alle klaarstaande "nachtelijke" feedback-items per groep+ontvanger, verstuurt 1 mail per combinatie, en verwijdert enkel de succesvol verstuurde items. */
async function verwerkFeedbackWachtrij(): Promise<{ mailsVerstuurd: number; mislukt: number }> {
  const snap = await adminDb.collection("feedbackWachtrij").get();
  const perOntvanger = new Map<
    string,
    { groepId: string; ontvangerEmail: string; refs: FirebaseFirestore.DocumentReference[]; items: FeedbackItem[] }
  >();

  for (const d of snap.docs) {
    const data = d.data();
    const sleutel = `${data.groepId}::${data.ontvangerEmail}`;
    if (!perOntvanger.has(sleutel)) {
      perOntvanger.set(sleutel, { groepId: data.groepId, ontvangerEmail: data.ontvangerEmail, refs: [], items: [] });
    }
    const item = perOntvanger.get(sleutel)!;
    item.refs.push(d.ref);
    item.items.push({ categorie: data.categorie, actie: data.actie, referentie: data.referentie });
  }

  const groepNamenCache = new Map<string, string>();
  let mailsVerstuurd = 0;
  let mislukt = 0;

  for (const { groepId, ontvangerEmail, refs, items } of perOntvanger.values()) {
    try {
      const groepNaam = await groepNaamOphalen(groepId, groepNamenCache);
      const { onderwerp, inhoud } = renderFeedbackTekst(groepNaam, items);
      await verstuurEmail({ to: ontvangerEmail, subject: onderwerp, html: naarHtml(inhoud) });

      await adminDb.collection("verzondenMails").add({
        groepId,
        soort: "feedback",
        ontvanger: ontvangerEmail,
        onderwerp,
        inhoud,
        type: "nachtelijk",
        categorieën: [...new Set(items.map((i) => i.categorie))],
        aantalItems: items.length,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Pas nu verwijderen -- bij een crash vóór dit punt wordt dezelfde
      // batch morgen opnieuw verwerkt (aanvaard, zeldzaam risico op een
      // dubbele mail; zie het feature-plan).
      const batch = adminDb.batch();
      refs.forEach((ref) => batch.delete(ref));
      await batch.commit();
      mailsVerstuurd++;
    } catch (err) {
      mislukt++;
      console.error(`Feedbackmail versturen mislukt voor groep ${groepId}, ontvanger ${ontvangerEmail}:`, err);
    }
  }

  return { mailsVerstuurd, mislukt };
}

interface NotificatieItem {
  label: string;
  aantal: number;
  link: string;
}

/** Telt, voor één groep, hoeveel nog onbehandelde items van elke soort er sinds `sinds` bijgekomen zijn. */
async function telNieuweItems(groepId: string, slug: string, sinds: Timestamp | null): Promise<NotificatieItem[]> {
  async function tel(collectie: string, tijdveld: string, opbouw: (q: Query) => Query, label: string, link: string): Promise<NotificatieItem | null> {
    let q: Query = adminDb.collection(collectie).where("groepId", "==", groepId);
    q = opbouw(q);
    if (sinds) q = q.where(tijdveld, ">", sinds);
    const snap = await q.get();
    return snap.size > 0 ? { label, aantal: snap.size, link } : null;
  }

  const resultaten = await Promise.all([
    tel("wijzigingsVoorstellen", "createdAt", (q) => q, "nieuw wijzigingsvoorstel", `/${slug}/beheer/vriendenboek/wijzigingen`),
    tel("entries", "createdAt", (q) => q.where("status", "==", "published").where("goedgekeurd", "==", false), "nieuwe fiche", `/${slug}/beheer/vriendenboek`),
    tel("photos", "createdAt", (q) => q.where("status", "==", "pending"), "nieuwe foto", `/${slug}/beheer/fotos`),
    tel("photos", "verwijderAangevraagdOp", (q) => q.where("verwijderVerzoek", "==", true), "foto-verwijderverzoek", `/${slug}/beheer/fotos`),
    tel("extraLocations", "createdAt", (q) => q.where("status", "==", "pending"), "nieuwe kampplaats", `/${slug}/beheer/kampplaatsen/extra`),
    tel("milestones", "createdAt", (q) => q.where("status", "==", "pending"), "nieuwe mijlpaal", `/${slug}/beheer/tijdlijn`),
    // Leidingsploegen hebben geen createdAt (enkel updatedAt, ook gezet bij een gewone admin-bewerking) --
    // `goedgekeurd == false` samen met updatedAt > sinds is de dichtste benadering van "nieuw en onbehandeld".
    tel("leidingsploegen", "updatedAt", (q) => q.where("goedgekeurd", "==", false), "leidingsploeg-wijziging", `/${slug}/beheer/tijdlijn/leiding`),
    tel("contactBerichten", "createdAt", (q) => q.where("gelezen", "==", false), "nieuw contactbericht", `/${slug}/beheer/contact`),
  ]);

  return resultaten.filter((r): r is NotificatieItem => r !== null);
}

/** E-mailadressen van alle groepsbeheerders van een groep (systeembeheerders krijgen deze notificatie bewust niet -- die volgen geen enkele groep specifiek op). */
async function beheerderEmailsVoorGroep(groepId: string): Promise<string[]> {
  const snap = await adminDb.collection("lidmaatschappen").where("groepId", "==", groepId).get();
  const emails: string[] = [];
  for (const d of snap.docs) {
    const userId = d.data().userId as string;
    try {
      const gebruiker = await adminAuth.getUser(userId);
      if (gebruiker.email) emails.push(gebruiker.email);
    } catch (err) {
      console.error(`Kon e-mailadres van beheerder ${userId} niet ophalen:`, err);
    }
  }
  return emails;
}

/**
 * Voor elke actieve groep: nieuwe onbehandelde items sinds de vorige run
 * opzoeken, en zo ja elke groepsbeheerder daarover 1 mail sturen. Een groep
 * die nog nooit eerder gecontroleerd werd (nieuw voor deze feature) krijgt
 * bij de allereerste run geen mail over haar volledige bestaande
 * achterstand -- enkel het tijdstip wordt vastgelegd, zodat morgen enkel
 * écht nieuwe items meetellen.
 */
async function notificeerBeheerders(): Promise<{ groepenGecontroleerd: number; mailsVerstuurd: number }> {
  const groepenSnap = await adminDb.collection("groepen").where("status", "==", "actief").get();
  let mailsVerstuurd = 0;

  for (const groepDoc of groepenSnap.docs) {
    const groep = groepDoc.data();
    const sinds = (groep.laatsteAdminNotificatieOp as Timestamp | undefined) || null;

    try {
      const items = await telNieuweItems(groepDoc.id, groep.slug, sinds);

      if (sinds && items.length > 0) {
        const emails = await beheerderEmailsVoorGroep(groepDoc.id);
        if (emails.length > 0) {
          const onderwerp = `Nieuwe items te behandelen bij ${groep.naam}`;
          const regels = items.map((i) => `- ${i.aantal} ${i.label}${i.aantal === 1 ? "" : "s"}: onsstamboek.be${i.link}`);
          const inhoud = [`Er staan nieuwe items klaar voor nazicht bij ${groep.naam}:`, "", ...regels].join("\n");

          await Promise.all(emails.map((to) => verstuurEmail({ to, subject: onderwerp, html: naarHtml(inhoud) })));

          await adminDb.collection("verzondenMails").add({
            groepId: groepDoc.id,
            soort: "notificatie",
            ontvanger: emails.join(", "),
            onderwerp,
            inhoud,
            type: "nachtelijk",
            categorieën: [] as FeedbackCategorie[],
            aantalItems: items.reduce((som, i) => som + i.aantal, 0),
            createdAt: FieldValue.serverTimestamp(),
          });
          mailsVerstuurd++;
        }
      }

      await groepDoc.ref.update({ laatsteAdminNotificatieOp: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error(`Beheerder-notificatie mislukt voor groep ${groepDoc.id}:`, err);
    }
  }

  return { groepenGecontroleerd: groepenSnap.size, mailsVerstuurd };
}

/** Verwijdert mailhistoriek ouder dan 3 maanden (geldt voor zowel feedback- als notificatiemails). */
async function ruimMailhistoriekOp(): Promise<number> {
  const grens = Timestamp.fromMillis(Date.now() - NEGENTIG_DAGEN_MS);
  const snap = await adminDb.collection("verzondenMails").where("createdAt", "<", grens).get();
  if (snap.empty) return 0;

  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}
