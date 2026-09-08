/**
 * Migratiescript: kopieert de bestaande Sint-Eduardus-data (single-tenant
 * "Winkelsimpel"-project, named Firestore-database `sinteduardusscouts4ever`,
 * Storage-prefix `vriendenboekje/`) naar het nieuwe, multi-tenant
 * Firebase-project van dit platform, met een `groepId` op elk document.
 *
 * Belangrijk: dit script LEEST enkel uit het oude project (geen schrijf-
 * toegang nodig daar, dus geen risico voor de live site) en SCHRIJFT enkel
 * naar het nieuwe project. Test dit eerst tegen een lege/staging-versie van
 * het nieuwe project voor je het tegen de definitieve database draait.
 *
 * Elke afbeelding (fotos, entry-scans, jaarkentekens, mijlpaal-afbeeldingen)
 * wordt zowel als bestand gekopieerd (bron -> doel-bucket, op het pad dat de
 * nieuwe app ook zelf gebruikt) ALS de bijhorende Firestore-velden
 * (afbeeldingUrl/afbeeldingPath, of scanUrl/scanPath) worden herschreven
 * naar die nieuwe locatie -- anders zou de nieuwe app na de migratie stiekem
 * afbeeldingen blijven tonen vanuit het OUDE project/bucket, en zou de
 * gekopieerde bestand in het nieuwe project nergens naar verwijzen.
 *
 * Kosten: elke foto wordt gedownload uit het oude project en opnieuw
 * geüpload naar het nieuwe -- dat kost Google Cloud-netwerkuitgaande
 * bandbreedte (orde grootte €0,10/GB; bij >500 foto's dus typisch een paar
 * dubbeltjes, geen grote kost, maar wel iets om bewust te doen). Gebruik
 * daarom eerst FOTO_LIMIT (zie hieronder) om een kleine testbatch te
 * migreren en te controleren voor je de volledige set draait. Het script
 * slaat bestanden die in de doelbucket al bestaan over (idempotent), dus
 * een volgende run met een hogere/geen FOTO_LIMIT kost enkel nog de NIEUWE
 * bestanden -- al gemigreerde foto's worden niet nogmaals gedownload.
 *
 * Vereisten (env vars) -- voor zowel BRON (het oude project "Winkelsimpel")
 * als DOEL (het nieuwe project) telkens ofwel `<PREFIX>_SERVICE_ACCOUNT_KEY`
 * (aanbevolen, zie lib/adminCredential.ts) ofwel de 3 losse velden:
 *   BRON_SERVICE_ACCOUNT_KEY  of  BRON_PROJECT_ID, BRON_CLIENT_EMAIL, BRON_PRIVATE_KEY
 *   BRON_STORAGE_BUCKET                                     (enkel de bucket-naam, bv.
 *                                                            winkelsimpel.appspot.com --
 *                                                            GEEN "gs://"-voorvoegsel en
 *                                                            geen pad erachter)
 *   DOEL_SERVICE_ACCOUNT_KEY  of  DOEL_PROJECT_ID, DOEL_CLIENT_EMAIL, DOEL_PRIVATE_KEY
 *   DOEL_STORAGE_BUCKET                                     (idem, van het nieuwe project)
 *   GROEP_ID           doc-ID van de al aangemaakte Sint-Eduardus-groep in `groepen` (nieuw project).
 *                      Optioneel als je enkel bewegingsbrede data wil (her)migreren: laat leeg om
 *                      groep-gebonden data (fiches, foto's, scans, locaties, links, groep-mijlpalen...)
 *                      helemaal over te slaan -- handig als de groep zelf al eerder gemigreerd is en
 *                      je nadien enkel nog kentekens/scouting-mijlpalen wil toevoegen.
 *   ORGANISATIE_ID     doc-ID van de organisatie waaronder scouting-brede kentekens/mijlpalen komen.
 *                      Optioneel als je enkel groep-gebonden data migreert. Minstens één van
 *                      GROEP_ID/ORGANISATIE_ID is verplicht -- anders is er niets te migreren.
 *   FOTO_LIMIT         optioneel: migreer enkel de eerste N foto's (vriendenboekje/fotos/...)
 *                      -- zowel het Firestore-document als het bijhorende bestand, zodat een
 *                      testrun geen kapotte afbeeldingen oplevert. Scans/kentekens/mijlpalen-
 *                      afbeeldingen (veel minder talrijk) migreren altijd volledig.
 *   SKIP_STORAGE       optioneel: "true" om alle Storage-bestanden (scans, foto's, kentekens-
 *                      en mijlpalen-afbeeldingen) over te slaan -- enkel Firestore-data
 *                      migreren, zo goed als gratis, handig om eerst te testen.
 *
 * Gebruik:
 *   npx tsx scripts/migrate.ts
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminCredential } from "../lib/adminCredential";

const BRON_DATABASE_ID = "sinteduardusscouts4ever";
const BRON_STORAGE_PREFIX = "vriendenboekje";

type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

function vereist(naam: string): string {
  const waarde = process.env[naam];
  if (!waarde) throw new Error(`Omgevingsvariabele ${naam} ontbreekt.`);
  return waarde;
}

function initApp(prefix: "BRON" | "DOEL") {
  return initializeApp(
    {
      credential: getAdminCredential(`${prefix}_`),
      storageBucket: vereist(`${prefix}_STORAGE_BUCKET`),
    },
    prefix
  );
}

/** Bouwt dezelfde soort download-URL als de client-SDK's getDownloadURL() -- werkt
 * hier zonder token omdat storage.rules voor deze paden al `allow read: if true` is. */
