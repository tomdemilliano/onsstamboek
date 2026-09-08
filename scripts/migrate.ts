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
 * Kosten: elke foto wordt gedownload uit het oude project en opnieuw
 * geüpload naar het nieuwe -- dat kost Google Cloud-netwerkuitgaande
 * bandbreedte (orde grootte €0,10/GB; bij >500 foto's dus typisch een paar
 * dubbeltjes, geen grote kost, maar wel iets om bewust te doen). Gebruik
 * daarom eerst FOTO_LIMIT (zie hieronder) om een kleine testbatch te
 * migreren en te controleren voor je de volledige set draait. Het script
 * slaat foto's die in de doelbucket al bestaan over (idempotent), dus een
 * volgende run met een hogere/geen FOTO_LIMIT kost enkel nog de NIEUWE
 * bestanden -- al gemigreerde foto's worden niet nogmaals gedownload.
 *
 * Vereisten (env vars) -- voor zowel BRON (het oude project "Winkelsimpel")
 * als DOEL (het nieuwe project) telkens ofwel `<PREFIX>_SERVICE_ACCOUNT_KEY`
 * (aanbevolen, zie lib/adminCredential.ts) ofwel de 3 losse velden:
 *   BRON_SERVICE_ACCOUNT_KEY  of  BRON_PROJECT_ID, BRON_CLIENT_EMAIL, BRON_PRIVATE_KEY
 *   BRON_STORAGE_BUCKET                                     (bucket van het oude project)
 *   DOEL_SERVICE_ACCOUNT_KEY  of  DOEL_PROJECT_ID, DOEL_CLIENT_EMAIL, DOEL_PRIVATE_KEY
 *   DOEL_STORAGE_BUCKET                                     (bucket van het nieuwe project)
 *   GROEP_ID           doc-ID van de al aangemaakte Sint-Eduardus-groep in `groepen` (nieuw project)
 *   ORGANISATIE_ID     doc-ID van de organisatie waaronder scouting-brede kentekens/mijlpalen komen (optioneel)
 *   FOTO_LIMIT         optioneel: migreer enkel de eerste N foto's (vriendenboekje/fotos/...)
 *                      -- zowel het Firestore-document als het bijhorende bestand, zodat een
 *                      testrun geen kapotte afbeeldingen oplevert. Scans/kentekens/mijlpalen-
 *                      afbeeldingen (veel minder talrijk) migreren altijd volledig.
 *   SKIP_STORAGE       optioneel: "true" om Storage (scans + foto's + kentekens/mijlpalen-
 *                      afbeeldingen) helemaal over te slaan -- enkel Firestore-data migreren,
 *                      zo goed als gratis en snel, handig om eerst te testen.
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

// Simpele collecties: gewoon overkopiëren met hetzelfde document-ID (zodat
// onderlinge verwijzingen zoals `entryId`/`itemId` geldig blijven) en een
// `groepId` erbij. `photos` zit hier bewust NIET bij -- die heeft zijn eigen
// functie hieronder, om synchroon te blijven met FOTO_LIMIT.
const GROEP_COLLECTIES = [
  "entries",
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

// `milestones` is een uitzondering: type 'scouting' gaat naar de
// organisatie-collectie (eenmalig, niet per groep), type 'groep' gaat
// gewoon naar `milestones` met een groepId zoals de rest.
async function migreerMijlpalen(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  groepId: string,
  organisatieId: string | null
) {
  const snap = await bronDb.collection("milestones").get();
  let groepTeller = 0;
  let scoutingTeller = 0;
  let overgeslagen = 0;

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

      await doelDb.collection("organisaties").doc(organisatieId).collection("mijlpalen").doc(d.id).set(data);
      scoutingTeller += 1;
    } else {
      await doelDb.collection("milestones").doc(d.id).set({ ...data, groepId });
      groepTeller += 1;
    }
  }

  console.log(`milestones: ${groepTeller} groep-mijlpalen, ${scoutingTeller} scouting-mijlpalen gemigreerd.`);
  if (overgeslagen > 0) {
    console.warn(`milestones: ${overgeslagen} scouting-mijlpalen overgeslagen (geen ORGANISATIE_ID opgegeven).`);
  }
}

// `badges` (jaarkentekens) zijn altijd bewegingsbreed -> organisatie-collectie.
async function migreerKentekens(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  organisatieId: string | null
) {
  if (!organisatieId) {
    console.warn("badges: overgeslagen (geen ORGANISATIE_ID opgegeven).");
    return;
  }
  const snap = await bronDb.collection("badges").get();
  for (const d of snap.docs) {
    await doelDb.collection("organisaties").doc(organisatieId).collection("kentekens").doc(d.id).set(d.data());
  }
  console.log(`badges: ${snap.size} kenteken(s) gemigreerd naar organisaties/${organisatieId}/kentekens.`);
}

/**
 * Kopieert één bestand van de bron- naar de doelbucket, tenzij het daar al
 * bestaat (idempotent -- een herhaalde run kost dan geen nieuwe download/
 * upload meer voor bestanden die al eerder gelukt zijn).
 */
