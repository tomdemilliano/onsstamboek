import "server-only";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * Verifieert dat het request een geldig ID-token draagt van een
 * systeembeheerder, of van een groepsbeheerder van déze specifieke groep
 * (een `lidmaatschappen/{uid}_{groepId}`-document). Zelfde patroon als
 * lib/systeembeheerderAuth.ts, maar dan groep-specifiek -- gebruikt door
 * app/api/feedback. Bij een probleem is het teruggegeven object een
 * kant-en-klare Response (401/403) om meteen te returnen.
 */
export async function verifieerGroepsbeheerder(request: NextRequest, groepId: string): Promise<{ uid: string } | Response> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Niet aangemeld." }, { status: 401 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.systeembeheerder === true) {
      return { uid: decoded.uid };
    }
    const lidmaatschap = await adminDb.collection("lidmaatschappen").doc(`${decoded.uid}_${groepId}`).get();
    if (!lidmaatschap.exists) {
      return Response.json({ error: "Enkel een beheerder van deze groep mag dit." }, { status: 403 });
    }
    return { uid: decoded.uid };
  } catch {
    return Response.json({ error: "Ongeldige sessie -- meld opnieuw aan." }, { status: 401 });
  }
}
