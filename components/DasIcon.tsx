"use client";

import { useId } from "react";
import { colors } from "@/lib/theme";

/**
 * Een vereenvoudigd, plat icoontje van een scoutsdas in 2 kleuren (bv. bij
 * Scouts en Gidsen Vlaanderen heeft elke groep een eigen kleurencombinatie),
 * te tonen naast de groepsnaam. De 2 kleuren komen van de groep zelf (zie
 * instellingen); de knoop/ring is bewust altijd hetzelfde kraftpapier-bruin
 * (colors.wood), net als op een echte houten dassenring.
 */
export default function DasIcon({ kleur1, kleur2, maat = 32 }: { kleur1: string; kleur2: string; maat?: number }) {
  const patroonId = useId();

  return (
    <svg width={maat} height={maat} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <pattern id={patroonId} patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
          <rect width="16" height="16" fill={kleur1} />
          <rect width="8" height="16" fill={kleur2} />
        </pattern>
      </defs>

      {/* Das-tailen (de 2 slippen die naar beneden hangen) -- vóór de knoop/
          het lijf getekend zodat die er overheen vallen, net als bij een
          echt gestrikte das. */}
      <path
        d="M 38 72 L 20 100 L 30 100 L 46 76 Z"
        fill={`url(#${patroonId})`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d="M 30 70 L 6 96 L 16 98 L 40 74 Z"
        fill={`url(#${patroonId})`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Het lijf van de das: een open driehoek die over beide schouders
          drapeert (evenodd snijdt het "halsgat" uit het midden). */}
      <path
        d="M 66 4 L 96 62 L 36 62 Z M 66 26 L 84 56 L 52 56 Z"
        fillRule="evenodd"
        fill={`url(#${patroonId})`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Dassenring/knoop */}
      <circle cx="36" cy="64" r="10" fill={colors.wood} stroke={colors.ink} strokeWidth={2.5} />
    </svg>
  );
}
