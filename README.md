# onsstamboek

Multi-vereniging vriendenboekje-platform voor scoutsgroepen -- de
opvolger van de single-tenant `sinteduardusscouts4ever`-app, met
ondersteuning voor meerdere groepen op één platform
(`onsstamboek.be/{groep}/...`).

Zie `Technisch.md` (nog te schrijven, naar analogie van de oude app) voor
een uitgebreide beschrijving zodra de eerste fases klaar zijn. Dit
document beschrijft voorlopig enkel wat je **buiten deze repo** moet
opzetten om lokaal te kunnen ontwikkelen en om live te gaan.

## Architectuur in het kort

- **Next.js App Router + TypeScript** (in tegenstelling tot de oude
  Pages Router + JavaScript-app).
- **Eén gedeelde Firestore-database**, elk groep-specifiek document
  draagt een `groepId`, elk organisatie-breed document (jaarkentekens,
  scouting-mijlpalen) draagt een `organisatieId`. Zie `types/models.ts`
  en `lib/dbSchema.ts`.
- **Rollen**: systeembeheerder via een Firebase Auth custom claim
  (`systeembeheerder: true`), groepsbeheerder via een document in de
  `lidmaatschappen`-collectie (`{userId, groepId, rol}`) -- zo kan één
  gebruiker beheerder zijn van meerdere groepen. Zie `firestore.rules`.
- **Routering**: alles publiek onder `/[groep]/...`, groep-beheer onder
  `/[groep]/beheer/...`, systeembeheer (organisatie-brede content) onder
  `/systeembeheer/...`.

## Lokaal ontwikkelen

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul de Firebase-config in
   (zie hieronder, "Firebase-project opzetten").
3. `npm run dev`

## Firebase-project opzetten (eenmalig, buiten deze repo)

Dit platform gebruikt een **nieuw, apart Firebase-project**, losgekoppeld
van het gedeelde "Winkelsimpel"-project achter de huidige, live
single-tenant app -- zo blijft die bestaande site volledig onaangeroerd.

1. Nieuw project aanmaken op [console.firebase.google.com](https://console.firebase.google.com).
2. **Firestore Database** activeren (standaard/default database volstaat,
   geen named database nodig zoals bij het oude project).
3. **Storage** activeren (nieuwe bucket).
4. **Authentication** activeren, provider **E-mail/wachtwoord** aanzetten.
5. Firebase-config kopiëren naar `.env.local` (Project Settings →
   Algemeen → "Je apps" → Web-app toevoegen → SDK-configuratie).
6. Een service-account-sleutel aanmaken (Project Settings → Service
   accounts → "Generate new private key") -- downloadt een JSON-bestand.
   Nodig voor het migratiescript en het systeembeheerder-scriptje.
   **Nooit committen.** Bewaar de **volledige, ongewijzigde inhoud** van
   dat bestand: dat is de waarde die je overal hieronder als
   `FIREBASE_SERVICE_ACCOUNT_KEY` gebruikt (zie ook `.env.example` en
   `lib/adminCredential.ts`) -- veel robuuster dan de private key apart
   te knippen/plakken, wat makkelijk fout gaat door de multi-line opmaak.
7. Rules deployen met de [Firebase CLI](https://firebase.google.com/docs/cli):
   ```
   firebase deploy --only firestore:rules,firestore:indexes,storage --project <jouw-project-id>
   ```
8. Minstens één systeembeheerder-account aanmaken: registreer/maak een
   Firebase Auth-gebruiker aan (via de Firebase Console, tabblad
   Authentication), en zet dan de custom claim. Dit kan op twee manieren:

   **Lokaal / via een terminal** (Cloud Shell kan ook, zonder iets lokaal
   te installeren):
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY='<volledige inhoud van het JSON-bestand>' \
     npm run set-systeembeheerder -- jouw@email.be
   ```

   **Via de GitHub-website** (geen terminal nodig) -- eenmalig instellen,
   nadien telkens met één klik te herhalen:
   1. Zet **één repo-secret**: GitHub → dit repo → Settings → Secrets
      and variables → Actions → "New repository secret" → naam
      `FIREBASE_SERVICE_ACCOUNT_KEY`, waarde = de volledige inhoud van
      het gedownloade JSON-bestand (open het bestand, selecteer alles,
      plak het in het secret-tekstvak -- niets aanpassen).
   2. Ga naar het tabblad **Actions** → workflow **"Set
      systeembeheerder"** → **"Run workflow"** → vul het e-mailadres in
      → **Run workflow**. Zie
      `.github/workflows/set-systeembeheerder.yml`.
9. Minstens één groep aanmaken (`groepen`-collectie) -- voorlopig
   handmatig via de Firebase Console of de systeembeheer-UI (self-service
   onboarding komt pas in een latere fase), en een `lidmaatschappen`-
   document voor de eerste groepsbeheerder(s).

## Migratie van de bestaande Sint-Eduardus-data

Zie `scripts/migrate.ts` -- vereist service-account-sleutels van zowel
het oude ("Winkelsimpel") als het nieuwe Firebase-project. Test dit eerst
tegen een lege/staging-versie van het nieuwe project. Details en
env-variabelen staan bovenaan het script zelf.

## Vercel (deployment)

1. Nieuw Vercel-project aanmaken, gekoppeld aan deze repo.
2. Environment variables instellen (Settings → Environment Variables):
   alle variabelen uit `.env.example`, met de waarden van het **nieuwe**
   Firebase-project (niet hergebruiken van de oude app).
3. Voorlopig draait dit op het automatische `*.vercel.app`-adres van dit
   nieuwe project -- **nog geen domeinwijziging**.

### Domein-cutover (pas na volledige tests)

Het domein `onsstamboek.be` (Combell) wijst vandaag naar het Vercel-
project van de **huidige, live** single-tenant app. Pas wanneer dit
nieuwe platform grondig getest is met minstens twee gelijktijdig actieve
groepen, wordt het A/CNAME-record in Vercel overgezet naar dit nieuwe
project. Tot dan blijft de huidige site op `onsstamboek.be` gewoon
actief en onaangeroerd.
