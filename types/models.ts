import type { Timestamp } from "firebase/firestore";

/**
 * Gedeeld datamodel voor het multi-vereniging platform.
 *
 * Drie niveaus: organisatie (bv. "Scouts en Gidsen Vlaanderen") -> groep
 * (bv. Sint-Eduardusscouts) -> alle bestaande vriendenboekje-content.
 * Elk groep-specifiek document draagt een `groepId`; elk organisatie-breed
 * document draagt een `organisatieId`. Zie firestore.rules voor hoe dat
 * veld afgedwongen wordt.
 */

export type WithId<T> = T & { id: string };

// ---------------------------------------------------------------------------
// Organisatie & groep
// ---------------------------------------------------------------------------

export interface Organisatie {
  naam: string;
  logoUrl?: string | null;
  logoPath?: string | null;
  createdAt?: Timestamp;
}

export type GroepStatus = "actief" | "gepauzeerd";

export interface Groep {
  /** Padsegment, bv. "sinteduardus" -> onsstamboek.be/sinteduardus/... */
  slug: string;
  naam: string;
  gemeente?: string;
  /** Algemeen contactadres van de groep (publiek zichtbaar), niet het e-mailadres van de sitebeheerder. */
  contactEmail?: string;
  logoUrl?: string | null;
  logoPath?: string | null;
  /** Kadrering van de avatar/profielfoto (zie logoUrl): x/y focuspunt als percentages (0-100, CSS object-position) + zoom (1 = geen extra zoom). */
  logoPositie?: { x: number; y: number; zoom: number } | null;
  landingsafbeeldingUrl?: string | null;
  landingsafbeeldingPath?: string | null;
  /** Kadrering van de welkomstfoto: x/y focuspunt als percentages (0-100, CSS object-position) + zoom (1 = geen extra zoom). */
  landingsafbeeldingPositie?: { x: number; y: number; zoom: number } | null;
  oprichtingsjaar?: number | null;
  organisatieId?: string | null;
  /**
   * De das van de groep (bv. bij Scouts en Gidsen Vlaanderen: elke groep
   * heeft een das in 2 kleuren), getoond naast de groepsnaam op de publieke
   * site -- links dasKleur1/2, rechts das2Kleur1/2 (voor groepen die
   * doorheen de jaren van kleuren veranderden). Is er geen 2de das
   * ingesteld, dan verschijnt de eerste das aan beide kanten. Binnen elk
   * paar moeten beide kleuren (hex) ingevuld zijn voor die das getoond
   * wordt -- geen apart aan/uit-veld nodig.
   */
  dasKleur1?: string | null;
  dasKleur2?: string | null;
  das2Kleur1?: string | null;
  das2Kleur2?: string | null;
  /** Per contentsoort: stuurt een feedbackmail naar de indiener meteen na goed-/afkeuring, of enkel gebundeld via de nachtelijke job. Ontbrekende sleutels vallen terug op een code-default (zie lib/feedbackMail.ts). */
  feedbackTiming?: Partial<Record<FeedbackCategorie, FeedbackTiming>>;
  /** Tijdstip van de vorige "nieuwe items"-notificatiemail aan de groepsbeheerders -- enkel items die daarna zijn binnengekomen tellen mee voor de volgende run. */
  laatsteAdminNotificatieOp?: Timestamp | null;
  status: GroepStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type LidmaatschapRol = "groepsbeheerder";

export interface Lidmaatschap {
  userId: string;
  groepId: string;
  rol: LidmaatschapRol;
  createdAt?: Timestamp;
  /**
   * Welke versie van de gebruiksvoorwaarden (zie lib/voorwaarden.ts) deze
   * groepsbeheerder aanvaardde voor déze groep, en wanneer. Komt niet
   * overeen met de huidige VOORWAARDEN_VERSIE, dan blokkeert
   * RequireGroepsbeheerder de toegang tot /beheer tot opnieuw aanvaard is.
   */
  voorwaardenVersie?: string | null;
  voorwaardenGeaccepteerdOp?: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Organisatie-brede content (kentekens, scouting-mijlpalen, takken-sjabloon)
// ---------------------------------------------------------------------------

export interface OrganisatieKenteken {
  startJaar: number;
  jaarleuze: string;
  afbeeldingUrl?: string | null;
  afbeeldingPath?: string | null;
  updatedAt?: Timestamp;
}

export type MijlpaalType = "scouting" | "groep";
export type GoedkeuringStatus = "pending" | "published";

export interface OrganisatieMijlpaal {
  jaar: number;
  titel: string;
  beschrijving: string;
  afbeeldingUrl?: string | null;
  afbeeldingPath?: string | null;
  contactEmail?: string | null;
  status: GoedkeuringStatus;
  createdAt?: Timestamp;
}

export interface TakSjabloon {
  naam: string;
  volgorde: number;
}

// ---------------------------------------------------------------------------
// Groep-specifieke content (allemaal + groepId)
// ---------------------------------------------------------------------------

export type EntryStatus = "draft" | "published" | "stub";

export interface Entry {
  groepId: string;
  naam: string;
  geboortejaar?: string;
  totemnaam?: string;
  periode?: string;
  leuksteActiviteit?: string[];
  besteKampplaats?: string[];
  lekkersteEten?: string[];
  scanUrl?: string | null;
  scanPath?: string | null;
  status: EntryStatus;
  goedgekeurd?: boolean;
  koppelingBevestigd?: boolean;
  /** E-mailadres van wie de fiche indiende -- enkel zichtbaar voor de beheerder, voor feedback over goed-/afkeuring. */
  email?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LedenTag {
  naam: string;
  entryId?: string | null;
}

export type PhotoStatus = "pending" | "published";

export interface Photo {
  groepId: string;
  afbeeldingUrl: string;
  afbeeldingPath: string;
  beeldHash?: string | null;
  jaar?: number | null;
  decennium?: number | null;
  decenniumPositie?: number;
  locatie?: string;
  beschrijving?: string;
  ledenTags?: LedenTag[];
  taggedEntryIds?: string[];
  tagIds?: string[];
  contactEmail?: string | null;
  status: PhotoStatus;
  verwijderVerzoek?: boolean;
  verwijderReden?: string;
  /** E-mailadres van wie de verwijdering aanvraagt -- enkel zichtbaar voor de beheerder, zodat die feedback kan geven over de beslissing. */
  verwijderEmail?: string;
  /** Tijdstip van het verwijderverzoek zelf -- anders dan createdAt (de oorspronkelijke upload), nodig om een net binnengekomen verzoek op een oude foto als "nieuw" te herkennen voor de beheerder-notificatiemail. */
  verwijderAangevraagdOp?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface PhotoTag {
  groepId: string;
  naam: string;
  createdAt?: Timestamp;
}

export interface GroepMijlpaal {
  groepId: string;
  jaar: number;
  titel: string;
  beschrijving: string;
  type: "groep";
  afbeeldingUrl?: string | null;
  afbeeldingPath?: string | null;
  contactEmail?: string | null;
  status: GoedkeuringStatus;
  createdAt?: Timestamp;
}

export interface ScoutTak {
  groepId: string;
  naam: string;
  volgorde: number;
  createdAt?: Timestamp;
}

export interface LidLeidingsploeg {
  naam: string;
  entryId?: string | null;
}

export interface Leidingsploeg {
  groepId: string;
  takId: string;
  werkingsjaarStart: number;
  leden: LidLeidingsploeg[];
  goedgekeurd?: boolean;
  /** E-mailadres van wie de aanvulling/correctie indiende -- enkel zichtbaar voor de beheerder, voor feedback over goed-/afkeuring. */
  email?: string;
  updatedAt?: Timestamp;
}

export interface Location {
  groepId: string;
  naam: string;
  lat: number | null;
  lng: number | null;
  genegeerd?: boolean;
  updatedAt?: Timestamp;
}

export type ExtraLocationStatus = "pending" | "published";

export interface ExtraLocation {
  groepId: string;
  naam: string;
  beschrijving: string;
  lat: number | null;
  lng: number | null;
  contactEmail?: string | null;
  status: ExtraLocationStatus;
  createdAt?: Timestamp;
}

export interface Dish {
  groepId: string;
  naam: string;
  receptUrl?: string;
  receptNotitie?: string;
  updatedAt?: Timestamp;
}

export interface Link {
  groepId: string;
  naam: string;
  url: string;
  omschrijving?: string;
  createdAt?: Timestamp;
}

export interface ContactBericht {
  groepId: string;
  naam: string;
  email: string;
  groep: string;
  bericht: string;
  gelezen: boolean;
  createdAt?: Timestamp;
}

/** Platform-brede tegenhanger van ContactBericht -- gericht aan de systeembeheerder, niet aan een groep. */
export interface SysteemContactBericht {
  naam: string;
  email: string;
  bericht: string;
  gelezen: boolean;
  createdAt?: Timestamp;
}

export type ActiviteitType =
  | "foto"
  | "entry"
  | "leiding"
  | "kampplaats"
  | "mijlpaal"
  | "overig";

export interface Activiteit {
  groepId: string;
  type: ActiviteitType;
  actie: string;
  itemId?: string | null;
  omschrijving: string;
  afbeeldingUrl?: string | null;
  createdAt?: Timestamp;
}

export type WijzigingStatus = "pending";

export interface WijzigingsVoorstel {
  groepId: string;
  entryId: string;
  naam?: string;
  geboortejaar?: string;
  totemnaam?: string;
  periode?: string;
  leuksteActiviteit?: string[];
  besteKampplaats?: string[];
  lekkersteEten?: string[];
  email: string;
  status: WijzigingStatus;
  createdAt?: Timestamp;
}

export interface Statistiek {
  groepId: string;
  dag: string;
  pad: string;
  aantal: number;
}

// ---------------------------------------------------------------------------
// Feedback- en notificatiemails (zie lib/feedbackMail.ts, app/api/feedback,
// app/api/cron/dagelijkse-job)
// ---------------------------------------------------------------------------

/** Contentsoorten waarvoor een indiener feedback (goedgekeurd/afgewezen) kan krijgen. */
export type FeedbackCategorie = "fiche" | "wijziging" | "foto" | "kampplaats" | "mijlpaal" | "leidingsploeg";
export type FeedbackTiming = "onmiddellijk" | "nachtelijk";
export type FeedbackActie = "goedgekeurd" | "afgewezen";

/**
 * Eén nog te versturen feedback-item voor een "nachtelijke" categorie --
 * geschreven door app/api/feedback, gedraineerd en verwijderd door de
 * dagelijkse cron zodra de gebundelde mail voor groepId+ontvangerEmail
 * verstuurd is. Nooit rechtstreeks door een client gelezen/geschreven.
 */
export interface FeedbackWachtrijItem {
  groepId: string;
  ontvangerEmail: string;
  categorie: FeedbackCategorie;
  actie: FeedbackActie;
  referentie: string;
  itemId?: string | null;
  createdAt?: Timestamp;
}

/**
 * Mailhistoriek, zichtbaar voor de groepsbeheerder (tabblad onder Contact).
 * `soort` onderscheidt een feedbackmail (naar een indiener) van een
 * beheerder-notificatiemail (naar de groepsbeheerder(s) zelf) -- voor
 * `soort:"notificatie"` is `type` altijd `"nachtelijk"`. Enkel door de
 * Admin SDK geschreven; 3 maanden bewaard (opgeruimd door dezelfde cron).
 */
export interface VerzondenMail {
  groepId: string;
  soort: "feedback" | "notificatie";
  ontvanger: string;
  onderwerp: string;
  inhoud: string;
  type: FeedbackTiming;
  categorieën: FeedbackCategorie[];
  aantalItems: number;
  createdAt?: Timestamp;
}

/**
 * Eén ledenmailing (het "Mailing"-luik in groepsbeheer) -- 1
 * onderwerp/inhoud naar mogelijk veel leden tegelijk, dus een aparte
 * vorm dan `VerzondenMail` (dat is 1 document per ontvanger). Kan een
 * niet-verstuurd concept zijn (rechtstreeks door de beheerder
 * aangemaakt/bewerkt) of een effectief verstuurde mailing (`status`
 * wordt dan, samen met de tellers, enkel nog door de Admin SDK gezet --
 * zie app/api/mail/campagne). Ontvangers zelf staan in de subcollectie
 * `mailCampagnes/{id}/ontvangers`.
 */
export interface MailCampagne {
  groepId: string;
  onderwerp: string;
  inhoud: string;
  verzondenDoor: string;
  status: "concept" | "verzonden";
  doelgroep: "alle" | "selectie";
  /** Enkel gevuld/relevant bij doelgroep:"selectie" -- ids van mailContacten. */
  contactIds?: string[];
  aantalOntvangers: number;
  aantalVerzonden: number;
  aantalMislukt: number;
  createdAt?: Timestamp;
}

/** Eén ontvanger van een `MailCampagne` -- audit-trail per contact, en de basis om later (indien nodig) zonder migratie een bounce-status toe te voegen. */
export interface MailOntvanger {
  groepId: string;
  contactId: string;
  /** Fiche waaraan het contact op het moment van verzenden gekoppeld was, indien van toepassing. */
  entryId?: string | null;
  email: string;
  status: "verzonden" | "mislukt";
  foutmelding?: string | null;
  verzondenOp?: Timestamp | null;
}

/**
 * Eén mailbaar contact van een groep -- losstaand van een
 * vriendenboekje-fiche (`Entry`): een groepsbeheerder kan iemand
 * toevoegen die geen fiche heeft, en een fiche kan achteraf aan een
 * bestaand contact gekoppeld worden via hetzelfde e-mailadres (zie
 * app/api/mail/contact-koppelen). Het document-ID is deterministisch
 * (`${groepId}_${genormaliseerdEmail}`, zie lib/mailContact.ts) --
 * zowel om duplicaten te voorkomen als om die koppeling zonder query
 * te kunnen doen. `email` is daardoor na aanmaak niet meer wijzigbaar
 * (dat zou een nieuw document vergen); enkel `naam`/`magMailen` zijn
 * dat wel.
 */
export interface MailContact {
  groepId: string;
  naam: string;
  email: string;
  magMailen: boolean;
  afgemeldOp?: Timestamp | null;
  /** Eén contact <-> maximaal 1 fiche; twee fiches met hetzelfde adres (bv. broers/zussen via 1 ouderadres) delen dus 1 contact-record. Bewuste vereenvoudiging. */
  entryId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
