"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { watchAuth } from "@/lib/auth";
import { GroepFactory, LidmaatschapFactory } from "@/lib/dbSchema";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";
import type { Groep, WithId } from "@/types/models";

/**
 * Dropdown met alle groepen waarvoor de ingelogde gebruiker groepsbeheerder
 * is (via `lidmaatschappen`) -- laat één gebruiker eenvoudig wisselen
 * tussen meerdere groepen die hij/zij beheert.
 */
export default function GroepWisselaar() {
  const huidigeGroep = useGroep();
  const router = useRouter();
  const [groepen, setGroepen] = useState<WithId<Groep>[]>([]);

  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        setGroepen([]);
        return;
      }
      const lidmaatschappen = await LidmaatschapFactory.getByUserId(user.uid);
      const alleGroepen = await Promise.all(
        lidmaatschappen.map((lidmaatschap) => GroepFactory.getById(lidmaatschap.groepId))
      );
      setGroepen(alleGroepen.filter((g): g is WithId<Groep> => g !== null));
    });
  }, []);

  if (groepen.length <= 1) return null;

  return (
    <select
      value={huidigeGroep.slug}
      onChange={(e) => router.push(`/${e.target.value}/beheer`)}
      style={{
        padding: "6px 10px",
        borderRadius: radius.input,
        border: "1px solid rgba(255,255,255,0.3)",
        background: colors.forestDark,
        color: colors.white,
        fontFamily: fonts.body,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {groepen.map((groep) => (
        <option key={groep.id} value={groep.slug} style={{ color: colors.ink, background: colors.white }}>
          {groep.naam}
        </option>
      ))}
    </select>
  );
}
