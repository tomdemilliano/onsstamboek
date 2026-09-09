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
  landingsafbeeldingUrl?: string | null;
  landingsafbeeldingPath?: string | null;
  /** Focuspunt van de welkomstfoto als percentages (0-100), voor CSS object-position -- laat de beheerder kadreren welk deel zichtbaar blijft bij het bijsnijden. */
  landingsafbeeldingPositie?: { x: number; y: number } | null;
  oprichtingsjaar?: number | null;
  organisatieId?: string | null;
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
