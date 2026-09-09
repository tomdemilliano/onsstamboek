// Verwijdert een groep volledig en onomkeerbaar: alle groep-gebonden
// Firestore-documenten, alle Storage-bestanden onder groepen/{groepId}/,
// de lidmaatschappen, en (voor gebruikers die daardoor nergens anders meer
// beheerder van zijn) het Firebase Auth-account zelf. Enkel de
// systeembeheerder mag dit -- geen groepsbeheerder-uitzondering, dit is
// bewust geen "isBeheerderVan"-actie.
//
// Gebruikt de Admin SDK (bypassed firestore.rules/storage.rules volledig)
// omdat dit over tientallen collecties + Storage + Auth heen gaat -- met de
// client-SDK zou dat per collectie een aparte, foutgevoelige rule-uitzondering
// vergen, voor iets dat toch al enkel server-side, achter een geverifieerde
// systeembeheerder-token hoort te draaien.

import { NextRequest } from "next/server";
import { adminAuth, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";

// Elke top-level collectie die een `groepId`-veld draagt. `milestones` bevat
// zowel groep- als organisatie-mijlpalen, maar enkel groep-mijlpalen hebben
// een `groepId` (organisatie-mijlpalen zitten in een aparte subcollectie),
// dus de query hieronder raakt daar nooit iets verkeerds.
const GROEP_GEBONDEN_COLLECTIES = [
  "entries",
  "locations",
  "extraLocations",
  "dishes",
  "links",
  "photoTags",
  "scoutTakken",
  "leidingsploegen",
  "milestones",
  "photos",
  "statistieken",
  "contactBerichten",
  "activiteiten",
  "wijzigingsVoorstellen",
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Niet aangemeld." }, { status: 401 });
  }

  let systeembeheerder = false;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    systeembeheerder = decoded.systeembeheerder === true;
  } catch {
    return Response.json({ error: "Ongeldige sessie -- meld opnieuw aan." }, { status: 401 });
  }
  if (!systeembeheerder) {
    return Response.json({ error: "Enkel de systeembeheerder mag een groep verwijderen." }, { status: 403 });
  }

  const { groepId } = (await request.json().catch(() => null)) || {};
  if (!groepId || typeof groepId !== "string") {
    return Response.json({ error: "groepId is verplicht." }, { status: 400 });
  }

  const groepRef = adminDb.collection("groepen").doc(groepId);
  const groepSnap = await groepRef.get();
  if (!groepSnap.exists) {
    return Response.json({ error: "Groep niet gevonden." }, { status: 404 });
  }
  const groepNaam = (groepSnap.data()?.naam as string) || groepId;

  try {
    const writer = adminDb.bulkWriter();
    let aantalDocumenten = 0;

    for (const collectie of GROEP_GEBONDEN_COLLECTIES) {
      const snap = await adminDb.collection(collectie).where("groepId", "==", groepId).get();
      snap.docs.forEach((d) => {
        writer.delete(d.ref);
        aantalDocumenten += 1;
      });
    }

    // Lidmaatschappen apart: eerst de betrokken userId's verzamelen, voor
    // de gebruikers-opkuis hieronder -- dan pas de documenten zelf wissen.
    const lidmaatschapSnap = await adminDb.collection("lidmaatschappen").where("groepId", "==", groepId).get();
    const userIds = Array.from(new Set(lidmaatschapSnap.docs.map((d) => d.data().userId as string)));
    lidmaatschapSnap.docs.forEach((d) => {
      writer.delete(d.ref);
      aantalDocumenten += 1;
    });

    writer.delete(groepRef);
    aantalDocumenten += 1;

    await writer.close();

    // Storage: alle bestanden van deze groep in één keer weg. `force: true`
    // zorgt dat één kapot/ontbrekend bestand de rest niet blokkeert.
    try {
      await adminStorageBucket.deleteFiles({ prefix: `groepen/${groepId}/`, force: true });
    } catch (err) {
      console.error(`verwijder-groep: Storage-opkuis voor ${groepId} deels mislukt:`, err);
    }

    // Gebruikers die enkel via déze groep een lidmaatschap hadden: hun
    // Firebase Auth-account verwijderen. Nooit een systeembeheerder-account
    // aanraken, ook niet als die toevallig ook groepsbeheerder was hier.
    let aantalGebruikersVerwijderd = 0;
    for (const userId of userIds) {
      try {
        const overigeLidmaatschappen = await adminDb
          .collection("lidmaatschappen")
          .where("userId", "==", userId)
          .limit(1)
          .get();
        if (!overigeLidmaatschappen.empty) continue;

        const user = await adminAuth.getUser(userId);
        if (user.customClaims?.systeembeheerder === true) continue;

        await adminAuth.deleteUser(userId);
        aantalGebruikersVerwijderd += 1;
      } catch (err) {
        console.error(`verwijder-groep: opkuis van gebruiker ${userId} mislukt:`, err);
      }
    }

    return Response.json({
      groep: groepNaam,
      documenten: aantalDocumenten,
      gebruikersVerwijderd: aantalGebruikersVerwijderd,
    });
  } catch (err) {
    console.error("verwijder-groep mislukt:", err);
    return Response.json({ error: "Verwijderen is mislukt, probeer opnieuw." }, { status: 500 });
  }
}
