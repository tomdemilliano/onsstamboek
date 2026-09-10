# Architectuur — Ons Stamboek

Dit document geeft een overzicht van alle componenten, hun onderlinge
verbindingen en de infrastructuur waarop **Ons Stamboek** draait: een
multi-tenant platform waarop scoutsgroepen een digitaal
"vriendenboekje" bijhouden. Voor implementatiedetails per onderdeel,
zie de verwijzingen naar bestanden/mappen in de tekst.

## 1. Overzicht in één oogopslag

```
Bezoeker/beheerder (browser)
        │  HTTPS
        ▼
  onsstamboek.be / www.onsstamboek.be   ← domein, DNS bij Combell
        │
        ▼
   Vercel  (hosting + build + edge/CDN)
        │  draait de Next.js-app (App Router, TypeScript)
        │
        ├─── Server Components / Route Handlers ──► Firebase Admin SDK ──► Firebase-project
        ├─── Client Components ───────────────────► Firebase Client SDK ──► Firebase-project
        ├─── app/api/extract-scan ────────────────► Anthropic API (Claude, OCR van scans)
        └─── app/api/systeembeheer/gebruikers ────► Resend API (uitnodigingsmails)

Firebase-project
  ├─ Authentication   (e-mail/wachtwoord, custom claim "systeembeheerder")
  ├─ Firestore        (1 gedeelde database, multi-tenant via groepId/organisatieId)
  └─ Storage          (bestanden per groep/organisatie, publiek leesbaar)
```

Er is **één Next.js-applicatie** die zowel de publieke site, het
groepsbeheer als het systeembeheer bedient — geen aparte backend-service.
Alle "backend"-logica zit in Next.js Route Handlers (`app/api/**`) en in
Firestore/Storage **Security Rules**, niet in een apart server-proces.

## 2. Domein & DNS

- **Domeinnaam**: `onsstamboek.be` / `www.onsstamboek.be`.
- **Geregistreerd/gehost bij**: **Combell**. Combell beheert de DNS-zone
  van het domein; het A/CNAME-record daar wijst naar Vercel, zodat
  Vercel de eigenlijke SSL-certificaten en routing voor het domein
  verzorgt.
