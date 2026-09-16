"use client";

import { useEffect, useState } from "react";
import { OrganisatieFactory } from "@/lib/dbSchema";

const STANDAARD = { takEnkelvoud: "tak", takMeervoud: "takken", gebruiktDas: true };

/**
 * Gedeelde instellingen van de organisatie waaraan een groep gekoppeld is:
 * de tak-terminologie (levend, kan door een systeembeheerder op elk moment
 * gewijzigd worden) en of er een das gebruikt wordt. Zonder gekoppelde
 * organisatie gelden meteen de standaardwaarden, zonder fetch.
 *
 * Let op: `app/[groep]/beheer/instellingen/page.tsx` gebruikt deze hook
 * bewust NIET -- die pagina heeft de organisatielijst al in memory (voor de
 * organisatie-<select>) en moet reageren op de live, nog niet opgeslagen
 * dropdown-selectie, niet op het al opgeslagen `groep.organisatieId`.
 */
export function useOrganisatieInstellingen(organisatieId: string | null | undefined): {
  takEnkelvoud: string;
  takMeervoud: string;
  gebruiktDas: boolean;
  loading: boolean;
} {
  const [instellingen, setInstellingen] = useState(STANDAARD);
  const [loading, setLoading] = useState(!!organisatieId);

  // Meteen terugvallen op de standaardwaarden zodra organisatieId wegvalt
  // (of wisselt) -- aangepast tijdens het renderen bij die wijziging,
  // i.p.v. in een effect, zodat er geen kort ogenblik met de vorige
  // organisatie se instellingen zichtbaar is.
  const [vorigeOrganisatieId, setVorigeOrganisatieId] = useState(organisatieId);
  if (organisatieId !== vorigeOrganisatieId) {
    setVorigeOrganisatieId(organisatieId);
    if (!organisatieId) {
      setInstellingen(STANDAARD);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!organisatieId) return;
    let actief = true;
    OrganisatieFactory.getById(organisatieId).then((org) => {
      if (!actief) return;
      setInstellingen({
        takEnkelvoud: org?.takBenamingEnkelvoud || STANDAARD.takEnkelvoud,
        takMeervoud: org?.takBenamingMeervoud || STANDAARD.takMeervoud,
        gebruiktDas: org?.gebruiktDas ?? STANDAARD.gebruiktDas,
      });
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [organisatieId]);

  return { ...instellingen, loading };
}
