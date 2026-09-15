import { EntryFactory, LocationFactory, ExtraLocationFactory, GroepMijlpaalFactory, LinkFactory, PhotoFactory, WijzigingFactory, ContactFactory, LeidingFactory } from "@/lib/dbSchema";

/**
 * Gedeelde ruwe data-ophaling voor het groepsbeheer -- gebruikt door zowel
 * het Dashboard (app/[groep]/beheer/page.tsx, voor de "Te behandelen"-lijst
 * en statistieken) als lib/useAdminBadgeCounts.ts (voor de tellers op de
 * hoofdnavigatie). Zonder deze bundeling zou elke /beheer/*-paginabezoek
 * dezelfde collecties dubbel ophalen, want de navigatie met zijn badges
 * staat voortaan op elke beheerpagina. `StatsFactory` (bezoekstatistieken)
 * hoort hier niet bij -- die blijft dashboard-only.
 */
export async function fetchAdminOverzichtData(groepId: string) {
  const [entries, locaties, extraLocaties, mijlpalen, links, fotos, wijzigingen, contactBerichten, leidingsploegen] = await Promise.all([
    EntryFactory.getAll(groepId),
    LocationFactory.getAll(groepId),
    ExtraLocationFactory.getAllAdmin(groepId),
    GroepMijlpaalFactory.getAllAdmin(groepId),
    LinkFactory.getAll(groepId),
    PhotoFactory.getAllAdmin(groepId),
    WijzigingFactory.getAll(groepId),
    ContactFactory.getAll(groepId),
    LeidingFactory.getAll(groepId),
  ]);
  return { entries, locaties, extraLocaties, mijlpalen, links, fotos, wijzigingen, contactBerichten, leidingsploegen };
}

export type AdminOverzichtData = Awaited<ReturnType<typeof fetchAdminOverzichtData>>;