function buildDownloadUrl(bucket: Bucket, path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`;
}

/**
 * Kopieert één bestand van de bron- naar de doelbucket, tenzij het daar al
 * bestaat (idempotent -- een herhaalde run kost dan geen nieuwe download/
 * upload meer voor bestanden die al eerder gelukt zijn).
 */
async function kopieerBestandIndienNodig(
  bronBucket: Bucket,
  doelBucket: Bucket,
  bronPad: string,
  doelPad: string
): Promise<"gekopieerd" | "overgeslagen-bestond-al" | "fout"> {
  try {
    const [bestaatAl] = await doelBucket.file(doelPad).exists();
    if (bestaatAl) return "overgeslagen-bestond-al";

    const bronFile = bronBucket.file(bronPad);
    const [buffer] = await bronFile.download();
    const [metadata] = await bronFile.getMetadata();
    await doelBucket.file(doelPad).save(buffer, {
      metadata: { contentType: metadata.contentType },
    });
    return "gekopieerd";
  } catch (err) {
    console.error(`  ! kopiëren mislukt voor ${bronPad}:`, err);
    return "fout";
  }
}

/**
 * Kopieert een afbeelding EN geeft de nieuwe url/path terug om de
 * Firestore-velden mee te herschrijven. Bij een mislukte kopie: null, zodat
 * de aanroeper de oude (nog altijd geldige, want het oude project blijft
 * bestaan) url/path gewoon behoudt in plaats van een gebroken verwijzing
 * weg te schrijven.
 */
async function kopieerAfbeelding(
  bronBucket: Bucket,
  doelBucket: Bucket,
  bronPad: string,
  doelPad: string,
  teller: { gekopieerd: number; overgeslagen: number; fouten: number }
): Promise<{ afbeeldingUrl: string; afbeeldingPath: string } | null> {
  const resultaat = await kopieerBestandIndienNodig(bronBucket, doelBucket, bronPad, doelPad);
  if (resultaat === "gekopieerd") teller.gekopieerd += 1;
  else if (resultaat === "overgeslagen-bestond-al") teller.overgeslagen += 1;
  else {
    teller.fouten += 1;
    return null;
  }
  return { afbeeldingUrl: buildDownloadUrl(doelBucket, doelPad), afbeeldingPath: doelPad };
}

function nieuwPad(oudPad: string, groepId: string): string {
  return oudPad.replace(`${BRON_STORAGE_PREFIX}/`, `groepen/${groepId}/`);
}

// Simpele collecties zonder eigen afbeeldingen: gewoon overkopiëren met
// hetzelfde document-ID (zodat onderlinge verwijzingen zoals `entryId`/
// `itemId` geldig blijven) en een `groepId` erbij. `entries`, `photos` en
// `milestones` hebben elk hun eigen functie hieronder (i.v.m. hun
// afbeeldingen/scans).
const GROEP_COLLECTIES = [
  "photoTags",
  "locations",
  "extraLocations",
  "dishes",
  "links",
  "scoutTakken",
  "leidingsploegen",
  "statistieken",
  "contactBerichten",
  "activiteiten",
  "wijzigingsVoorstellen",
] as const;

async function migreerGroepCollecties(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  groepId: string
) {
  for (const naam of GROEP_COLLECTIES) {
    const snap = await bronDb.collection(naam).get();
    let batch = doelDb.batch();
    let teller = 0;
    for (const d of snap.docs) {
      const ref = doelDb.collection(naam).doc(d.id);
      batch.set(ref, { ...d.data(), groepId });
      teller += 1;
      // Firestore-batches zijn beperkt tot 500 writes.
      if (teller % 500 === 0) {
        await batch.commit();
        batch = doelDb.batch();
      }
    }
    await batch.commit();
    console.log(`${naam}: ${snap.size} document(en) gemigreerd.`);
  }
}

// `entries` heeft een optionele scan (ingescand papieren formulier) die
// mee moet verhuizen naar groepen/{groepId}/scans/...
async function migreerEntries(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  bronBucket: Bucket,
  doelBucket: Bucket,
  groepId: string,
  skipStorage: boolean
) {
  const snap = await bronDb.collection("entries").get();
  const teller = { gekopieerd: 0, overgeslagen: 0, fouten: 0 };

  for (const d of snap.docs) {
    const data = d.data();
    let scanUrl = data.scanUrl ?? null;
    let scanPath = data.scanPath ?? null;

    if (!skipStorage && data.scanPath) {
      const doelPad = nieuwPad(data.scanPath, groepId);
      const nieuw = await kopieerAfbeelding(bronBucket, doelBucket, data.scanPath, doelPad, teller);
      if (nieuw) {
        scanUrl = nieuw.afbeeldingUrl;
        scanPath = nieuw.afbeeldingPath;
      }
    }

    await doelDb.collection("entries").doc(d.id).set({ ...data, groepId, scanUrl, scanPath });
  }

  console.log(
    `entries: ${snap.size} document(en) gemigreerd` +
      (skipStorage ? " (scans overgeslagen, SKIP_STORAGE=true)." : `, scans: ${teller.gekopieerd} gekopieerd, ${teller.overgeslagen} bestonden al, ${teller.fouten} fout(en).`)
  );
}

// `milestones` is een uitzondering: type 'scouting' gaat naar de
// organisatie-collectie (eenmalig, niet per groep, afbeelding naar
// organisaties/{id}/mijlpalen/...), type 'groep' gaat naar `milestones`
// met een groepId (afbeelding naar groepen/{groepId}/mijlpalen/...).
async function migreerMijlpalen(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  bronBucket: Bucket,
  doelBucket: Bucket,
  groepId: string | null,
  organisatieId: string | null,
  skipStorage: boolean
) {
  const snap = await bronDb.collection("milestones").get();
  let groepTeller = 0;
  let scoutingTeller = 0;
  let overgeslagen = 0;
  let groepOvergeslagen = 0;
  const afbeeldingTeller = { gekopieerd: 0, overgeslagen: 0, fouten: 0 };

  for (const d of snap.docs) {
    const data = d.data();
    if (data.type === "scouting") {
      if (!organisatieId) {
        overgeslagen += 1;
        continue;
      }
      // Scouting-brede mijlpalen horen maar één keer te bestaan -- niet
      // opnieuw aanmaken als jaar+titel al bestaat (bv. bij een tweede
      // migratie-run, of als een andere groep dezelfde mijlpaal al
      // aanleverde).
      const bestaandeQuery = await doelDb
        .collection("organisaties")
        .doc(organisatieId)
        .collection("mijlpalen")
        .where("jaar", "==", data.jaar)
        .where("titel", "==", data.titel)
        .limit(1)
        .get();
      if (!bestaandeQuery.empty) continue;

      let afbeeldingUrl = data.afbeeldingUrl ?? null;
      let afbeeldingPath = data.afbeeldingPath ?? null;
      if (!skipStorage && data.afbeeldingPath) {
        const doelPad = (data.afbeeldingPath as string).replace(`${BRON_STORAGE_PREFIX}/`, `organisaties/${organisatieId}/`);
        const nieuw = await kopieerAfbeelding(bronBucket, doelBucket, data.afbeeldingPath, doelPad, afbeeldingTeller);
        if (nieuw) {
          afbeeldingUrl = nieuw.afbeeldingUrl;
          afbeeldingPath = nieuw.afbeeldingPath;
        }
      }

      await doelDb.collection("organisaties").doc(organisatieId).collection("mijlpalen").doc(d.id).set({ ...data, afbeeldingUrl, afbeeldingPath });
      scoutingTeller += 1;
    } else {
      if (!groepId) {
        groepOvergeslagen += 1;
        continue;
      }
      let afbeeldingUrl = data.afbeeldingUrl ?? null;
      let afbeeldingPath = data.afbeeldingPath ?? null;
      if (!skipStorage && data.afbeeldingPath) {
        const doelPad = nieuwPad(data.afbeeldingPath, groepId);
        const nieuw = await kopieerAfbeelding(bronBucket, doelBucket, data.afbeeldingPath, doelPad, afbeeldingTeller);
        if (nieuw) {
          afbeeldingUrl = nieuw.afbeeldingUrl;
          afbeeldingPath = nieuw.afbeeldingPath;
        }
      }

      await doelDb.collection("milestones").doc(d.id).set({ ...data, groepId, afbeeldingUrl, afbeeldingPath });
      groepTeller += 1;
    }
  }

  console.log(`milestones: ${groepTeller} groep-mijlpalen, ${scoutingTeller} scouting-mijlpalen gemigreerd.`);
  if (!skipStorage) {
    console.log(`milestones: afbeeldingen -- ${afbeeldingTeller.gekopieerd} gekopieerd, ${afbeeldingTeller.overgeslagen} bestonden al, ${afbeeldingTeller.fouten} fout(en).`);
  }
  if (overgeslagen > 0) {
    console.warn(`milestones: ${overgeslagen} scouting-mijlpalen overgeslagen (geen ORGANISATIE_ID opgegeven).`);
  }
  if (groepOvergeslagen > 0) {
    console.warn(`milestones: ${groepOvergeslagen} groep-mijlpalen overgeslagen (geen GROEP_ID opgegeven).`);
  }
}

// `badges` (jaarkentekens) zijn altijd bewegingsbreed -> organisatie-collectie,
// afbeelding naar organisaties/{organisatieId}/kentekens/...
async function migreerKentekens(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  bronBucket: Bucket,
  doelBucket: Bucket,
  organisatieId: string | null,
  skipStorage: boolean
) {
  if (!organisatieId) {
    console.warn("badges: overgeslagen (geen ORGANISATIE_ID opgegeven).");
    return;
  }
  const snap = await bronDb.collection("badges").get();
  const teller = { gekopieerd: 0, overgeslagen: 0, fouten: 0 };

  for (const d of snap.docs) {
    const data = d.data();
    let afbeeldingUrl = data.afbeeldingUrl ?? null;
    let afbeeldingPath = data.afbeeldingPath ?? null;

    if (!skipStorage && data.afbeeldingPath) {
      const doelPad = (data.afbeeldingPath as string).replace(`${BRON_STORAGE_PREFIX}/`, `organisaties/${organisatieId}/`);
      const nieuw = await kopieerAfbeelding(bronBucket, doelBucket, data.afbeeldingPath, doelPad, teller);
      if (nieuw) {
        afbeeldingUrl = nieuw.afbeeldingUrl;
        afbeeldingPath = nieuw.afbeeldingPath;
      }
    }

    await doelDb.collection("organisaties").doc(organisatieId).collection("kentekens").doc(d.id).set({ ...data, afbeeldingUrl, afbeeldingPath });
  }
  console.log(
    `badges: ${snap.size} kenteken(s) gemigreerd naar organisaties/${organisatieId}/kentekens` +
      (skipStorage ? " (afbeeldingen overgeslagen, SKIP_STORAGE=true)." : `, afbeeldingen: ${teller.gekopieerd} gekopieerd, ${teller.overgeslagen} bestonden al, ${teller.fouten} fout(en).`)
  );
}

// Foto's (vriendenboekje/fotos/...) horen 1-op-1 bij een `photos`-document --
// beide samen migreren (i.p.v. los) zodat FOTO_LIMIT een consistente, meteen
// bruikbare testbatch oplevert: nooit een Firestore-foto-document zonder het
// bijhorende bestand, of omgekeerd.
async function migreerFotos(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  bronBucket: Bucket,
  doelBucket: Bucket,
  groepId: string,
  fotoLimit: number | null,
  skipStorage: boolean
) {
  const snap = await bronDb.collection("photos").orderBy("createdAt", "asc").get();
  const alleDocs = snap.docs;
  const teMigreren = fotoLimit != null ? alleDocs.slice(0, fotoLimit) : alleDocs;

  if (fotoLimit != null) {
    console.log(
      `photos: FOTO_LIMIT=${fotoLimit} actief -- ${teMigreren.length} van ${alleDocs.length} foto's worden gemigreerd (testbatch).`
    );
  } else {
    console.log(`photos: ${teMigreren.length} document(en) gevonden, geen FOTO_LIMIT (volledige migratie).`);
  }

  const teller = { gekopieerd: 0, overgeslagen: 0, fouten: 0 };

  for (let i = 0; i < teMigreren.length; i++) {
    const d = teMigreren[i];
    const data = d.data();
    let afbeeldingUrl = data.afbeeldingUrl ?? null;
    let afbeeldingPath = data.afbeeldingPath ?? null;

    if (!skipStorage && data.afbeeldingPath) {
      const doelPad = nieuwPad(data.afbeeldingPath, groepId);
      const nieuw = await kopieerAfbeelding(bronBucket, doelBucket, data.afbeeldingPath, doelPad, teller);
      if (nieuw) {
        afbeeldingUrl = nieuw.afbeeldingUrl;
        afbeeldingPath = nieuw.afbeeldingPath;
      }
    }

    await doelDb.collection("photos").doc(d.id).set({ ...data, groepId, afbeeldingUrl, afbeeldingPath });

    if ((i + 1) % 25 === 0 || i === teMigreren.length - 1) {
      console.log(`  ... ${i + 1}/${teMigreren.length} foto's verwerkt (${teller.gekopieerd} nieuw gekopieerd, ${teller.overgeslagen} bestonden al, ${teller.fouten} fout).`);
    }
  }

  console.log(`photos: klaar -- ${teMigreren.length} document(en), ${teller.gekopieerd} bestand(en) gekopieerd, ${teller.overgeslagen} oversloegen (bestonden al), ${teller.fouten} fout(en).`);
  if (fotoLimit != null && alleDocs.length > teMigreren.length) {
    console.log(`photos: ${alleDocs.length - teMigreren.length} foto's nog NIET gemigreerd -- draai het script opnieuw met een hogere/geen FOTO_LIMIT om de rest te migreren.`);
  }
}

