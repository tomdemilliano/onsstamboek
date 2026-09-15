"use client";

import { useCallback, useEffect, useState } from "react";
import { MailCampagneFactory } from "@/lib/dbSchema";

/**
 * Aantal bewaarde mailing-concepten van een groep, voor het badge-je op
 * de "Concepten"-tab in de Mailing-module. Geeft ook een `herlaad`-functie
 * terug, zodat een pagina die zelf een concept bewaart/verwijdert (zonder
 * daarbij te navigeren) de teller meteen kan bijwerken i.p.v. te wachten
 * op een volgend bezoek aan deze tab.
 */
export function useConceptenAantal(groepId: string): { aantal: number; herlaad: () => void } {
  const [aantal, setAantal] = useState(0);

  const herlaad = useCallback(() => {
    let actief = true;
    MailCampagneFactory.getAll(groepId).then((campagnes) => {
      if (actief) setAantal(campagnes.filter((c) => c.status === "concept").length);
    });
    return () => {
      actief = false;
    };
  }, [groepId]);

  useEffect(() => herlaad(), [herlaad]);

  return { aantal, herlaad };
}
