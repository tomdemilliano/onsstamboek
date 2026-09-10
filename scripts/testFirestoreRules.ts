/**
 * Automatische testsuite voor firestore.rules -- draait uitsluitend tegen de
 * lokale Firestore-emulator (nooit tegen een echt project) en simuleert
 * twee gelijktijdig actieve groepen om het grootste risico uit het
 * oorspronkelijke multi-groepplan expliciet te controleren: kan een
 * groepsbeheerder van groep A data van groep B lezen, bewerken of
 * verwijderen?
 *
 * Draai met: npm run test:rules
 * (dat commando start zelf de Firestore-emulator via `firebase emulators:exec`,
 * hier is dus geen los `firebase emulators:start` voor nodig).
 *
 * Bij een falende test: de foutmelding citeert meestal de exacte rule-regel
 * die de request weigerde/toestond -- handig om een wijziging aan
 * firestore.rules te lokaliseren.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  setLogLevel,
} from "firebase/firestore";

setLogLevel("error");

const PROJECT_ID = "demo-onsstamboek-rules-test";
const GROEP_A = "groepA";
const GROEP_B = "groepB";
const ORG_ID = "orgX";
const UID_A = "beheerderA";
const UID_B = "beheerderB";
const UID_C = "gebruikerC";
const UID_SYSTEEM = "systeembeheerder1";

let testEnv: RulesTestEnvironment;
let pass = 0;
let fail = 0;
const failures: string[] = [];

async function test(naam: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    pass++;
    console.log(`  OK   ${naam}`);
  } catch (err) {
    fail++;
    failures.push(naam);
    console.error(`  FOUT ${naam}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, "groepen", GROEP_A), { naam: "Groep A", slug: "groep-a", status: "actief" });
    await setDoc(doc(db, "groepen", GROEP_B), { naam: "Groep B", slug: "groep-b", status: "actief" });
    await setDoc(doc(db, "organisaties", ORG_ID), { naam: "Org X" });

    await setDoc(doc(db, "lidmaatschappen", `${UID_A}_${GROEP_A}`), { userId: UID_A, groepId: GROEP_A, rol: "groepsbeheerder" });
    await setDoc(doc(db, "lidmaatschappen", `${UID_B}_${GROEP_B}`), { userId: UID_B, groepId: GROEP_B, rol: "groepsbeheerder" });

    await setDoc(doc(db, "entries", "entryA-published"), { groepId: GROEP_A, naam: "Jan", status: "published", goedgekeurd: true });
    await setDoc(doc(db, "entries", "entryA-draft"), { groepId: GROEP_A, naam: "Piet", status: "draft" });
    await setDoc(doc(db, "entries", "entryB-published"), { groepId: GROEP_B, naam: "Marie", status: "published", goedgekeurd: true });
    await setDoc(doc(db, "entries", "entryB-draft"), { groepId: GROEP_B, naam: "An", status: "draft" });

    await setDoc(doc(db, "photos", "photoA-published"), {
      groepId: GROEP_A, status: "published", afbeeldingUrl: "https://x/a.jpg", afbeeldingPath: `groepen/${GROEP_A}/fotos/a.jpg`, contactEmail: "", createdAt: 1,
    });
    await setDoc(doc(db, "photos", "photoA-pending"), {
      groepId: GROEP_A, status: "pending", afbeeldingUrl: "https://x/a2.jpg", afbeeldingPath: `groepen/${GROEP_A}/fotos/a2.jpg`, contactEmail: "",
    });
    await setDoc(doc(db, "photos", "photoB-published"), {
      groepId: GROEP_B, status: "published", afbeeldingUrl: "https://x/b.jpg", afbeeldingPath: `groepen/${GROEP_B}/fotos/b.jpg`, contactEmail: "", createdAt: 1,
    });
    await setDoc(doc(db, "photos", "photoB-pending"), {
      groepId: GROEP_B, status: "pending", afbeeldingUrl: "https://x/b2.jpg", afbeeldingPath: `groepen/${GROEP_B}/fotos/b2.jpg`, contactEmail: "",
    });

    await setDoc(doc(db, "locations", "locA"), { groepId: GROEP_A, naam: "Kamp A", lat: 50, lng: 5 });
    await setDoc(doc(db, "locations", "locB"), { groepId: GROEP_B, naam: "Kamp B", lat: 50, lng: 5 });

    await setDoc(doc(db, "extraLocations", "extraA-pending"), { groepId: GROEP_A, status: "pending", naam: "Weide A", beschrijving: "", contactEmail: "" });
    await setDoc(doc(db, "extraLocations", "extraB-pending"), { groepId: GROEP_B, status: "pending", naam: "Weide B", beschrijving: "", contactEmail: "" });

    await setDoc(doc(db, "milestones", "mijlpaalA-pending"), { groepId: GROEP_A, status: "pending", type: "groep", jaar: 1990, titel: "x", beschrijving: "", contactEmail: "", afbeeldingUrl: null, afbeeldingPath: null });
    await setDoc(doc(db, "milestones", "mijlpaalB-pending"), { groepId: GROEP_B, status: "pending", type: "groep", jaar: 1990, titel: "x", beschrijving: "", contactEmail: "", afbeeldingUrl: null, afbeeldingPath: null });

    await setDoc(doc(db, "contactBerichten", "berichtA"), { groepId: GROEP_A, naam: "x", email: "x@x.be", groep: "Groep A", bericht: "hoi", gelezen: false });
    await setDoc(doc(db, "contactBerichten", "berichtB"), { groepId: GROEP_B, naam: "x", email: "x@x.be", groep: "Groep B", bericht: "hoi", gelezen: false });

    await setDoc(doc(db, "activiteiten", "activiteitA"), { groepId: GROEP_A, type: "foto", actie: "x", omschrijving: "x" });
    await setDoc(doc(db, "activiteiten", "activiteitB"), { groepId: GROEP_B, type: "foto", actie: "x", omschrijving: "x" });

    await setDoc(doc(db, "statistieken", "statA"), { groepId: GROEP_A, dag: "2026-01-01", pad: "/", aantal: 1 });
    await setDoc(doc(db, "statistieken", "statB"), { groepId: GROEP_B, dag: "2026-01-01", pad: "/", aantal: 1 });

    await setDoc(doc(db, "leidingsploegen", "leidingA"), { groepId: GROEP_A, takId: "tak1", werkingsjaarStart: 2023, leden: [], goedgekeurd: true });
    await setDoc(doc(db, "leidingsploegen", "leidingB"), { groepId: GROEP_B, takId: "tak1", werkingsjaarStart: 2023, leden: [], goedgekeurd: true });

    await setDoc(doc(db, "dishes", "dishA"), { groepId: GROEP_A, naam: "Pasta" });
    await setDoc(doc(db, "links", "linkA"), { groepId: GROEP_A, naam: "x", url: "https://x", omschrijving: "" });
    await setDoc(doc(db, "scoutTakken", "takA"), { groepId: GROEP_A, naam: "Kapoenen" });
    await setDoc(doc(db, "photoTags", "tagA"), { groepId: GROEP_A, naam: "Kampvuur" });

    await setDoc(doc(db, "wijzigingsVoorstellen", "voorstelBestaandA"), { groepId: GROEP_A, entryId: "entryA-published", status: "pending", email: "x@x.be", naam: "Jan V." });

    await setDoc(doc(db, "organisaties", `${ORG_ID}/kentekens`, "k1"), { startJaar: 2020, jaarleuze: "x" });
    await setDoc(doc(db, "organisaties", `${ORG_ID}/mijlpalen`, "m1"), { status: "published", jaar: 2020, titel: "x" });
  });
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8085,
    },
  });

  await seed();

  const a = testEnv.authenticatedContext(UID_A).firestore();
  const b = testEnv.authenticatedContext(UID_B).firestore();
  const sys = testEnv.authenticatedContext(UID_SYSTEEM, { systeembeheerder: true }).firestore();
  const anon = testEnv.unauthenticatedContext().firestore();

  console.log("\n== groepen ==");
  await test("anoniem leest groep A", () => assertSucceeds(getDoc(doc(anon, "groepen", GROEP_A))));
  await test("beheerder A wijzigt eigen groep", () => assertSucceeds(updateDoc(doc(a, "groepen", GROEP_A), { naam: "Groep A gewijzigd" })));
  await test("beheerder A wijzigt groep B NIET", () => assertFails(updateDoc(doc(a, "groepen", GROEP_B), { naam: "gehackt" })));
  await test("beheerder A maakt geen nieuwe groep aan", () => assertFails(setDoc(doc(a, "groepen", "nieuweGroep"), { naam: "x", slug: "x", status: "actief" })));
  await test("beheerder A verwijdert groep A niet (systeembeheerder-only)", () => assertFails(deleteDoc(doc(a, "groepen", GROEP_A))));
  await test("systeembeheerder wijzigt om het even welke groep", () => assertSucceeds(updateDoc(doc(sys, "groepen", GROEP_B), { naam: "Groep B (sys)" })));

  console.log("\n== lidmaatschappen ==");
  await test("beheerder A leest eigen lidmaatschap", () => assertSucceeds(getDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_A}`))));
  await test("beheerder A leest lidmaatschap van B NIET", () => assertFails(getDoc(doc(a, "lidmaatschappen", `${UID_B}_${GROEP_B}`))));
  await test("beheerder A aanvaardt voorwaarden op eigen lidmaatschap", () =>
    assertSucceeds(updateDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_A}`), { voorwaardenVersie: "2026-09-10", voorwaardenGeaccepteerdOp: 123 }))
  );
  await test("beheerder A kan zichzelf NIET tot systeembeheerder-rol promoveren via lidmaatschap", () =>
    assertFails(updateDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_A}`), { rol: "systeembeheerder" }))
  );
  await test("beheerder A kan voorwaarden-update NIET combineren met een ander veld", () =>
    assertFails(updateDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_A}`), { voorwaardenVersie: "2026-09-10", groepId: GROEP_B }))
  );
  await test("beheerder A wijzigt lidmaatschap van B NIET, ook niet enkel de voorwaarden-velden", () =>
    assertFails(updateDoc(doc(a, "lidmaatschappen", `${UID_B}_${GROEP_B}`), { voorwaardenVersie: "2026-09-10" }))
  );
  await test("beheerder A geeft zichzelf GEEN toegang tot groep B (nieuw lidmaatschap aanmaken)", () =>
    assertFails(setDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_B}`), { userId: UID_A, groepId: GROEP_B, rol: "groepsbeheerder" }))
  );
  await test("beheerder A verwijdert geen lidmaatschap", () => assertFails(deleteDoc(doc(a, "lidmaatschappen", `${UID_A}_${GROEP_A}`))));
  // Bewust een derde, ongebruikte uid (niet UID_B): anders zou UID_B vanaf
  // hier ook een echt lidmaatschap voor groep A hebben, wat alle latere
  // "beheerder B mag groep A niet aanraken"-tests fout-positief zou maken.
  await test("systeembeheerder maakt een lidmaatschap aan", () =>
    assertSucceeds(setDoc(doc(sys, "lidmaatschappen", `${UID_C}_${GROEP_A}`), { userId: UID_C, groepId: GROEP_A, rol: "groepsbeheerder" }))
  );

  console.log("\n== entries (vriendenboekje) ==");
  await test("beheerder A leest concept-fiche van groep B NIET (dataleak-risico)", () => assertFails(getDoc(doc(a, "entries", "entryB-draft"))));
  await test("beheerder A leest gepubliceerde fiche van groep B NIET (enkel via publieke read-regel, geen beheerderstoegang)", () =>
    assertFails(updateDoc(doc(a, "entries", "entryB-published"), { naam: "gehackt" }))
  );
  await test("beheerder A verwijdert fiche van groep B NIET", () => assertFails(deleteDoc(doc(a, "entries", "entryB-published"))));
  await test("beheerder A verplaatst eigen fiche niet stiekem naar groep B", () =>
    assertFails(updateDoc(doc(a, "entries", "entryA-published"), { groepId: GROEP_B }))
  );
  await test("beheerder A bewerkt eigen concept-fiche wel", () => assertSucceeds(updateDoc(doc(a, "entries", "entryA-draft"), { naam: "Piet V." })));
  await test("anoniem leest concept-fiche NIET", () => assertFails(getDoc(doc(anon, "entries", "entryA-draft"))));
  await test("anoniem leest gepubliceerde fiche wel", () => assertSucceeds(getDoc(doc(anon, "entries", "entryA-published"))));
  await test("anoniem dient nieuwe fiche in als 'goed te keuren', niet als meteen goedgekeurd", () =>
    assertFails(
      addDoc(collection(anon, "entries"), {
        groepId: GROEP_A, status: "published", goedgekeurd: true, scanUrl: null, scanPath: null,
        naam: "Nieuwkomer", geboortejaar: "", totemnaam: "", periode: "", leuksteActiviteit: [], besteKampplaats: [], lekkersteEten: [],
      })
    )
  );
  await test("anoniem dient nieuwe fiche correct in (published + goedgekeurd:false)", () =>
    assertSucceeds(
      addDoc(collection(anon, "entries"), {
        groepId: GROEP_A, status: "published", goedgekeurd: false, scanUrl: null, scanPath: null,
        naam: "Nieuwkomer", geboortejaar: "", totemnaam: "", periode: "", leuksteActiviteit: [], besteKampplaats: [], lekkersteEten: [],
      })
    )
  );

  console.log("\n== photos ==");
  await test("beheerder A leest PENDING foto van groep B NIET", () => assertFails(getDoc(doc(a, "photos", "photoB-pending"))));
  await test("beheerder A leest gepubliceerde foto van groep B wel (bewust altijd publiek)", () => assertSucceeds(getDoc(doc(a, "photos", "photoB-published"))));
  await test("anoniem leest pending foto van groep A NIET", () => assertFails(getDoc(doc(anon, "photos", "photoA-pending"))));
  await test("anoniem leest gepubliceerde foto wel", () => assertSucceeds(getDoc(doc(anon, "photos", "photoA-published"))));
  await test("anoniem laadt nieuwe foto op als 'pending'", () =>
    assertSucceeds(addDoc(collection(anon, "photos"), { groepId: GROEP_A, status: "pending", afbeeldingUrl: "https://x/nieuw.jpg", afbeeldingPath: "p", contactEmail: "" }))
  );
  await test("anoniem kan NIET meteen een gepubliceerde foto uploaden", () =>
    assertFails(addDoc(collection(anon, "photos"), { groepId: GROEP_A, status: "published", afbeeldingUrl: "https://x/nieuw2.jpg", afbeeldingPath: "p", contactEmail: "" }))
  );
  await test("anoniem tagt een gepubliceerde foto van groep A (toegelaten velden)", () =>
    assertSucceeds(
      updateDoc(doc(anon, "photos", "photoA-published"), {
        status: "published", afbeeldingUrl: "https://x/a.jpg", afbeeldingPath: `groepen/${GROEP_A}/fotos/a.jpg`, contactEmail: "", createdAt: 1,
        locatie: "Kamp A", jaar: 1990,
      })
    )
  );
  await test("anoniem kan groepId van een foto NIET wijzigen via de tag-update", () =>
    assertFails(
      updateDoc(doc(anon, "photos", "photoA-published"), {
        groepId: GROEP_B, status: "published", afbeeldingUrl: "https://x/a.jpg", afbeeldingPath: `groepen/${GROEP_A}/fotos/a.jpg`, contactEmail: "", createdAt: 1,
      })
    )
  );
  await test("anoniem kan een foto NIET herpubliceren/verbergen via de tag-update (status wijzigen)", () =>
    assertFails(
      updateDoc(doc(anon, "photos", "photoA-pending"), {
        status: "published", afbeeldingUrl: "https://x/a2.jpg", afbeeldingPath: `groepen/${GROEP_A}/fotos/a2.jpg`, contactEmail: "",
      })
    )
  );
  await test("beheerder B wijzigt foto van groep A NIET", () => assertFails(updateDoc(doc(b, "photos", "photoA-published"), { locatie: "gehackt" })));
  await test("beheerder A verplaatst eigen foto niet stiekem naar groep B", () =>
    assertFails(updateDoc(doc(a, "photos", "photoA-published"), { groepId: GROEP_B }))
  );

  console.log("\n== locations (kampplaatsen uit vriendenboekjes) ==");
  await test("iedereen leest locaties (publieke kaart)", () => assertSucceeds(getDoc(doc(anon, "locations", "locA"))));
  await test("anoniem maakt GEEN locatie aan (enkel beheerder koppelt kampplaatsen)", () =>
    assertFails(setDoc(doc(anon, "locations", "nieuweLoc"), { groepId: GROEP_A, naam: "x", lat: 1, lng: 1 }))
  );
  await test("beheerder A wijzigt locatie van groep B NIET", () => assertFails(updateDoc(doc(a, "locations", "locB"), { lat: 0 })));
  await test("beheerder B wijzigt eigen locatie wel", () => assertSucceeds(updateDoc(doc(b, "locations", "locB"), { lat: 51 })));
  await test("beheerder A verplaatst eigen locatie niet stiekem naar groep B", () =>
    assertFails(updateDoc(doc(a, "locations", "locA"), { groepId: GROEP_B }))
  );

  console.log("\n== extraLocations ==");
  await test("beheerder A leest pending extra kampplaats van groep B NIET", () => assertFails(getDoc(doc(a, "extraLocations", "extraB-pending"))));
  await test("beheerder A keurt extra kampplaats van groep B NIET goed", () =>
    assertFails(updateDoc(doc(a, "extraLocations", "extraB-pending"), { status: "published", lat: 1, lng: 1 }))
  );
  await test("anoniem stelt een extra kampplaats voor groep A voor", () =>
    assertSucceeds(addDoc(collection(anon, "extraLocations"), { groepId: GROEP_A, status: "pending", naam: "Nieuwe plek", beschrijving: "", contactEmail: "x@x.be" }))
  );
  await test("anoniem kan zijn eigen voorstel NIET meteen publiceren", () =>
    assertFails(addDoc(collection(anon, "extraLocations"), { groepId: GROEP_A, status: "published", naam: "Nieuwe plek", beschrijving: "", contactEmail: "x@x.be" }))
  );

  console.log("\n== milestones (groep-mijlpalen) ==");
  await test("beheerder A leest pending mijlpaal van groep B NIET", () => assertFails(getDoc(doc(a, "milestones", "mijlpaalB-pending"))));
  await test("beheerder A keurt mijlpaal van groep B NIET goed", () => assertFails(updateDoc(doc(a, "milestones", "mijlpaalB-pending"), { status: "published" })));
  await test("anoniem stelt een mijlpaal voor groep A voor", () =>
    assertSucceeds(
      addDoc(collection(anon, "milestones"), {
        groepId: GROEP_A, status: "pending", type: "groep", jaar: 1995, titel: "x", beschrijving: "", contactEmail: "x@x.be", afbeeldingUrl: null, afbeeldingPath: null,
      })
    )
  );

  console.log("\n== contactBerichten ==");
  await test("beheerder A leest contactbericht van groep B NIET", () => assertFails(getDoc(doc(a, "contactBerichten", "berichtB"))));
  await test("anoniem leest GEEN contactberichten (ook niet van groep A)", () => assertFails(getDoc(doc(anon, "contactBerichten", "berichtA"))));
  await test("beheerder A markeert eigen contactbericht als gelezen", () => assertSucceeds(updateDoc(doc(a, "contactBerichten", "berichtA"), { gelezen: true })));
  await test("anoniem verstuurt een contactbericht naar groep A", () =>
    assertSucceeds(addDoc(collection(anon, "contactBerichten"), { groepId: GROEP_A, naam: "x", email: "x@x.be", groep: "Groep A", bericht: "hallo", gelezen: false }))
  );

  console.log("\n== activiteiten (logboek) ==");
  await test("beheerder A leest activiteitenlog van groep B NIET", () => assertFails(getDoc(doc(a, "activiteiten", "activiteitB"))));
  await test("beheerder A verwijdert log-item van groep B NIET", () => assertFails(deleteDoc(doc(a, "activiteiten", "activiteitB"))));

  console.log("\n== statistieken (bezoekersaantallen) ==");
  await test("beheerder A leest statistieken van groep B NIET", () => assertFails(getDoc(doc(a, "statistieken", "statB"))));
  await test("beheerder A leest eigen statistieken wel", () => assertSucceeds(getDoc(doc(a, "statistieken", "statA"))));
  await test("anoniem telt een paginabezoek voor groep A (schrijfmagelijke teller)", () =>
    assertSucceeds(setDoc(doc(anon, "statistieken", "statNieuw"), { groepId: GROEP_A, dag: "2026-01-02", pad: "/vriendenboekje", aantal: 1 }))
  );

  console.log("\n== leidingsploegen ==");
  await test("iedereen leest leidingsploegen, ook van een andere groep (bewust publiek)", () => assertSucceeds(getDoc(doc(anon, "leidingsploegen", "leidingA"))));
  await test("beheerder B kan leidingsploeg van groep A NIET rechtstreeks bewerken als beheerder", () =>
    assertFails(updateDoc(doc(b, "leidingsploegen", "leidingA"), { leden: [] }))
  );
  await test("anoniem stelt een correctie voor op leidingsploeg van groep A (blijft 'wacht op goedkeuring')", () =>
    assertSucceeds(updateDoc(doc(anon, "leidingsploegen", "leidingA"), { groepId: GROEP_A, takId: "tak1", werkingsjaarStart: 2023, leden: [], goedgekeurd: false }))
  );
  await test("anoniem kan zijn eigen correctie NIET meteen als goedgekeurd markeren", () =>
    assertFails(updateDoc(doc(anon, "leidingsploegen", "leidingA"), { groepId: GROEP_A, takId: "tak1", werkingsjaarStart: 2023, leden: [], goedgekeurd: true }))
  );
  await test("beheerder A keurt eigen leidingsploeg wel goed", () => assertSucceeds(updateDoc(doc(a, "leidingsploegen", "leidingA"), { goedgekeurd: true })));
  await test("anoniem kaapt leidingsploeg van groep A NIET door groepId te herschrijven naar groep B (document-id is voorspelbaar!)", () =>
    assertFails(updateDoc(doc(anon, "leidingsploegen", "leidingA"), { groepId: GROEP_B, takId: "tak1", werkingsjaarStart: 2023, leden: [], goedgekeurd: false }))
  );
  await test("beheerder A verplaatst eigen leidingsploeg niet stiekem naar groep B", () =>
    assertFails(updateDoc(doc(a, "leidingsploegen", "leidingA"), { groepId: GROEP_B }))
  );

  console.log("\n== dishes / links / scoutTakken / photoTags (eenvoudige groep-gebonden lijsten) ==");
  await test("iedereen leest gerechten-koppelingen", () => assertSucceeds(getDoc(doc(anon, "dishes", "dishA"))));
  await test("beheerder A wijzigt link van groep B NIET (bestaat niet eens, maar test cross-groep create)", () =>
    assertFails(setDoc(doc(a, "links", "linkVoorB"), { groepId: GROEP_B, naam: "x", url: "https://x", omschrijving: "" }))
  );
  await test("beheerder A maakt eigen tak aan", () => assertSucceeds(setDoc(doc(a, "scoutTakken", "takNieuwA"), { groepId: GROEP_A, naam: "Welpen" })));
  await test("beheerder A verplaatst eigen tak niet stiekem naar groep B", () =>
    assertFails(updateDoc(doc(a, "scoutTakken", "takA"), { groepId: GROEP_B }))
  );
  await test("anoniem maakt GEEN foto-tag-categorie aan", () => assertFails(setDoc(doc(anon, "photoTags", "tagNieuw"), { groepId: GROEP_A, naam: "x" })));

  console.log("\n== wijzigingsVoorstellen ==");
  await test("beheerder B leest wijzigingsvoorstel van groep A NIET", () => assertFails(getDoc(doc(b, "wijzigingsVoorstellen", "voorstelBestaandA"))));
  await test("anoniem stelt een wijziging voor op een bestaande, gepubliceerde fiche", () =>
    assertSucceeds(
      addDoc(collection(anon, "wijzigingsVoorstellen"), {
        groepId: GROEP_A, entryId: "entryA-published", status: "pending", email: "x@x.be",
        naam: "Jan Vernieuwd", geboortejaar: "", totemnaam: "", periode: "", leuksteActiviteit: [], besteKampplaats: [], lekkersteEten: [],
      })
    )
  );
  await test("anoniem stelt GEEN wijziging voor op een fiche van een andere groep dan opgegeven (groepId-mismatch)", () =>
    assertFails(
      addDoc(collection(anon, "wijzigingsVoorstellen"), {
        groepId: GROEP_B, entryId: "entryA-published", status: "pending", email: "x@x.be",
        naam: "x", geboortejaar: "", totemnaam: "", periode: "", leuksteActiviteit: [], besteKampplaats: [], lekkersteEten: [],
      })
    )
  );

  console.log("\n== organisaties (systeembeheerder-only) ==");
  await test("iedereen leest organisatiegegevens", () => assertSucceeds(getDoc(doc(anon, "organisaties", ORG_ID))));
  await test("beheerder A wijzigt organisatie NIET (systeembeheerder-only)", () => assertFails(updateDoc(doc(a, "organisaties", ORG_ID), { naam: "x" })));
  await test("beheerder A maakt GEEN organisatie-kenteken aan", () =>
    assertFails(setDoc(doc(a, "organisaties", `${ORG_ID}/kentekens`, "kNieuw"), { startJaar: 2024, jaarleuze: "x" }))
  );
  await test("systeembeheerder beheert organisatie-mijlpalen wel", () =>
    assertSucceeds(setDoc(doc(sys, "organisaties", `${ORG_ID}/mijlpalen`, "mNieuw"), { status: "published", jaar: 2024, titel: "x" }))
  );

  await testEnv.cleanup();

  console.log(`\n${pass} geslaagd, ${fail} gefaald.`);
  if (fail > 0) {
    console.error("\nGefaalde tests:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
