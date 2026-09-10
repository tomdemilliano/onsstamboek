/**
 * Automatische testsuite voor storage.rules -- draait tegen de lokale
 * Firestore- + Storage-emulator (storage.rules verwijst via firestore.exists()
 * naar lidmaatschappen, dus beide emulators moeten samen lopen). Test vooral
 * de bevinding uit de security-review: kan iemand zonder aanmelden een
 * SVG-"foto" opladen (kan ingebed <script> bevatten, wordt uitgevoerd zodra
 * iemand de opgeslagen URL rechtstreeks opent)?
 *
 * Draai met: npm run test:rules:storage
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, deleteObject, getMetadata } from "firebase/storage";

const PROJECT_ID = "demo-onsstamboek-rules-test";
const GROEP_A = "groepA";
const GROEP_B = "groepB";
const ORG_ID = "orgX";
const UID_A = "beheerderA";
const UID_SYSTEEM = "systeembeheerder1";

const KLEINE_JPEG = new Uint8Array([1, 2, 3, 4]); // inhoud maakt niet uit, enkel size + contentType tellen voor de rules
const KWAADAARDIGE_SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.domain)</script></svg>');
const TE_GROOT = new Uint8Array(9 * 1024 * 1024); // 9MB > de toegelaten 8MB

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

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8085,
    },
    storage: {
      rules: fs.readFileSync(path.resolve(__dirname, "../storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "lidmaatschappen", `${UID_A}_${GROEP_A}`), { userId: UID_A, groepId: GROEP_A, rol: "groepsbeheerder" });
  });

  const a = testEnv.authenticatedContext(UID_A).storage();
  const sys = testEnv.authenticatedContext(UID_SYSTEEM, { systeembeheerder: true }).storage();
  const anon = testEnv.unauthenticatedContext().storage();

  console.log("\n== publieke foto-upload (groepen/{groepId}/fotos) ==");
  await test("anoniem laadt een gewone jpeg-foto op", () =>
    assertSucceeds(uploadBytes(ref(anon, `groepen/${GROEP_A}/fotos/ok.jpg`), KLEINE_JPEG, { contentType: "image/jpeg" }))
  );
  await test("anoniem kan GEEN svg opladen (kan ingebed <script> bevatten -- stored-XSS-risico)", () =>
    assertFails(uploadBytes(ref(anon, `groepen/${GROEP_A}/fotos/kwaadaardig.svg`), KWAADAARDIGE_SVG, { contentType: "image/svg+xml" }))
  );
  await test("anoniem kan geen html-bestand opladen door zich als afbeelding voor te doen", () =>
    assertFails(uploadBytes(ref(anon, `groepen/${GROEP_A}/fotos/kwaadaardig.html`), KWAADAARDIGE_SVG, { contentType: "text/html" }))
  );
  await test("anoniem kan geen foto van meer dan 8MB opladen", () =>
    assertFails(uploadBytes(ref(anon, `groepen/${GROEP_A}/fotos/tegroot.jpg`), TE_GROOT, { contentType: "image/jpeg" }))
  );
  await test("anoniem kan een gepubliceerde foto niet verwijderen", () => assertFails(deleteObject(ref(anon, `groepen/${GROEP_A}/fotos/ok.jpg`))));
  await test("beheerder A kan een foto van groep A wel verwijderen", () => assertSucceeds(deleteObject(ref(a, `groepen/${GROEP_A}/fotos/ok.jpg`))));

  console.log("\n== overige groep-bestanden (scans, mijlpalen, welkomstfoto...) ==");
  await test("anoniem kan GEEN scan uploaden (enkel beheerder, geen publiek pad hiervoor)", () =>
    assertFails(uploadBytes(ref(anon, `groepen/${GROEP_A}/scans/entry1.jpg`), KLEINE_JPEG, { contentType: "image/jpeg" }))
  );
  await test("beheerder A uploadt wel een scan voor de eigen groep", () =>
    assertSucceeds(uploadBytes(ref(a, `groepen/${GROEP_A}/scans/entry1.jpg`), KLEINE_JPEG, { contentType: "image/jpeg" }))
  );
  await test("beheerder A uploadt NIET naar groep B (geen lidmaatschap daar)", () =>
    assertFails(uploadBytes(ref(a, `groepen/${GROEP_B}/scans/entry1.jpg`), KLEINE_JPEG, { contentType: "image/jpeg" }))
  );
  await test("iedereen leest groepsbestanden (publiek)", () => assertSucceeds(getMetadata(ref(anon, `groepen/${GROEP_A}/scans/entry1.jpg`))));

  console.log("\n== organisatiebestanden (systeembeheerder-only) ==");
  await test("beheerder A kan GEEN organisatiebestand uploaden", () =>
    assertFails(uploadBytes(ref(a, `organisaties/${ORG_ID}/kentekens/2024.png`), KLEINE_JPEG, { contentType: "image/png" }))
  );
  await test("systeembeheerder kan wel een organisatiebestand uploaden", () =>
    assertSucceeds(uploadBytes(ref(sys, `organisaties/${ORG_ID}/kentekens/2024.png`), KLEINE_JPEG, { contentType: "image/png" }))
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
