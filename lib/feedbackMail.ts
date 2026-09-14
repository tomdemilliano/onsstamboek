import type { FeedbackActie, FeedbackCategorie, FeedbackTiming } from "@/types/models";

/**
 * Bewust GEEN `import "server-only"` hier: dit bestand bevat enkel pure
 * tekst-/data-functies (geen geheimen, geen Admin SDK), en de instellingen-
 * pagina (Client Component) heeft `STANDAARD_FEEDBACK_TIMING`/
 * `bepaalFeedbackTiming` ook nodig om de effectieve waarde per categorie te
 * tonen. Het versturen zelf gebeurt uitsluitend server-side via
 * lib/resend.ts (dat wél `server-only` is).
 */

/** Code-default per categorie wanneer de groep zelf niets instelde -- foto's staan standaard op "nachtelijk" omdat die in bulk opgeladen worden, de rest is standaard "onmiddellijk" (laag volume). */
export const STANDAARD_FEEDBACK_TIMING: Record<FeedbackCategorie, FeedbackTiming> = {
  fiche: "onmiddellijk",
  wijziging: "onmiddellijk",
  foto: "nachtelijk",
  kampplaats: "onmiddellijk",
  mijlpaal: "onmiddellijk",
  leidingsploeg: "onmiddellijk",
};

export function bepaalFeedbackTiming(
  feedbackTiming: Partial<Record<FeedbackCategorie, FeedbackTiming>> | undefined,
  categorie: FeedbackCategorie
): FeedbackTiming {
  return feedbackTiming?.[categorie] ?? STANDAARD_FEEDBACK_TIMING[categorie];
}

/** Nederlandse omschrijving per contentsoort, gebruikt in de feedbackzin naar de indiener. */
export const FEEDBACK_LABELS: Record<FeedbackCategorie, string> = {
  fiche: "fiche",
  wijziging: "wijzigingsvoorstel",
  foto: "foto",
  kampplaats: "kampplaats",
  mijlpaal: "mijlpaal",
  leidingsploeg: "leidingsploeg-wijziging",
};

export interface FeedbackItem {
  categorie: FeedbackCategorie;
  actie: FeedbackActie;
  referentie: string;
}

/**
 * Bouwt de onderwerp + platte-tekst-inhoud van een feedbackmail naar een
 * indiener. Bij één item de letterlijke standaardzin die de beheerder
 * vroeg ("De beheerder van [groep] heeft uw [type] van [verwijzing]
 * [goedgekeurd/afgewezen]."); bij meerdere items (de nachtelijke, gebundelde
 * mail) een korte intro gevolgd van één regel per item.
 *
 * De inhoud blijft platte tekst -- dat is wat er in de mailhistoriek getoond
 * wordt (zie VerzondenMail.inhoud); `naarHtml` zet het pas bij het
 * daadwerkelijk versturen om in eenvoudige HTML.
 */
export function renderFeedbackTekst(groepNaam: string, items: FeedbackItem[]): { onderwerp: string; inhoud: string } {
  if (items.length === 1) {
    const item = items[0];
    const label = FEEDBACK_LABELS[item.categorie];
    return {
      onderwerp: `Uw ${label} bij ${groepNaam}: ${item.actie}`,
      inhoud: `De beheerder van ${groepNaam} heeft uw ${label} van "${item.referentie}" ${item.actie}.`,
    };
  }

  const regels = items.map((item) => `- ${FEEDBACK_LABELS[item.categorie]} van "${item.referentie}": ${item.actie}.`);
  return {
    onderwerp: `Nieuws over uw inzendingen bij ${groepNaam}`,
    inhoud: [`De beheerder van ${groepNaam} nam de volgende inzendingen van u door:`, "", ...regels].join("\n"),
  };
}

/** Zet platte tekst (met "- "-regels als lijstitems) om in eenvoudige HTML voor het versturen via Resend. */
export function naarHtml(inhoud: string): string {
  const alinea: string[] = [];
  let lijstItems: string[] = [];

  function sluitLijstAf() {
    if (lijstItems.length > 0) {
      alinea.push(`<ul>${lijstItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      lijstItems = [];
    }
  }

  for (const regel of inhoud.split("\n")) {
    if (regel.startsWith("- ")) {
      lijstItems.push(regel.slice(2));
    } else if (regel.trim() === "") {
      sluitLijstAf();
    } else {
      sluitLijstAf();
      alinea.push(`<p>${regel}</p>`);
    }
  }
  sluitLijstAf();

  return alinea.join("\n");
}