async function kopieerBestandIndienNodig(
  bronBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
  doelBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
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

// Foto's (vriendenboekje/fotos/...) horen 1-op-1 bij een `photos`-document --
// beide samen migreren (i.p.v. los, zoals de rest van Storage) zodat
// FOTO_LIMIT een consistente, meteen bruikbare testbatch oplevert: nooit een
// Firestore-foto-document zonder het bijhorende bestand, of omgekeerd.
async function migreerFotos(
  bronDb: FirebaseFirestore.Firestore,
  doelDb: FirebaseFirestore.Firestore,
  bronBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
  doelBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
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

  let gekopieerd = 0;
  let overgeslagen = 0;
  let fouten = 0;

  for (let i = 0; i < teMigreren.length; i++) {
    const d = teMigreren[i];
    const data = d.data();

    await doelDb.collection("photos").doc(d.id).set({ ...data, groepId });

    if (!skipStorage && data.afbeeldingPath) {
      const doelPad = (data.afbeeldingPath as string).replace(`${BRON_STORAGE_PREFIX}/`, `groepen/${groepId}/`);
      const resultaat = await kopieerBestandIndienNodig(bronBucket, doelBucket, data.afbeeldingPath, doelPad);
      if (resultaat === "gekopieerd") gekopieerd += 1;
      else if (resultaat === "overgeslagen-bestond-al") overgeslagen += 1;
      else fouten += 1;
    }

    if ((i + 1) % 25 === 0 || i === teMigreren.length - 1) {
      console.log(`  ... ${i + 1}/${teMigreren.length} foto's verwerkt (${gekopieerd} nieuw gekopieerd, ${overgeslagen} bestonden al, ${fouten} fout).`);
    }
  }

  console.log(`photos: klaar -- ${teMigreren.length} document(en), ${gekopieerd} bestand(en) gekopieerd, ${overgeslagen} oversloegen (bestonden al), ${fouten} fout(en).`);
  if (fotoLimit != null && alleDocs.length > teMigreren.length) {
    console.log(`photos: ${alleDocs.length - teMigreren.length} foto's nog NIET gemigreerd -- draai het script opnieuw met een hogere/geen FOTO_LIMIT om de rest te migreren.`);
  }
}

// Storage buiten vriendenboekje/fotos/... (scans, kentekens, mijlpalen) --
// in de praktijk veel minder bestanden, dus altijd in één keer volledig.
async function migreerOverigeStorage(
  bronBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
  doelBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
  groepId: string
) {
  const [files] = await bronBucket.getFiles({ prefix: `${BRON_STORAGE_PREFIX}/` });
  const overig = files.filter((f) => !f.name.startsWith(`${BRON_STORAGE_PREFIX}/fotos/`));
  console.log(`Storage (scans/kentekens/mijlpalen): ${overig.length} bestand(en) gevonden.`);

  let gekopieerd = 0;
  let overgeslagen = 0;
  let fouten = 0;
  for (const file of overig) {
    const nieuwPad = file.name.replace(`${BRON_STORAGE_PREFIX}/`, `groepen/${groepId}/`);
    const resultaat = await kopieerBestandIndienNodig(bronBucket, doelBucket, file.name, nieuwPad);
    if (resultaat === "gekopieerd") gekopieerd += 1;
    else if (resultaat === "overgeslagen-bestond-al") overgeslagen += 1;
    else fouten += 1;
  }
  console.log(`Storage (scans/kentekens/mijlpalen): klaar -- ${gekopieerd} gekopieerd, ${overgeslagen} oversloegen (bestonden al), ${fouten} fout(en).`);
}

let bronApp: ReturnType<typeof initApp>;
let doelApp: ReturnType<typeof initApp>;

async function main() {
  const groepId = vereist("GROEP_ID");
  const organisatieId = process.env.ORGANISATIE_ID || null;
  const fotoLimitRaw = process.env.FOTO_LIMIT?.trim();
  const fotoLimit = fotoLimitRaw ? parseInt(fotoLimitRaw, 10) : null;
  const skipStorage = process.env.SKIP_STORAGE?.trim().toLowerCase() === "true";

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
    `Migratie start -> groepId=${groepId}, organisatieId=${organisatieId ?? "(geen)"}, ` +
      `FOTO_LIMIT=${fotoLimit ?? "(geen, volledig)"}, SKIP_STORAGE=${skipStorage}`
  );

  await migreerGroepCollecties(bronDb, doelDb, groepId);
  await migreerMijlpalen(bronDb, doelDb, groepId, organisatieId);
  await migreerKentekens(bronDb, doelDb, organisatieId);
  await migreerFotos(bronDb, doelDb, bronBucket, doelBucket, groepId, fotoLimit, skipStorage);
  if (!skipStorage) {
    await migreerOverigeStorage(bronBucket, doelBucket, groepId);
  } else {
    console.log("Storage (scans/kentekens/mijlpalen): overgeslagen (SKIP_STORAGE=true).");
  }

  console.log("Migratie voltooid.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