let bronApp: ReturnType<typeof initApp>;
let doelApp: ReturnType<typeof initApp>;

async function main() {
  const groepId = process.env.GROEP_ID?.trim() || null;
  const organisatieId = process.env.ORGANISATIE_ID?.trim() || null;
  const fotoLimitRaw = process.env.FOTO_LIMIT?.trim();
  const fotoLimit = fotoLimitRaw ? parseInt(fotoLimitRaw, 10) : null;
  const skipStorage = process.env.SKIP_STORAGE?.trim().toLowerCase() === "true";

  if (!groepId && !organisatieId) {
    throw new Error("Geef minstens GROEP_ID of ORGANISATIE_ID op -- anders is er niets om te migreren.");
  }
  if (fotoLimitRaw && (fotoLimit == null || Number.isNaN(fotoLimit) || fotoLimit < 0)) {
    throw new Error(`FOTO_LIMIT moet een positief getal zijn, kreeg "${fotoLimitRaw}".`);
  }

  bronApp = initApp("BRON");
  doelApp = initApp("DOEL");

  const bronDb = getFirestore(bronApp, BRON_DATABASE_ID);
  const doelDb = getFirestore(doelApp);
  const bronBucket = getStorage(bronApp).bucket();
  const doelBucket = getStorage(doelApp).bucket();

  console.log(
    `Migratie start -> groepId=${groepId ?? "(geen)"}, organisatieId=${organisatieId ?? "(geen)"}, ` +
      `FOTO_LIMIT=${fotoLimit ?? "(geen, volledig)"}, SKIP_STORAGE=${skipStorage}`
  );

  if (groepId) {
    await migreerGroepCollecties(bronDb, doelDb, groepId);
    await migreerEntries(bronDb, doelDb, bronBucket, doelBucket, groepId, skipStorage);
  } else {
    console.log("GROEP_ID niet opgegeven -- groep-gebonden data (fiches, foto's, scans, locaties, links, ...) wordt overgeslagen.");
  }
  await migreerMijlpalen(bronDb, doelDb, bronBucket, doelBucket, groepId, organisatieId, skipStorage);
  await migreerKentekens(bronDb, doelDb, bronBucket, doelBucket, organisatieId, skipStorage);
  if (groepId) {
    await migreerFotos(bronDb, doelDb, bronBucket, doelBucket, groepId, fotoLimit, skipStorage);
  }

  console.log("Migratie voltooid.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
