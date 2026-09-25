import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Entry, Groep, Leidingsploeg, Photo, ScoutTak, WithId } from "@/types/models";

export interface DeelkaartLeiding {
  takNaam: string;
  werkingsjaarStart: number;
}

export interface DeelkaartData {
  entry: WithId<Entry>;
  groep: WithId<Groep>;
  gebruiktDas: boolean;
  leiding: DeelkaartLeiding[];
  fotoUrls: string[];
  fotoAantal: number;
  fotoVroegsteJaar: number | null;
  fotoLaatsteJaar: number | null;
}

/**
 * Alle data voor de deelbare "Mijn Stamboek-kaart" van een lid, gedeeld
 * tussen app/api/deelkaart/[entryId]/route.ts (de afbeelding zelf) en
 * app/[groep]/(public)/entry/[id]/kaart/page.tsx (generateMetadata +
 * notFound-validatie), zodat de validatie- en ophaal-logica niet dubbel
 * onderhouden moet worden. Gebruikt bewust de Admin SDK i.p.v. de client-
 * Firestore-SDK -- deze functie draait uitsluitend server-side, en alle
 * geraadpleegde data (entries met status published/stub, gepubliceerde
 * photos, leidingsploegen, groepen/organisaties) is toch al onvoorwaardelijk
 * publiek leesbaar volgens firestore.rules.
 */
export async function haalDeelkaartData(entryId: string): Promise<DeelkaartData | null> {
  const entrySnap = await adminDb.collection("entries").doc(entryId).get();
  if (!entrySnap.exists) return null;
  const entry = { id: entrySnap.id, ...(entrySnap.data() as Entry) };
  if (entry.status !== "published" && entry.status !== "stub") return null;

  const groepSnap = await adminDb.collection("groepen").doc(entry.groepId).get();
  if (!groepSnap.exists) return null;
  const groep = { id: groepSnap.id, ...(groepSnap.data() as Groep) };

  let gebruiktDas = true;
  if (groep.organisatieId) {
    const orgSnap = await adminDb.collection("organisaties").doc(groep.organisatieId).get();
    if (orgSnap.exists) gebruiktDas = (orgSnap.data()?.gebruiktDas as boolean | undefined) ?? true;
  }

  const [leidingSnap, takkenSnap, fotoSnap] = await Promise.all([
    adminDb.collection("leidingsploegen").where("groepId", "==", entry.groepId).get(),
    adminDb.collection("scoutTakken").where("groepId", "==", entry.groepId).get(),
    adminDb.collection("photos").where("groepId", "==", entry.groepId).where("status", "==", "published").get(),
  ]);

  const takNamen = new Map<string, string>();
  takkenSnap.docs.forEach((d) => takNamen.set(d.id, (d.data() as ScoutTak).naam));

  const leiding = leidingSnap.docs
    .map((d) => d.data() as Leidingsploeg)
    .filter((l) => (l.leden || []).some((lid) => lid.entryId === entryId))
    .map((l) => ({ takNaam: takNamen.get(l.takId) || "onbekende tak", werkingsjaarStart: l.werkingsjaarStart }))
    .sort((a, b) => b.werkingsjaarStart - a.werkingsjaarStart);

  const fotos = fotoSnap.docs.map((d) => d.data() as Photo).filter((f) => (f.taggedEntryIds || []).includes(entryId));
  const jaren = fotos.map((f) => f.jaar).filter((j): j is number => typeof j === "number");
  const fotoUrls = fotos
    .slice()
    .sort((a, b) => (a.jaar ?? 9999) - (b.jaar ?? 9999))
    .slice(0, 2)
    .map((f) => f.afbeeldingUrl);

  return {
    entry,
    groep,
    gebruiktDas,
    leiding,
    fotoUrls,
    fotoAantal: fotos.length,
    fotoVroegsteJaar: jaren.length ? Math.min(...jaren) : null,
    fotoLaatsteJaar: jaren.length ? Math.max(...jaren) : null,
  };
}
