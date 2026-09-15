"use client";

import { useEffect, useState } from "react";
import { fetchAdminOverzichtData } from "@/lib/adminOverzichtData";
import type { Entry, WithId } from "@/types/models";

export interface AdminBadgeCounts {
  vriendenboek: number;
  tijdlijn: number;
  fotos: number;
  kampplaatsen: number;
  contact: number;
}

const LEEG: AdminBadgeCounts = { vriendenboek: 0, tijdlijn: 0, fotos: 0, kampplaatsen: 0, contact: 0 };

/**
 * "Nog te behandelen"-tellingen voor de badges op de hoofdnavigatie
 * (components/AdminSidebar.tsx), gebaseerd op dezelfde ruwe data en
 * filters als het Dashboard (app/[groep]/beheer/page.tsx) al gebruikt
 * voor zijn "Te behandelen"-lijst -- via de gedeelde
 * lib/adminOverzichtData.ts, dus geen dubbele Firestore-reads.
 *
 * Kampplaatsen telt bewust enkel pending extra kampplaatsen, niet de
 * "nog niet gekoppeld aan de kaart"-melding van het Dashboard: dat laatste
 * is informatief, geen goed-/afkeuringsbeslissing -- een badge betekent
 * hier steeds "hier wacht een beslissing op je".
 */
export function useAdminBadgeCounts(groepId: string): AdminBadgeCounts {
  const [counts, setCounts] = useState<AdminBadgeCounts>(LEEG);

  useEffect(() => {
    let actief = true;
    fetchAdminOverzichtData(groepId).then(({ entries, extraLocaties, mijlpalen, fotos, wijzigingen, contactBerichten, leidingsploegen }) => {
      if (!actief) return;

      const isGoedTeKeuren = (e: WithId<Entry>) => e.status === "draft" || (e.status === "published" && e.goedgekeurd === false);

      setCounts({
        vriendenboek: entries.filter(isGoedTeKeuren).length + wijzigingen.length,
        tijdlijn: mijlpalen.filter((m) => m.status === "pending").length + leidingsploegen.filter((l) => l.goedgekeurd === false).length,
        fotos: fotos.filter((f) => f.status === "pending").length + fotos.filter((f) => f.status === "published" && f.verwijderVerzoek).length,
        kampplaatsen: extraLocaties.filter((l) => l.status === "pending").length,
        contact: contactBerichten.filter((b) => !b.gelezen).length,
      });
    });
    return () => {
      actief = false;
    };
  }, [groepId]);

  return counts;
}
