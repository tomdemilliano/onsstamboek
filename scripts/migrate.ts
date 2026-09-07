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
 * Vereisten (env vars):
 *   BRON_PROJECT_ID, BRON_CLIENT_EMAIL, BRON_PRIVATE_KEY   (service-account van het OUDE project "Winkelsimpel")
 *   BRON_STORAGE_BUCKET                                     (bucket van het oude project)
 *   DOEL_PROJECT_ID, DOEL_CLIENT_EMAIL, DOEL_PRIVATE_KEY   (service-account van het NIEUWE project)
 *   DOEL_STORAGE_BUCKET                                     (bucket van het nieuwe project)
 *   GROEP_ID           doc-ID van de al aangemaakte Sint-Eduardus-groep in `groepen` (nieuw project)
 *   ORGANISATIE_ID     doc-ID van de organisatie waaronder scouting-brede kentekens/mijlpalen komen (optioneel)
 *
 * Gebruik:
 *   npx tsx scripts/migrate.ts
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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
      credential: cert({
        projectId: vereist(`${prefix}_PROJECT_ID`),
        clientEmail: vereist(`${prefix}_CLIENT_EMAIL`),
        privateKey: vereist(`${prefix}_PRIVATE_KEY`).replace(/\\n/g, "\n"),
      }),
      storageBucket: vereist(`${prefix}_STORAGE_BUCKET`),
    },
    prefix
  );
}

// Simpele collecties: gewoon overkopiëren met hetzelfde document-ID (zodat
// onderlinge verwijzingen zoals `entryId`/`itemId` geldig blijven) en een
// `groepId` erbij.
const GROEP_COLLECTIES = [
  "entries",
  "photos",
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

// Storage: alles onder het oude `vriendenboekje/`-pad kopiëren naar het
// nieuwe, groep-specifieke pad. Kenteken-/scouting-mijlpaal-afbeeldingen
// (die in de oude app ook al onder vriendenboekje/kentekens|mijlpalen
// zaten) komen in de praktijk zelden voor bij Sint-Eduardus zelf, maar
// worden hier toch onder de groep gekopieerd -- verplaats ze handmatig naar
// organisaties/{organisatieId}/... als ze effectief bewegingsbreed zijn.
async function migreerStorage(groepId: string) {
  const bronBucket = getStorage(bronApp).bucket();
  const doelBucket = getStorage(doelApp).bucket();

  const [files] = await bronBucket.getFiles({ prefix: `${BRON_STORAGE_PREFIX}/` });
  console.log(`Storage: ${files.length} bestand(en) gevonden onder ${BRON_STORAGE_PREFIX}/.`);

  for (const file of files) {
    const nieuwPad = file.name.replace(`${BRON_STORAGE_PREFIX}/`, `groepen/${groepId}/`);
    const [buffer] = await file.download();
    await doelBucket.file(nieuwPad).save(buffer, {
      metadata: { contentType: file.metadata.contentType },
    });
  }
  console.log("Storage: klaar.");
}

let bronApp: ReturnType<typeof initApp>;
let doelApp: ReturnType<typeof initApp>;

async function main() {
  const groepId = vereist("GROEP_ID");
  const organisatieId = process.env.ORGANISATIE_ID || null;

  bronApp = initApp("BRON");
  doelApp = initApp("DOEL");

  const bronDb = getFirestore(bronApp, BRON_DATABASE_ID);
  const doelDb = getFirestore(doelApp);

  console.log(`Migratie start -> groepId=${groepId}, organisatieId=${organisatieId ?? "(geen)"}`);

  await migreerGroepCollecties(bronDb, doelDb, groepId);
  await migreerMijlpalen(bronDb, doelDb, groepId, organisatieId);
  await migreerKentekens(bronDb, doelDb, organisatieId);
  await migreerStorage(groepId);

  console.log("Migratie voltooid.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
