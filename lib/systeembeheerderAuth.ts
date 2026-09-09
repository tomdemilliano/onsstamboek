import "server-only";
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Verifieert dat het request een geldig ID-token draagt van een
 * systeembeheerder. Gebruikt door de systeembeheer-only API-routes onder
 * app/api/systeembeheer/. Bij een probleem is het teruggegeven object een
 * kant-en-klare Response (401/403) om meteen te returnen.
 */
export async function verifieerSysteembeheerder(request: NextRequest): Promise<{ uid: string } | Response> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Niet aangemeld." }, { status: 401 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.systeembeheerder !== true) {
      return Response.json({ error: "Enkel de systeembeheerder mag dit." }, { status: 403 });
    }
    return { uid: decoded.uid };
  } catch {
    return Response.json({ error: "Ongeldige sessie -- meld opnieuw aan." }, { status: 401 });
  }
}
