import { cert, type Credential } from "firebase-admin/app";

// Bewust GEEN `import "server-only"` hier: dit bestand wordt ook rechtstreeks
// via `tsx` in losstaande scripts gebruikt (scripts/migrate.ts,
// scripts/setSysteembeheerder.ts), buiten de Next.js-bundelaar om. De
// `server-only`-package werkt enkel als marker die webpack/Next herkent en
// wegfiltert -- buiten dat build-proces gooit het pakket zelf altijd een
// fout, dus zou elk script dat dit bestand importeert onmiddellijk crashen.
// `lib/firebaseAdmin.ts` (enkel gebruikt binnen de Next.js-server) behoudt
// die guard wel.

/**
 * Bouwt een Admin SDK-credential op uit omgevingsvariabelen, met twee
 * ondersteunde vormen:
 *
 * 1. `<PREFIX>SERVICE_ACCOUNT_KEY` -- de VOLLEDIGE, ongewijzigde inhoud van
 *    het gedownloade service-account-JSON-bestand. Aanbevolen: dit is de
 *    enige vorm die niet fout kan gaan bij het plakken in een tekstvak
 *    (bv. een GitHub-secret) -- er hoeft niets manueel aan de multi-line
 *    private key aangepast te worden, `JSON.parse` verwerkt de interne
 *    `\n`-escaping vanzelf correct.
 * 2. `<PREFIX>PROJECT_ID` + `<PREFIX>CLIENT_EMAIL` + `<PREFIX>PRIVATE_KEY`
 *    apart -- handig voor bv. Vercel-environment-variables, maar
 *    foutgevoelig bij het knippen/plakken van de private key alleen (zie
 *    hierboven). `\n` wordt hier omgezet naar een echte newline, voor het
 *    geval de waarde met letterlijke `\n`-tekens werd geplakt (zoals ze in
 *    het JSON-bestand zelf genoteerd staan).
 *
 * `prefix` laat toe om dit te hergebruiken voor meerdere service-accounts
 * in hetzelfde proces (zie scripts/migrate.ts, met `BRON_` en `DOEL_`).
 */
export function getAdminCredential(prefix: string = ""): Credential {
  const serviceAccountJson = process.env[`${prefix}SERVICE_ACCOUNT_KEY`];
  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  const projectId = process.env[`${prefix}PROJECT_ID`];
  const clientEmail = process.env[`${prefix}CLIENT_EMAIL`];
  const privateKey = process.env[`${prefix}PRIVATE_KEY`]?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin-credential ontbreekt: zet ofwel ${prefix}SERVICE_ACCOUNT_KEY (aanbevolen -- de volledige inhoud van het gedownloade service-account-JSON-bestand), ofwel alle drie ${prefix}PROJECT_ID, ${prefix}CLIENT_EMAIL en ${prefix}PRIVATE_KEY.`
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}
