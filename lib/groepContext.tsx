"use client";

import { createContext, useContext } from "react";
import type { Groep, WithId } from "@/types/models";

const GroepContext = createContext<WithId<Groep> | null>(null);

export function GroepProvider({
  groep,
  children,
}: {
  groep: WithId<Groep>;
  children: React.ReactNode;
}) {
  return <GroepContext.Provider value={groep}>{children}</GroepContext.Provider>;
}

/** De huidige groep binnen een `/[groep]/...`-route. Enkel bruikbaar onder `GroepProvider`. */
export function useGroep(): WithId<Groep> {
  const groep = useContext(GroepContext);
  if (!groep) {
    throw new Error("useGroep() moet binnen een GroepProvider gebruikt worden.");
  }
  return groep;
}
