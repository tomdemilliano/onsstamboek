// Eén gebruiker activeren/deactiveren, de systeembeheerder-rol toekennen/
// intrekken, of volledig verwijderen. Enkel de systeembeheerder mag dit,
// en nooit deactiveren/de eigen systeembeheerder-rol intrekken/verwijderen
// op het eigen account (dat zou een systeembeheerder zichzelf kunnen laten
// buitensluiten).

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifieerSysteembeheerder } from "@/lib/systeembeheerderAuth";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/systeembeheer/gebruikers/[uid]">) {
  const auth = await verifieerSysteembeheerder(request);
  if (auth instanceof Response) return auth;
  const { uid } = await ctx.params;

  const body = (await request.json().catch(() => null)) || {};

  if (typeof body.disabled === "boolean") {
    if (uid === auth.uid) {
      return Response.json({ error: "Je kan jezelf niet deactiveren." }, { status: 400 });
    }
    try {
      await adminAuth.updateUser(uid, { disabled: body.disabled });
      if (body.disabled) {
        // Zonder dit blijft een reeds uitgegeven ID-token nog geldig tot het
        // op natuurlijke wijze verloopt -- de deactivatie moet onmiddellijk
        // effect hebben.
        await adminAuth.revokeRefreshTokens(uid);
      }
    } catch (err) {
      console.error(`gebruiker ${body.disabled ? "deactiveren" : "activeren"} mislukt voor ${uid}:`, err);
      return Response.json({ error: "Wijzigen van de gebruiker is mislukt." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  if (typeof body.systeembeheerder === "boolean") {
    if (!body.systeembeheerder && uid === auth.uid) {
      return Response.json({ error: "Je kan je eigen systeembeheerder-rol niet intrekken." }, { status: 400 });
    }
    try {
      const gebruiker = await adminAuth.getUser(uid);
      await adminAuth.setCustomUserClaims(uid, { ...gebruiker.customClaims, systeembeheerder: body.systeembeheerder });
      if (!body.systeembeheerder) {
        // Idem als bij deactiveren: forceer dat een reeds uitgegeven token
        // niet nog even geldig blijft met de oude, te ruime rol.
        await adminAuth.revokeRefreshTokens(uid);
      }
    } catch (err) {
      console.error(`systeembeheerder-rol wijzigen mislukt voor ${uid}:`, err);
      return Response.json({ error: "Wijzigen van de rol is mislukt." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "disabled of systeembeheerder (boolean) is verplicht." }, { status: 400 });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/systeembeheer/gebruikers/[uid]">) {
  const auth = await verifieerSysteembeheerder(request);
  if (auth instanceof Response) return auth;
  const { uid } = await ctx.params;

  if (uid === auth.uid) {
    return Response.json({ error: "Je kan jezelf niet verwijderen." }, { status: 400 });
  }

  try {
    const lidmaatschapSnap = await adminDb.collection("lidmaatschappen").where("userId", "==", uid).get();
    const writer = adminDb.bulkWriter();
    lidmaatschapSnap.docs.forEach((d) => writer.delete(d.ref));
    await writer.close();

    await adminAuth.deleteUser(uid);
  } catch (err) {
    console.error(`gebruiker verwijderen mislukt voor ${uid}:`, err);
    return Response.json({ error: "Verwijderen is mislukt." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
