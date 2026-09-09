import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  Groep,
  Organisatie,
  Lidmaatschap,
  OrganisatieKenteken,
  OrganisatieMijlpaal,
  TakSjabloon,
  Entry,
  Photo,
  PhotoTag,
  GroepMijlpaal,
  ScoutTak,
  Leidingsploeg,
  Location,
  ExtraLocation,
  Dish,
  Link as GroepLink,
  ContactBericht,
  SysteemContactBericht,
  Activiteit,
  WijzigingsVoorstel,
  Statistiek,
  WithId,
} from "@/types/models";

/**
 * Alle Firestore/Storage-toegang, per collectie gebundeld in een
 * "Factory"-object -- zelfde patroon als het bestaande `lib/dbSchema.js`
 * in de single-tenant app. Het verschil hier: elke groep-specifieke
 * Factory-functie neemt een `groepId` en filtert/stempelt daarmee, en elke
 * organisatie-brede Factory-functie doet hetzelfde met `organisatieId`.
 */

function docsToArray<T>(
  docs: QueryDocumentSnapshot<DocumentData>[]
): WithId<T>[] {
  return docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

// ---------------------------------------------------------------------------
// GroepFactory & OrganisatieFactory & LidmaatschapFactory
// ---------------------------------------------------------------------------

const GROEPEN = "groepen";

export const GroepFactory = {
  async getBySlug(slug: string): Promise<WithId<Groep> | null> {
    const q = query(collection(db, GROEPEN), where("slug", "==", slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Groep) };
  },

  async getById(id: string): Promise<WithId<Groep> | null> {
    const snap = await getDoc(doc(db, GROEPEN, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Groep) };
  },

  async getAll(): Promise<WithId<Groep>[]> {
    const q = query(collection(db, GROEPEN), orderBy("naam", "asc"));
    const snap = await getDocs(q);
    return docsToArray<Groep>(snap.docs);
  },

  async getActief(): Promise<WithId<Groep>[]> {
    const q = query(
      collection(db, GROEPEN),
      where("status", "==", "actief"),
      orderBy("naam", "asc")
    );
    const snap = await getDocs(q);
    return docsToArray<Groep>(snap.docs);
  },

  async create(data: Omit<Groep, "status" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, GROEPEN), {
      ...data,
      status: "actief",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Groep>): Promise<void> {
    await updateDoc(doc(db, GROEPEN, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Welkomstfoto op de publieke groep-landingspagina -- apart van update()
   * omdat dit een Storage-upload + oud-bestand-opkuis vergt. Verwijdert het
   * vorige bestand enkel als dat een eigen, dedicated upload was (pad onder
   * .../landing/): als de vorige welkomstfoto met setLandingsafbeeldingVanFoto
   * gekozen was, wijst bestaandePath naar een echte foto uit de galerij --
   * die mag hier nooit mee verwijderd worden.
   */
  async updateLandingsafbeelding(id: string, file: File, bestaandePath?: string | null): Promise<void> {
    if (bestaandePath?.includes("/landing/")) await verwijderAfbeelding(bestaandePath);
    const upload = await uploadGroepAfbeelding(id, file, "landing", "landing");
    await updateDoc(doc(db, GROEPEN, id), {
      landingsafbeeldingUrl: upload.url,
      landingsafbeeldingPath: upload.path,
      updatedAt: serverTimestamp(),
    });
  },

  /** Kiest een reeds opgeladen foto uit de galerij als welkomstfoto -- kopieert niets, verwijst gewoon naar hetzelfde Storage-bestand. */
  async setLandingsafbeeldingVanFoto(
    id: string,
    foto: { afbeeldingUrl: string; afbeeldingPath: string },
    bestaandePath?: string | null
  ): Promise<void> {
    if (bestaandePath?.includes("/landing/")) await verwijderAfbeelding(bestaandePath);
    await updateDoc(doc(db, GROEPEN, id), {
      landingsafbeeldingUrl: foto.afbeeldingUrl,
      landingsafbeeldingPath: foto.afbeeldingPath,
      updatedAt: serverTimestamp(),
    });
  },
};

const ORGANISATIES = "organisaties";

export const OrganisatieFactory = {
  async getAll(): Promise<WithId<Organisatie>[]> {
    const snap = await getDocs(collection(db, ORGANISATIES));
    return docsToArray<Organisatie>(snap.docs);
  },

  async getById(id: string): Promise<WithId<Organisatie> | null> {
    const snap = await getDoc(doc(db, ORGANISATIES, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Organisatie) };
  },

  async create(naam: string): Promise<string> {
    const docRef = await addDoc(collection(db, ORGANISATIES), {
      naam,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(
    id: string,
    { naam, file, bestaandePath }: { naam: string; file?: File | null; bestaandePath?: string | null }
  ): Promise<void> {
    const data: Record<string, unknown> = { naam };
    if (file) {
      if (bestaandePath) await verwijderAfbeelding(bestaandePath);
      const upload = await uploadOrganisatieAfbeelding(id, file, "logo", "logo");
      data.logoUrl = upload.url;
      data.logoPath = upload.path;
    }
    await updateDoc(doc(db, ORGANISATIES, id), data);
  },
};

const LIDMAATSCHAPPEN = "lidmaatschappen";

function lidmaatschapDocId(userId: string, groepId: string) {
  return `${userId}_${groepId}`;
}

export const LidmaatschapFactory = {
  /** Alle groepen waarvoor deze gebruiker groepsbeheerder is (voor de groepswisselaar). */
  async getByUserId(userId: string): Promise<WithId<Lidmaatschap>[]> {
    const q = query(collection(db, LIDMAATSCHAPPEN), where("userId", "==", userId));
    const snap = await getDocs(q);
    return docsToArray<Lidmaatschap>(snap.docs);
  },

  async isGroepsbeheerder(userId: string, groepId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, LIDMAATSCHAPPEN, lidmaatschapDocId(userId, groepId)));
    return snap.exists();
  },

  async voegToe(userId: string, groepId: string): Promise<void> {
    await setDoc(doc(db, LIDMAATSCHAPPEN, lidmaatschapDocId(userId, groepId)), {
      userId,
      groepId,
      rol: "groepsbeheerder",
      createdAt: serverTimestamp(),
    });
  },

  async verwijder(userId: string, groepId: string): Promise<void> {
    await deleteDoc(doc(db, LIDMAATSCHAPPEN, lidmaatschapDocId(userId, groepId)));
  },
};

// ---------------------------------------------------------------------------
// Storage-helpers -- pad per groep resp. per organisatie
// ---------------------------------------------------------------------------

async function uploadGroepAfbeelding(groepId: string, file: File, submap: string, naam: string) {
  const path = `groepen/${groepId}/${submap}/${naam}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

async function uploadOrganisatieAfbeelding(organisatieId: string, file: File, submap: string, naam: string) {
  const path = `organisaties/${organisatieId}/${submap}/${naam}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

async function verwijderAfbeelding(path?: string | null) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // al weg of nooit bestaan, geen probleem
  }
}

// ---------------------------------------------------------------------------
// Organisatie-brede content: kentekens, scouting-mijlpalen, takken-sjabloon
// ---------------------------------------------------------------------------

function organisatieSubcollectie(organisatieId: string, naam: string) {
  return collection(db, ORGANISATIES, organisatieId, naam);
}

export const OrganisatieKentekenFactory = {
  async getAll(organisatieId: string): Promise<WithId<OrganisatieKenteken>[]> {
    const snap = await getDocs(organisatieSubcollectie(organisatieId, "kentekens"));
    return docsToArray<OrganisatieKenteken>(snap.docs).sort((a, b) => a.startJaar - b.startJaar);
  },

  async set(
    organisatieId: string,
    startJaar: number,
    { jaarleuze, file, bestaandePath }: { jaarleuze: string; file?: File | null; bestaandePath?: string | null }
  ): Promise<void> {
    const data: Record<string, unknown> = {
      startJaar,
      jaarleuze: jaarleuze || "",
      updatedAt: serverTimestamp(),
    };
    if (file) {
      if (bestaandePath) await verwijderAfbeelding(bestaandePath);
      const upload = await uploadOrganisatieAfbeelding(organisatieId, file, "kentekens", String(startJaar));
      data.afbeeldingUrl = upload.url;
      data.afbeeldingPath = upload.path;
    }
    await setDoc(doc(organisatieSubcollectie(organisatieId, "kentekens"), String(startJaar)), data, { merge: true });
  },

  async remove(organisatieId: string, startJaar: number, afbeeldingPath?: string | null): Promise<void> {
    await verwijderAfbeelding(afbeeldingPath);
    await deleteDoc(doc(organisatieSubcollectie(organisatieId, "kentekens"), String(startJaar)));
  },
};

export const OrganisatieMijlpaalFactory = {
  async getAllAdmin(organisatieId: string): Promise<WithId<OrganisatieMijlpaal>[]> {
    const snap = await getDocs(organisatieSubcollectie(organisatieId, "mijlpalen"));
    return docsToArray<OrganisatieMijlpaal>(snap.docs).sort((a, b) => a.jaar - b.jaar);
  },

  async getPublished(organisatieId: string): Promise<WithId<OrganisatieMijlpaal>[]> {
    const q = query(organisatieSubcollectie(organisatieId, "mijlpalen"), where("status", "==", "published"));
    const snap = await getDocs(q);
    return docsToArray<OrganisatieMijlpaal>(snap.docs).sort((a, b) => a.jaar - b.jaar);
  },

  async createByAdmin(
    organisatieId: string,
    { jaar, titel, beschrijving, file }: { jaar: number; titel: string; beschrijving: string; file?: File | null }
  ): Promise<string> {
    const docRef = await addDoc(organisatieSubcollectie(organisatieId, "mijlpalen"), {
      jaar,
      titel: titel || "",
      beschrijving: beschrijving || "",
      afbeeldingUrl: null,
      afbeeldingPath: null,
      contactEmail: null,
      status: "published",
      createdAt: serverTimestamp(),
    });
    if (file) {
      const upload = await uploadOrganisatieAfbeelding(organisatieId, file, "mijlpalen", docRef.id);
      await updateDoc(doc(organisatieSubcollectie(organisatieId, "mijlpalen"), docRef.id), {
        afbeeldingUrl: upload.url,
        afbeeldingPath: upload.path,
      });
    }
    return docRef.id;
  },

  async update(
    organisatieId: string,
    id: string,
    { jaar, titel, beschrijving, file, bestaandePath }: { jaar: number; titel: string; beschrijving: string; file?: File | null; bestaandePath?: string | null }
  ): Promise<void> {
    const data: Record<string, unknown> = { jaar, titel, beschrijving };
    if (file) {
      if (bestaandePath) await verwijderAfbeelding(bestaandePath);
      const upload = await uploadOrganisatieAfbeelding(organisatieId, file, "mijlpalen", id);
      data.afbeeldingUrl = upload.url;
      data.afbeeldingPath = upload.path;
    }
    await updateDoc(doc(organisatieSubcollectie(organisatieId, "mijlpalen"), id), data);
  },

  async remove(organisatieId: string, id: string, afbeeldingPath?: string | null): Promise<void> {
    await verwijderAfbeelding(afbeeldingPath);
    await deleteDoc(doc(organisatieSubcollectie(organisatieId, "mijlpalen"), id));
  },
};

export const TakSjabloonFactory = {
  async getAll(organisatieId: string): Promise<WithId<TakSjabloon>[]> {
    const snap = await getDocs(organisatieSubcollectie(organisatieId, "takkenSjabloon"));
    return docsToArray<TakSjabloon>(snap.docs).sort((a, b) => a.volgorde - b.volgorde);
  },

  /** Kopieert de sjabloonlijst naar een nieuwe groep zijn eigen `scoutTakken` (zie onboarding, later). */
  async kopieerNaarGroep(organisatieId: string, groepId: string): Promise<void> {
    const sjablonen = await this.getAll(organisatieId);
    await Promise.all(
      sjablonen.map((tak) =>
        addDoc(collection(db, "scoutTakken"), {
          groepId,
          naam: tak.naam,
          volgorde: tak.volgorde,
          createdAt: serverTimestamp(),
        })
      )
    );
  },
};

// ---------------------------------------------------------------------------
// EntryFactory: vriendenboekje-fiches (groep-specifiek)
// ---------------------------------------------------------------------------

const ENTRIES = "entries";

export const EntryFactory = {
  async create(groepId: string, data: Partial<Entry>): Promise<string> {
    const docRef = await addDoc(collection(db, ENTRIES), {
      groepId,
      naam: data.naam || "",
      geboortejaar: data.geboortejaar || "",
      totemnaam: data.totemnaam || "",
      periode: data.periode || "",
      leuksteActiviteit: data.leuksteActiviteit || [],
      besteKampplaats: data.besteKampplaats || [],
      lekkersteEten: data.lekkersteEten || [],
      scanUrl: data.scanUrl || null,
      scanPath: data.scanPath || null,
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async createPublicSubmission(groepId: string, data: Partial<Entry>): Promise<string> {
    const docRef = await addDoc(collection(db, ENTRIES), {
      groepId,
      naam: data.naam || "",
      geboortejaar: data.geboortejaar || "",
      totemnaam: data.totemnaam || "",
      periode: data.periode || "",
      leuksteActiviteit: data.leuksteActiviteit || [],
      besteKampplaats: data.besteKampplaats || [],
      lekkersteEten: data.lekkersteEten || [],
      scanUrl: null,
      scanPath: null,
      status: "published",
      goedgekeurd: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async keurGoed(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { goedgekeurd: true, updatedAt: serverTimestamp() });
  },

  async update(id: string, data: Partial<Entry>): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { ...data, updatedAt: serverTimestamp() });
  },

  async publish(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { status: "published", goedgekeurd: true, updatedAt: serverTimestamp() });
  },

  async unpublish(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { status: "draft", updatedAt: serverTimestamp() });
  },

  async remove(id: string, scanPath?: string | null): Promise<void> {
    if (scanPath) await verwijderAfbeelding(scanPath);
    await deleteDoc(doc(db, ENTRIES, id));
  },

  async getById(id: string): Promise<WithId<Entry> | null> {
    const snap = await getDoc(doc(db, ENTRIES, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Entry) };
  },

  async getAll(groepId: string): Promise<WithId<Entry>[]> {
    const q = query(collection(db, ENTRIES), where("groepId", "==", groepId), orderBy("naam", "asc"));
    const snap = await getDocs(q);
    return docsToArray<Entry>(snap.docs);
  },

  async getPublished(groepId: string): Promise<WithId<Entry>[]> {
    const q = query(
      collection(db, ENTRIES),
      where("groepId", "==", groepId),
      where("status", "==", "published"),
      orderBy("naam", "asc")
    );
    const snap = await getDocs(q);
    return docsToArray<Entry>(snap.docs);
  },

  async getSearchable(groepId: string): Promise<WithId<Entry>[]> {
    const q = query(
      collection(db, ENTRIES),
      where("groepId", "==", groepId),
      where("status", "in", ["published", "stub"])
    );
    const snap = await getDocs(q);
    return docsToArray<Entry>(snap.docs);
  },

  async getStubs(groepId: string): Promise<WithId<Entry>[]> {
    const q = query(collection(db, ENTRIES), where("groepId", "==", groepId), where("status", "==", "stub"));
    const snap = await getDocs(q);
    return docsToArray<Entry>(snap.docs);
  },

  async findOrCreateStub(groepId: string, naam: string): Promise<string | null> {
    const genormaliseerd = (naam || "").trim();
    if (!genormaliseerd) return null;

    const alle = await this.getSearchable(groepId);
    const bestaand = alle.find((e) => e.naam.trim().toLowerCase() === genormaliseerd.toLowerCase());
    if (bestaand) return bestaand.id;

    const docRef = await addDoc(collection(db, ENTRIES), {
      groepId,
      naam: genormaliseerd,
      geboortejaar: "",
      totemnaam: "",
      periode: "",
      leuksteActiviteit: [],
      besteKampplaats: [],
      lekkersteEten: [],
      scanUrl: null,
      scanPath: null,
      status: "stub",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async zoekMogelijkeStub(groepId: string, naam: string): Promise<WithId<Entry>[]> {
    const genormaliseerd = (naam || "").trim().toLowerCase();
    if (genormaliseerd.length < 2) return [];
    const stubs = await this.getStubs(groepId);
    return stubs.filter(
      (e) =>
        e.naam.trim().toLowerCase() === genormaliseerd ||
        e.naam.trim().toLowerCase().includes(genormaliseerd) ||
        genormaliseerd.includes(e.naam.trim().toLowerCase())
    );
  },

  async upgradeStubMetFormulier(id: string, formData: Partial<Entry>): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), {
      naam: formData.naam || "",
      geboortejaar: formData.geboortejaar || "",
      totemnaam: formData.totemnaam || "",
      periode: formData.periode || "",
      leuksteActiviteit: formData.leuksteActiviteit || [],
      besteKampplaats: formData.besteKampplaats || [],
      lekkersteEten: formData.lekkersteEten || [],
      status: "draft",
      koppelingBevestigd: false,
      updatedAt: serverTimestamp(),
    });
  },

  async bevestigKoppeling(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { koppelingBevestigd: true });
  },

  async revertToStub(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES, id), { status: "stub", updatedAt: serverTimestamp() });
  },

  async removeStub(groepId: string, id: string): Promise<void> {
    await PhotoFactory.removeEntryFromTags(groepId, id);
    await LeidingFactory.removeEntryFromAll(groepId, id);
    await deleteDoc(doc(db, ENTRIES, id));
  },
};

export const ScanStorageFactory = {
  async upload(groepId: string, file: File, entryId: string) {
    return uploadGroepAfbeelding(groepId, file, "scans", entryId);
  },
};

// ---------------------------------------------------------------------------
// LocationFactory & ExtraLocationFactory (apart per groep)
// ---------------------------------------------------------------------------

const LOCATIONS = "locations";

function normalizeName(naam: string) {
  return naam.trim().toLowerCase();
}

function locationDocId(groepId: string, naam: string) {
  return `${groepId}_${normalizeName(naam)}`;
}

export const LocationFactory = {
  async getAll(groepId: string): Promise<WithId<Location>[]> {
    const q = query(collection(db, LOCATIONS), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Location>(snap.docs);
  },

  async set(groepId: string, naam: string, lat: number, lng: number): Promise<void> {
    await setDoc(doc(db, LOCATIONS, locationDocId(groepId, naam)), {
      groepId,
      naam,
      lat,
      lng,
      updatedAt: serverTimestamp(),
    });
  },

  async remove(groepId: string, naam: string): Promise<void> {
    await deleteDoc(doc(db, LOCATIONS, locationDocId(groepId, naam)));
  },

  async markeerGenegeerd(groepId: string, naam: string): Promise<void> {
    await setDoc(doc(db, LOCATIONS, locationDocId(groepId, naam)), {
      groepId,
      naam,
      lat: null,
      lng: null,
      genegeerd: true,
      updatedAt: serverTimestamp(),
    });
  },
};

const EXTRA_LOCATIONS = "extraLocations";

export const ExtraLocationFactory = {
  async getAllAdmin(groepId: string): Promise<WithId<ExtraLocation>[]> {
    const q = query(collection(db, EXTRA_LOCATIONS), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<ExtraLocation>(snap.docs).sort(
      (a, b) => ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async getPublished(groepId: string): Promise<WithId<ExtraLocation>[]> {
    const q = query(
      collection(db, EXTRA_LOCATIONS),
      where("groepId", "==", groepId),
      where("status", "==", "published")
    );
    const snap = await getDocs(q);
    return docsToArray<ExtraLocation>(snap.docs);
  },

  async createByAdmin(
    groepId: string,
    { naam, beschrijving, lat, lng }: { naam: string; beschrijving: string; lat?: number | null; lng?: number | null }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, EXTRA_LOCATIONS), {
      groepId,
      naam: naam || "",
      beschrijving: beschrijving || "",
      lat: lat ?? null,
      lng: lng ?? null,
      contactEmail: null,
      status: "published",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async createPublic(
    groepId: string,
    { naam, beschrijving, lat, lng, contactEmail }: { naam: string; beschrijving: string; lat?: number | null; lng?: number | null; contactEmail: string }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, EXTRA_LOCATIONS), {
      groepId,
      naam: naam || "",
      beschrijving: beschrijving || "",
      lat: lat ?? null,
      lng: lng ?? null,
      contactEmail: contactEmail || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, { naam, beschrijving, lat, lng }: { naam: string; beschrijving: string; lat?: number | null; lng?: number | null }): Promise<void> {
    await updateDoc(doc(db, EXTRA_LOCATIONS, id), {
      naam,
      beschrijving,
      lat: lat ?? null,
      lng: lng ?? null,
    });
  },

  async approve(id: string): Promise<void> {
    await updateDoc(doc(db, EXTRA_LOCATIONS, id), { status: "published" });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, EXTRA_LOCATIONS, id));
  },
};

// ---------------------------------------------------------------------------
// DishFactory & LinkFactory (groep-specifiek)
// ---------------------------------------------------------------------------

const DISHES = "dishes";

function dishDocId(groepId: string, naam: string) {
  return `${groepId}_${normalizeName(naam)}`;
}

export const DishFactory = {
  async getAll(groepId: string): Promise<WithId<Dish>[]> {
    const q = query(collection(db, DISHES), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Dish>(snap.docs);
  },

  async set(groepId: string, naam: string, { receptUrl = "", receptNotitie = "" }: { receptUrl?: string; receptNotitie?: string }): Promise<void> {
    await setDoc(
      doc(db, DISHES, dishDocId(groepId, naam)),
      { groepId, naam, receptUrl, receptNotitie, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  async remove(groepId: string, naam: string): Promise<void> {
    await deleteDoc(doc(db, DISHES, dishDocId(groepId, naam)));
  },
};

const LINKS = "links";

export const LinkFactory = {
  async getAll(groepId: string): Promise<WithId<GroepLink>[]> {
    const q = query(collection(db, LINKS), where("groepId", "==", groepId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return docsToArray<GroepLink>(snap.docs);
  },

  async create(groepId: string, { naam, url, omschrijving }: { naam: string; url: string; omschrijving?: string }): Promise<string> {
    const docRef = await addDoc(collection(db, LINKS), {
      groepId,
      naam: naam || "",
      url: url || "",
      omschrijving: omschrijving || "",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, { naam, url, omschrijving }: { naam: string; url: string; omschrijving?: string }): Promise<void> {
    await updateDoc(doc(db, LINKS, id), { naam, url, omschrijving });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, LINKS, id));
  },
};

// ---------------------------------------------------------------------------
// PhotoTagFactory & ScoutTak (TakFactory)
// ---------------------------------------------------------------------------

const PHOTO_TAGS = "photoTags";

export const PhotoTagFactory = {
  async getAll(groepId: string): Promise<WithId<PhotoTag>[]> {
    const q = query(collection(db, PHOTO_TAGS), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<PhotoTag>(snap.docs).sort((a, b) => a.naam.localeCompare(b.naam));
  },

  async create(groepId: string, naam: string): Promise<string> {
    const docRef = await addDoc(collection(db, PHOTO_TAGS), {
      groepId,
      naam: naam.trim(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, naam: string): Promise<void> {
    await updateDoc(doc(db, PHOTO_TAGS, id), { naam: naam.trim() });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, PHOTO_TAGS, id));
  },
};

const TAKKEN = "scoutTakken";

export const TakFactory = {
  async getAll(groepId: string): Promise<WithId<ScoutTak>[]> {
    const q = query(collection(db, TAKKEN), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<ScoutTak>(snap.docs).sort(
      (a, b) => (a.volgorde ?? 0) - (b.volgorde ?? 0) || a.naam.localeCompare(b.naam)
    );
  },

  async create(groepId: string, naam: string): Promise<string> {
    const alle = await this.getAll(groepId);
    const docRef = await addDoc(collection(db, TAKKEN), {
      groepId,
      naam: naam.trim(),
      volgorde: alle.length,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, naam: string): Promise<void> {
    await updateDoc(doc(db, TAKKEN, id), { naam: naam.trim() });
  },

  async setVolgorde(id: string, volgorde: number): Promise<void> {
    await updateDoc(doc(db, TAKKEN, id), { volgorde });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, TAKKEN, id));
  },
};

// ---------------------------------------------------------------------------
// LeidingFactory (leidingsploeg per tak + werkingsjaar, groep-specifiek)
// ---------------------------------------------------------------------------

const LEIDING = "leidingsploegen";

function leidingDocId(groepId: string, takId: string, werkingsjaarStart: number) {
  return `${groepId}_${takId}_${werkingsjaarStart}`;
}

export const LeidingFactory = {
  async getAll(groepId: string): Promise<WithId<Leidingsploeg>[]> {
    const q = query(collection(db, LEIDING), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Leidingsploeg>(snap.docs);
  },

  /** Beheerder vult/corrigeert een leidingsploeg -- meteen goedgekeurd. */
  async set(groepId: string, takId: string, werkingsjaarStart: number, leden: Leidingsploeg["leden"]): Promise<void> {
    await setDoc(
      doc(db, LEIDING, leidingDocId(groepId, takId, werkingsjaarStart)),
      { groepId, takId, werkingsjaarStart, leden: leden || [], goedgekeurd: true, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  /**
   * Publieke aanvulling/correctie: meteen zichtbaar (net als bij de andere
   * crowdsourced flows), maar als "wacht op goedkeuring" tot de beheerder ze
   * bevestigt via het tabblad Leidingsploegen -- zelfde patroon als
   * EntryFactory.createPublicSubmission.
   */
  async setPublic(groepId: string, takId: string, werkingsjaarStart: number, leden: Leidingsploeg["leden"]): Promise<void> {
    await setDoc(
      doc(db, LEIDING, leidingDocId(groepId, takId, werkingsjaarStart)),
      { groepId, takId, werkingsjaarStart, leden: leden || [], goedgekeurd: false, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  async keurGoed(groepId: string, takId: string, werkingsjaarStart: number): Promise<void> {
    await updateDoc(doc(db, LEIDING, leidingDocId(groepId, takId, werkingsjaarStart)), { goedgekeurd: true });
  },

  async getByEntryId(groepId: string, entryId: string): Promise<WithId<Leidingsploeg>[]> {
    const alle = await this.getAll(groepId);
    return alle.filter((item) => (item.leden || []).some((l) => l.entryId === entryId));
  },

  async removeEntryFromAll(groepId: string, entryId: string): Promise<void> {
    const betrokken = await this.getByEntryId(groepId, entryId);
    await Promise.all(
      betrokken.map((item) => {
        const lijst = (item.leden || []).filter((l) => l.entryId !== entryId);
        return updateDoc(doc(db, LEIDING, item.id), { leden: lijst });
      })
    );
  },

  async linkLedenNaam(id: string, naam: string, entryId: string): Promise<void> {
    const snap = await getDoc(doc(db, LEIDING, id));
    if (!snap.exists()) return;
    const data = snap.data() as Leidingsploeg;
    const lijst = (data.leden || []).map((l) =>
      !l.entryId && l.naam.trim().toLowerCase() === naam.trim().toLowerCase() ? { ...l, entryId } : l
    );
    await updateDoc(doc(db, LEIDING, id), { leden: lijst });
  },

  async remove(groepId: string, takId: string, werkingsjaarStart: number): Promise<void> {
    await deleteDoc(doc(db, LEIDING, leidingDocId(groepId, takId, werkingsjaarStart)));
  },
};

// ---------------------------------------------------------------------------
// GroepMijlpaalFactory (type "groep", groep-specifiek -- naast de
// organisatie-brede OrganisatieMijlpaalFactory hierboven voor type "scouting")
// ---------------------------------------------------------------------------

const MIJLPALEN = "milestones";

export const GroepMijlpaalFactory = {
  async getAllAdmin(groepId: string): Promise<WithId<GroepMijlpaal>[]> {
    const q = query(collection(db, MIJLPALEN), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<GroepMijlpaal>(snap.docs).sort((a, b) => a.jaar - b.jaar);
  },

  async getPublished(groepId: string): Promise<WithId<GroepMijlpaal>[]> {
    const q = query(
      collection(db, MIJLPALEN),
      where("groepId", "==", groepId),
      where("status", "==", "published")
    );
    const snap = await getDocs(q);
    return docsToArray<GroepMijlpaal>(snap.docs).sort((a, b) => a.jaar - b.jaar);
  },

  async createByAdmin(
    groepId: string,
    { jaar, titel, beschrijving, file }: { jaar: number; titel: string; beschrijving: string; file?: File | null }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, MIJLPALEN), {
      groepId,
      jaar,
      titel: titel || "",
      beschrijving: beschrijving || "",
      type: "groep",
      afbeeldingUrl: null,
      afbeeldingPath: null,
      contactEmail: null,
      status: "published",
      createdAt: serverTimestamp(),
    });
    if (file) {
      const upload = await uploadGroepAfbeelding(groepId, file, "mijlpalen", docRef.id);
      await updateDoc(doc(db, MIJLPALEN, docRef.id), { afbeeldingUrl: upload.url, afbeeldingPath: upload.path });
    }
    return docRef.id;
  },

  async createPublic(
    groepId: string,
    { jaar, titel, beschrijving, contactEmail }: { jaar: number; titel: string; beschrijving: string; contactEmail: string }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, MIJLPALEN), {
      groepId,
      jaar,
      titel: titel || "",
      beschrijving: beschrijving || "",
      type: "groep",
      afbeeldingUrl: null,
      afbeeldingPath: null,
      contactEmail: contactEmail || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(
    groepId: string,
    id: string,
    { jaar, titel, beschrijving, file, bestaandePath }: { jaar: number; titel: string; beschrijving: string; file?: File | null; bestaandePath?: string | null }
  ): Promise<void> {
    const data: Record<string, unknown> = { jaar, titel, beschrijving };
    if (file) {
      if (bestaandePath) await verwijderAfbeelding(bestaandePath);
      const upload = await uploadGroepAfbeelding(groepId, file, "mijlpalen", id);
      data.afbeeldingUrl = upload.url;
      data.afbeeldingPath = upload.path;
    }
    await updateDoc(doc(db, MIJLPALEN, id), data);
  },

  async approve(id: string): Promise<void> {
    await updateDoc(doc(db, MIJLPALEN, id), { status: "published" });
  },

  async remove(id: string, afbeeldingPath?: string | null): Promise<void> {
    await verwijderAfbeelding(afbeeldingPath);
    await deleteDoc(doc(db, MIJLPALEN, id));
  },
};

// ---------------------------------------------------------------------------
// PhotoFactory (groep-specifiek)
// ---------------------------------------------------------------------------

const PHOTOS = "photos";

export const PhotoFactory = {
  async getAllAdmin(groepId: string): Promise<WithId<Photo>[]> {
    const q = query(collection(db, PHOTOS), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Photo>(snap.docs).sort(
      (a, b) => ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async getPublished(groepId: string): Promise<WithId<Photo>[]> {
    const q = query(
      collection(db, PHOTOS),
      where("groepId", "==", groepId),
      where("status", "==", "published")
    );
    const snap = await getDocs(q);
    return docsToArray<Photo>(snap.docs);
  },

  async getById(id: string): Promise<WithId<Photo> | null> {
    const snap = await getDoc(doc(db, PHOTOS, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Photo) };
  },

  async _uploadBestanden(
    groepId: string,
    files: File[],
    extraVelden: Record<string, unknown>,
    voortgang?: (index: number, status: "bezig" | "klaar" | "fout") => void
  ): Promise<number> {
    let gelukt = 0;
    await Promise.all(
      files.map(async (file, i) => {
        try {
          voortgang?.(i, "bezig");
          const upload = await uploadGroepAfbeelding(groepId, file, "fotos", `foto-${i}`);
          await addDoc(collection(db, PHOTOS), {
            groepId,
            afbeeldingUrl: upload.url,
            afbeeldingPath: upload.path,
            beeldHash: null,
            jaar: null,
            decennium: null,
            decenniumPositie: 0,
            locatie: "",
            beschrijving: "",
            ledenTags: [],
            taggedEntryIds: [],
            tagIds: [],
            contactEmail: null,
            status: "published",
            verwijderVerzoek: false,
            verwijderReden: "",
            createdAt: serverTimestamp(),
            ...extraVelden,
          });
          gelukt += 1;
          voortgang?.(i, "klaar");
        } catch {
          voortgang?.(i, "fout");
        }
      })
    );
    return gelukt;
  },

  async createBulkByAdmin(
    groepId: string,
    files: File[],
    { jaar, locatie }: { jaar?: number | null; locatie?: string },
    voortgang?: (index: number, status: "bezig" | "klaar" | "fout") => void
  ): Promise<number> {
    return this._uploadBestanden(
      groepId,
      files,
      { jaar: jaar ?? null, locatie: locatie || "", status: "published", contactEmail: null },
      voortgang
    );
  },

  async createBulkPublic(
    groepId: string,
    files: File[],
    { contactEmail }: { contactEmail: string },
    voortgang?: (index: number, status: "bezig" | "klaar" | "fout") => void
  ): Promise<number> {
    return this._uploadBestanden(groepId, files, { status: "pending", contactEmail: contactEmail || "" }, voortgang);
  },

  async updateTags(
    id: string,
    { jaar, locatie, beschrijving, ledenTags, tagIds, decennium }: Partial<Photo> & { decennium?: number | null }
  ): Promise<void> {
    const lijst = ledenTags || [];
    const updates: Record<string, unknown> = {
      jaar: jaar ?? null,
      locatie: locatie || "",
      beschrijving: beschrijving || "",
      ledenTags: lijst,
      tagIds: tagIds || [],
      taggedEntryIds: lijst.map((t) => t.entryId).filter(Boolean),
    };
    if (decennium !== undefined) updates.decennium = decennium;
    await updateDoc(doc(db, PHOTOS, id), updates);
  },

  async zetDecennium(groepId: string, id: string, decennium: number | null): Promise<void> {
    if (decennium == null) {
      await updateDoc(doc(db, PHOTOS, id), { decennium: null, decenniumPositie: 0 });
      return;
    }
    const alle = await this.getPublished(groepId);
    const inDecennium = alle.filter((f) => f.decennium === decennium);
    const maxPositie = inDecennium.reduce((m, f) => Math.max(m, f.decenniumPositie || 0), 0);
    await updateDoc(doc(db, PHOTOS, id), { decennium, decenniumPositie: maxPositie + 1 });
  },

  async herschikDecennium(volgordeIds: string[]): Promise<void> {
    await Promise.all(
      volgordeIds.map((id, index) => updateDoc(doc(db, PHOTOS, id), { decenniumPositie: index }))
    );
  },

  async linkLedenTagNaam(id: string, naam: string, entryId: string): Promise<void> {
    const snap = await getDoc(doc(db, PHOTOS, id));
    if (!snap.exists()) return;
    const data = snap.data() as Photo;
    const lijst = (data.ledenTags || []).map((t) =>
      !t.entryId && t.naam.trim().toLowerCase() === naam.trim().toLowerCase() ? { ...t, entryId } : t
    );
    await updateDoc(doc(db, PHOTOS, id), {
      ledenTags: lijst,
      taggedEntryIds: lijst.map((t) => t.entryId).filter(Boolean),
    });
  },

  async replaceImage(groepId: string, id: string, file: File, oudePad?: string | null) {
    const upload = await uploadGroepAfbeelding(groepId, file, "fotos", "foto-gedraaid");
    await updateDoc(doc(db, PHOTOS, id), { afbeeldingUrl: upload.url, afbeeldingPath: upload.path });
    if (oudePad) await verwijderAfbeelding(oudePad);
    return upload;
  },

  async getByEntryId(groepId: string, entryId: string): Promise<WithId<Photo>[]> {
    const alle = await this.getPublished(groepId);
    return alle.filter((f) => (f.taggedEntryIds || []).includes(entryId));
  },

  async removeEntryFromTags(groepId: string, entryId: string): Promise<void> {
    const alle = await this.getAllAdmin(groepId);
    const betrokken = alle.filter((f) => (f.taggedEntryIds || []).includes(entryId));
    await Promise.all(
      betrokken.map((foto) => {
        const lijst = (foto.ledenTags || []).filter((t) => t.entryId !== entryId);
        return updateDoc(doc(db, PHOTOS, foto.id), {
          ledenTags: lijst,
          taggedEntryIds: lijst.map((t) => t.entryId).filter(Boolean),
        });
      })
    );
  },

  async requestDelete(id: string, reden?: string): Promise<void> {
    await updateDoc(doc(db, PHOTOS, id), { verwijderVerzoek: true, verwijderReden: reden || "" });
  },

  async cancelDeleteRequest(id: string): Promise<void> {
    await updateDoc(doc(db, PHOTOS, id), { verwijderVerzoek: false, verwijderReden: "" });
  },

  async approve(id: string): Promise<void> {
    await updateDoc(doc(db, PHOTOS, id), { status: "published" });
  },

  async remove(id: string, afbeeldingPath?: string | null): Promise<void> {
    await verwijderAfbeelding(afbeeldingPath);
    await deleteDoc(doc(db, PHOTOS, id));
  },

  async setBeeldHash(id: string, beeldHash: string): Promise<void> {
    await updateDoc(doc(db, PHOTOS, id), { beeldHash });
  },
};

// ---------------------------------------------------------------------------
// StatsFactory, ContactFactory, ActivityFactory, WijzigingFactory (groep-specifiek)
// ---------------------------------------------------------------------------

const STATISTIEKEN = "statistieken";

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

function statDocId(groepId: string, dag: string, pad: string) {
  const veiligPad = (pad || "/").replace(/[^a-zA-Z0-9]/g, "_") || "root";
  return `${groepId}__${dag}__${veiligPad}`;
}

export const StatsFactory = {
  async logBezoek(groepId: string, pad: string): Promise<void> {
    const dag = vandaag();
    const id = statDocId(groepId, dag, pad);
    try {
      await setDoc(
        doc(db, STATISTIEKEN, id),
        { groepId, dag, pad: pad || "/", aantal: increment(1) },
        { merge: true }
      );
    } catch {
      // Bezoeksstatistiek mag nooit de pagina zelf laten falen.
    }
  },

  async getAll(groepId: string): Promise<WithId<Statistiek>[]> {
    const q = query(collection(db, STATISTIEKEN), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Statistiek>(snap.docs);
  },
};

const CONTACT = "contactBerichten";

export const ContactFactory = {
  async create(groepId: string, { naam, email, groep, bericht }: { naam: string; email: string; groep: string; bericht: string }): Promise<string> {
    const docRef = await addDoc(collection(db, CONTACT), {
      groepId,
      naam: naam || "",
      email: email || "",
      groep: groep || "",
      bericht: bericht || "",
      gelezen: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getAll(groepId: string): Promise<WithId<ContactBericht>[]> {
    const q = query(collection(db, CONTACT), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<ContactBericht>(snap.docs).sort(
      (a, b) => ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async markeerGelezen(id: string): Promise<void> {
    await updateDoc(doc(db, CONTACT, id), { gelezen: true });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, CONTACT, id));
  },
};

const SYSTEEM_CONTACT = "systeemContactBerichten";

/** Platform-brede tegenhanger van ContactFactory -- berichten aan de systeembeheerder, niet aan een groep. */
export const SysteemContactFactory = {
  async create({ naam, email, bericht }: { naam: string; email: string; bericht: string }): Promise<string> {
    const docRef = await addDoc(collection(db, SYSTEEM_CONTACT), {
      naam: naam || "",
      email: email || "",
      bericht: bericht || "",
      gelezen: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getAll(): Promise<WithId<SysteemContactBericht>[]> {
    const snap = await getDocs(collection(db, SYSTEEM_CONTACT));
    return docsToArray<SysteemContactBericht>(snap.docs).sort(
      (a, b) => ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async markeerGelezen(id: string): Promise<void> {
    await updateDoc(doc(db, SYSTEEM_CONTACT, id), { gelezen: true });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, SYSTEEM_CONTACT, id));
  },
};

const ACTIVITEITEN = "activiteiten";

export const ActivityFactory = {
  async log(groepId: string, { type, actie, itemId, omschrijving, afbeeldingUrl }: Partial<Activiteit>): Promise<void> {
    try {
      await addDoc(collection(db, ACTIVITEITEN), {
        groepId,
        type: type || "overig",
        actie: actie || "",
        itemId: itemId || null,
        omschrijving: omschrijving || "",
        afbeeldingUrl: afbeeldingUrl || null,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Loggen mag de eigenlijke actie van de bezoeker nooit laten falen.
    }
  },

  async getAll(groepId: string): Promise<WithId<Activiteit>[]> {
    const q = query(collection(db, ACTIVITEITEN), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<Activiteit>(snap.docs).sort(
      (a, b) => ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, ACTIVITEITEN, id));
  },

  async ruimOp(groepId: string, ouderDanDagen: number): Promise<number> {
    const grens = Date.now() / 1000 - ouderDanDagen * 24 * 60 * 60;
    const alle = await this.getAll(groepId);
    const teVerwijderen = alle.filter(
      (a) => ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) < grens
    );
    await Promise.all(teVerwijderen.map((a) => deleteDoc(doc(db, ACTIVITEITEN, a.id))));
    return teVerwijderen.length;
  },
};

const WIJZIGINGEN = "wijzigingsVoorstellen";

export const WijzigingFactory = {
  async create(groepId: string, data: Omit<WijzigingsVoorstel, "groepId" | "status" | "createdAt">): Promise<string> {
    const docRef = await addDoc(collection(db, WIJZIGINGEN), {
      groepId,
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getAll(groepId: string): Promise<WithId<WijzigingsVoorstel>[]> {
    const q = query(collection(db, WIJZIGINGEN), where("groepId", "==", groepId));
    const snap = await getDocs(q);
    return docsToArray<WijzigingsVoorstel>(snap.docs).sort(
      (a, b) => ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
        ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0)
    );
  },

  async goedkeuren(voorstel: WithId<WijzigingsVoorstel>): Promise<void> {
    await EntryFactory.update(voorstel.entryId, {
      naam: voorstel.naam,
      geboortejaar: voorstel.geboortejaar,
      totemnaam: voorstel.totemnaam,
      periode: voorstel.periode,
      leuksteActiviteit: voorstel.leuksteActiviteit,
      besteKampplaats: voorstel.besteKampplaats,
      lekkersteEten: voorstel.lekkersteEten,
    });
    await deleteDoc(doc(db, WIJZIGINGEN, voorstel.id));
  },

  async weigeren(id: string): Promise<void> {
    await deleteDoc(doc(db, WIJZIGINGEN, id));
  },
};