- **Cutover-status**: dit domein wees historisch naar het Vercel-project
  van de oudere, single-tenant voorloper-app
  (`sinteduardusscouts4ever`); de omleg naar het huidige multi-tenant
  platform gebeurt door de domeinkoppeling in Vercel te verplaatsen naar
  dit project (geen DNS-wijziging bij Combell nodig zolang het record al
  naar Vercel's infrastructuur wijst).
- **Resend** (transactionele e-mail, zie §6) vereist eigen DNS-records
  (SPF/DKIM) op hetzelfde domein bij Combell om `onsstamboek.be` als
  verzenddomein te verifiëren.
- **Firebase Authentication → Authorized domains** moet `onsstamboek.be`
  (en tijdens ontwikkeling het `*.vercel.app`-previewdomein) bevatten,
  anders werken wachtwoord-instellinks uit uitnodigingsmails niet.

## 3. Hosting & deployment (Vercel)

- **Vercel** bouwt en host de Next.js-app (App Router, Turbopack-build),
  gekoppeld aan de GitHub-repo `onsstamboek` (productie-branch `main`).
- Elke push naar een branch krijgt een preview-deployment op een eigen
  `*.vercel.app`-adres; pushes naar `main` gaan naar productie.
- Alle geheimen en configuratie (Firebase-config, Anthropic- en
  Resend-API-sleutels) staan als **Vercel Environment Variables**, nooit
  in de repo. Zie `.env.example` voor de volledige lijst.
- Vercel levert ook de SSL-certificaten voor het gekoppelde domein.

## 4. Applicatielaag (Next.js App Router + TypeScript)

### 4.1 Routestructuur

```
app/
  page.tsx                          Platform-landing + groepskeuze
  aanmelden/                        Login
  contact/                          Contact met de platformbeheerder
  voorwaarden/                      Gebruiksvoorwaarden (groepsbeheerders)
  wachtwoord-instellen/             Afronden van een uitnodiging (oobCode-flow)

  [groep]/                          Alles binnen de context van één groep
    layout.tsx                       Laadt de groep op slug, 404 bij onbekende/inactieve groep
    (public)/                        Publieke groep-pagina's (vriendenboekje, fotos,
                                      tijdlijn, links, kampplaatsen, contact, over-de-groep, ...)
    beheer/                          Groepsbeheer, achter RequireGroepsbeheerder-guard
      instellingen/                  Groepsgegevens (naam, logo, contact...)
      vriendenboek/, fotos/, tijdlijn/, links/, gerechten/, kampplaatsen/,
      contact/, activiteit/, handleiding/

  systeembeheer/                    Platformbreed beheer, systeembeheerder-only
    gebruikers/                      Gebruikers uitnodigen/beheren
    groepen/[id]/                    Groepen aanmaken/beheren, groepsbeheerders koppelen
    organisaties/[id]/kentekens/     Organisatiebrede jaarkentekens
    organisaties/[id]/mijlpalen/     Organisatiebrede (scouting-)mijlpalen
    contact/                         Binnengekomen contactberichten

  api/                              Route Handlers (server-side)
    extract-scan/                    OCR van een ingescand vriendenboekje-formulier (Anthropic)
    proxy-image/                     Beperkte image-proxy (enkel Firebase Storage-host)
    systeembeheer/gebruikers/        Gebruiker uitnodigen/beheren (Admin SDK + Resend)
    systeembeheer/lidmaatschap/      Groepsbeheerder toe/afwijzen aan een groep
    systeembeheer/verwijder-groep/   Groep + bijhorende data verwijderen
```

### 4.2 Toegangscontrole (guards)

- **`[groep]/layout.tsx`**: haalt de groep op via `GroepFactory.getBySlug`
  en toont een 404 als de slug niet bestaat of de groep niet `actief` is.
  Voegt de groep toe aan een React Context (`GroepProvider`,
  `lib/groepContext.tsx`) die alle onderliggende pagina's gebruiken.
- **`[groep]/beheer/layout.tsx`**: wrapt alle groepsbeheerpagina's in
  `<RequireGroepsbeheerder>` — controleert client-side of de ingelogde
  gebruiker een `lidmaatschappen`-document heeft voor déze groep (of
  systeembeheerder is), en stuurt anders naar `/aanmelden`. Eén centrale
  guard in plaats van een check per pagina.
- **`systeembeheer/`**: eigen guard-component die enkel het
  `systeembeheerder`-custom-claim toelaat.
- De echte, doorslaggevende controle gebeurt altijd **server-side** in
  Firestore/Storage Security Rules en in de Route Handlers (die het
  Firebase ID-token verifiëren via de Admin SDK) — de client-side guards
  zijn UX (nette redirects), geen beveiligingsgrens op zich.

### 4.3 Belangrijke lib-modules

| Bestand | Rol |
|---|---|
| `lib/firebase.ts` | Firebase **client**-SDK-initialisatie (Auth, Firestore, Storage) |
| `lib/firebaseAdmin.ts` | Firebase **Admin**-SDK-initialisatie, enkel server-side (`server-only`) |
| `lib/adminCredential.ts` | Leest het service-account (volledige JSON-blob of 3 losse env vars) |
| `lib/dbSchema.ts` | "Factory"-patroon: één object per Firestore-collectie met alle CRUD-functies |
| `lib/auth.ts` | Login/logout/wachtwoord-reset, `isSysteembeheerder()`-check |
| `lib/groepContext.tsx` | React Context die de huidige groep doorgeeft aan alle child-componenten |
| `lib/groepCookie.ts` | Onthoudt de laatst bezochte groep (leesbare cookie, geen gevoelige data) |
| `lib/scanExtract.ts` / `app/api/extract-scan` | OCR-flow: scan → Anthropic API → gestructureerde velden |
| `lib/resend.ts` | Verzendt uitnodigingsmails via Resend |
| `lib/fotoUtils.ts` | Client-side her-encodering van elke upload naar JPEG via canvas (zie §7, XSS-verdediging) |
| `lib/voorwaarden.ts` | Bijhoudt of een groepsbeheerder de gebruiksvoorwaarden aanvaard heeft |

## 5. Datalaag (Firebase)

Één Firebase-project, drie diensten:

### 5.1 Authentication

- Provider: **e-mail/wachtwoord**.
- Twee rollen, twee verschillende mechanismen:
  - **Systeembeheerder**: een Firebase Auth **custom claim**
    (`systeembeheerder: true`), enkel te zetten via de Admin SDK
    (`scripts/setSysteembeheerder.ts`, ook bruikbaar via een
    GitHub Actions-workflow, zie §8).
  - **Groepsbeheerder**: **geen** custom claim, maar een document in de
    `lidmaatschappen`-collectie (`{userId, groepId, rol}`) — zo kan één
    gebruiker beheerder zijn van meerdere groepen, wat met de kleine,
    statische custom-claims niet praktisch zou zijn.
- Uitnodigen van nieuwe gebruikers gaat via de Admin SDK
  (`generatePasswordResetLink`) + Resend, niet via zelfregistratie.

### 5.2 Firestore — één gedeelde database, multi-tenant

Geen aparte database per groep; elk document draagt een `groepId` (of
`organisatieId` voor bewegingsbrede content). De belangrijkste
collecties (zie `types/models.ts` en `lib/dbSchema.ts`):

```
organisaties/{id}                     naam, logo
organisaties/{id}/kentekens/{id}      jaarkentekens (bewegingsbreed)
organisaties/{id}/mijlpalen/{id}      scouting-mijlpalen (bewegingsbreed)
organisaties/{id}/takkenSjabloon/{id} sjabloon voor nieuwe groepen

groepen/{id}                          naam, slug, gemeente, contact, logo, status, organisatieId
lidmaatschappen/{userId_groepId}      rolkoppeling (groepsbeheerder)

entries/{id}            + groepId     vriendenboekje-fiches
photos/{id}              + groepId    foto's (status pending/published)
photoTags/{id}           + groepId    tags op foto's
milestones/{id}          + groepId    groep-mijlpalen (naast organisatie-mijlpalen)
scoutTakken/{id}         + groepId    takken van de groep
leidingsploegen/{id}     + groepId    leiding per tak/werkingsjaar
locations/{id}           + groepId    kampplaatsen (per groep, geen gedeelde catalogus)
extraLocations/{id}      + groepId    door bezoekers voorgestelde locaties
links/{id}               + groepId    nuttige links
dishes/{id}              + groepId    gerechten/recepten
statistieken/{id}        + groepId    bezoekstatistieken
contactBerichten/{id}    + groepId    contactformulier per groep
activiteiten/{id}        + groepId    activiteitenlog
wijzigingsVoorstellen/{id} + groepId  door bezoekers voorgestelde wijzigingen
```

**Crowdsourcing-patroon**, consistent toegepast op alle publiek
aanvulbare collecties (foto's, fiches, leidingsploegen, locaties,
wijzigingsvoorstellen): een niet-ingelogde bezoeker kan aanmaken, maar
altijd geforceerd in status `draft`/`pending`/`stub`; pas na
goedkeuring door een groepsbeheerder krijgt een document status
`published` en wordt het publiek zichtbaar.

### 5.3 Security Rules (de eigenlijke toegangscontrolelaag)

- **`firestore.rules`**: per collectie — publiek lezen enkel bij
  `status == 'published'`, publiek aanmaken met geforceerde
  draft/pending-status, wijzigen/verwijderen beheerder-only via
  `isBeheerderVan(groepId)` (= `isGroepsbeheerderVan` **of**
  `isSysteembeheerder`). Elke schrijfregel dwingt af dat `groepId` niet
  gewijzigd kan worden (`groepIdOngewijzigd()`), en URL-velden worden
  serverside gevalideerd (`urlVeilig()`) tegen `javascript:`-injectie.
  Automatisch getest tegen de Firestore-emulator
  (`scripts/testFirestoreRules.ts`, `npm run test:rules`).
- **`storage.rules`**: publiek lezen, geauthenticeerd + lidmaatschap (of
  systeembeheerder) schrijven, met een uitzondering voor de publieke
  foto-upload (niet ingelogd, wel beperkt tot een expliciete
  contenttype-allowlist en een groottelimiet) — zie §7 voor de
  beveiligingsoverwegingen hierachter. Automatisch getest
  (`scripts/testStorageRules.ts`, `npm run test:rules:storage`).

### 5.4 Storage

Bestanden per groep en per organisatie, gescheiden per pad in plaats
van per bucket:

```
groepen/{groepId}/fotos/...       publiek inzendbare foto's
groepen/{groepId}/scans/...       ingescande vriendenboekje-formulieren (beheerder-only upload)
organisaties/{organisatieId}/...  kentekens, scouting-mijlpalen (systeembeheerder-only upload)
```

## 6. Externe diensten

| Dienst | Gebruikt voor | Waar |
|---|---|---|
| **Anthropic API (Claude)** | OCR: leest een ingescand/gefotografeerd papieren vriendenboekje-formulier uit tot gestructureerde velden | `app/api/extract-scan/route.ts` |
| **Resend** | Verstuurt de uitnodigingsmail (met wachtwoord-instellink) wanneer een systeembeheerder een nieuwe gebruiker aanmaakt | `app/api/systeembeheer/gebruikers/route.ts`, `lib/resend.ts` |
| **Combell** | Domeinregistratie + DNS-hosting van `onsstamboek.be` (A/CNAME naar Vercel, SPF/DKIM voor Resend) | buiten de repo, Combell-beheerpaneel |

## 7. Beveiligingsoverwegingen (samenvatting)

Volledige review: zie de projectgeschiedenis; kernpunten hier voor het
architectuuroverzicht:

- **Auth**: Firebase Auth regelt brute-force-bescherming en
  niet-enumererende foutmeldingen; alle API-routes verifiëren het
  ID-token server-side; geen pad waarlangs een gebruiker zelf het
  `systeembeheerder`-claim kan zetten.
- **XSS**: publieke foto-upload accepteert enkel een expliciete
  contenttype-allowlist (geen `image/svg+xml`, dat ingebed `<script>`
  zou kunnen bevatten); alle door beheerders ingevulde URL's
  (`receptUrl`, `links.url`) worden genormaliseerd naar een verplicht
  `http(s)`-schema (`lib/textUtils.ts: naarVeiligeUrl`), zowel
  client-side als nogmaals in `firestore.rules` als defense-in-depth.
- **Cross-tenant leakage** (grootste architecturale risico van dit
  multi-tenant model): elke schrijfregel in `firestore.rules` dwingt af
  dat `groepId` niet gewijzigd kan worden na aanmaak, en elke
  lees/schrijfregel gaat via `isBeheerderVan(groepId)` — automatisch
  getest met twee gelijktijdig actieve groepen in
  `scripts/testFirestoreRules.ts`.
- **`app/api/proxy-image`**: beperkt de proxy-doelhost tot
  `firebasestorage.googleapis.com`, wat SSRF/open-proxy-misbruik
  voorkomt.

## 8. Ontwikkel- en operationele workflows

- **Lokaal ontwikkelen**: `npm run dev`, met een `.env.local` op basis
  van `.env.example` (eigen Firebase-project, geen productiedata nodig).
- **Rules-tests**: `npm run test:rules` en `npm run test:rules:storage`
  draaien volledig tegen de lokale Firebase-emulator (Firestore +
  Storage), zonder een echt project of netwerkkost.
- **GitHub Actions** (`.github/workflows/`):
  - `set-systeembeheerder.yml`: zet het systeembeheerder-custom-claim op
    een gebruiker, met één repo-secret (`FIREBASE_SERVICE_ACCOUNT_KEY`)
    — bruikbaar zonder lokale terminal, rechtstreeks vanuit de
    GitHub-website.
  - `migrate.yml`: draait het eenmalige migratiescript
    (`scripts/migrate.ts`) dat data van de oude, single-tenant
    `sinteduardusscouts4ever`-app overzet naar dit platform (leest enkel
    uit het oude project, schrijft enkel naar het nieuwe).
- **Deployment**: automatisch via Vercel bij elke push (preview per
  branch, productie bij push naar `main`).

## 9. Relatie tot de voorloper-app

`onsstamboek` is een volledige herbouw van de single-tenant
`sinteduardusscouts4ever`-app (Pages Router, JavaScript) als
multi-tenant platform (App Router, TypeScript) — geen gedeelde
runtime-infrastructuur, geen gedeeld Firebase-project. De oude app blijft
(tijdelijk, als noodgreep) bereikbaar op haar eigen Vercel-project tot
het nieuwe platform bewezen stabiel draait op het echte domein, waarna
ze afgebouwd wordt (zie de aparte opkuis-planning: GitHub-repo
archiveren, Firestore/Storage van het oude project verwijderen, oude
Vercel-project verwijderen).
