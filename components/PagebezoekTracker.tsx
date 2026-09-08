"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { StatsFactory } from "@/lib/dbSchema";

/**
 * Telt publieke paginabezoeken per groep -- overgezet uit pages/_app.js in
 * de oude app. Enkel gemonteerd in het publieke layout (public)/layout.tsx,
 * dus het beheergedeelte (jouw eigen gebruik, geen "bezoekersverkeer") telt
 * hier vanzelf niet mee, zonder een aparte pad-check zoals in de oude app.
 */
export default function PagebezoekTracker() {
  const groep = useGroep();
  const pathname = usePathname();

  useEffect(() => {
    StatsFactory.logBezoek(groep.id, pathname);
  }, [groep.id, pathname]);

  return null;
}
