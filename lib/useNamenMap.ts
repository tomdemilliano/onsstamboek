"use client";

import { useEffect, useState } from "react";
import { EntryFactory } from "@/lib/dbSchema";

/** id -> huidige naam van elk lid van de groep, voor live naamresolutie via lib/naamMatching.ts:weergaveNaam. */
export function useNamenMap(groepId: string): Map<string, string> {
  const [namen, setNamen] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let actief = true;
    EntryFactory.getNamenMap(groepId).then((m) => {
      if (actief) setNamen(m);
    });
    return () => {
      actief = false;
    };
  }, [groepId]);

  return namen;
}
