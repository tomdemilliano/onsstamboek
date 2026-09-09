import type { CSSProperties } from "react";
import type { Groep } from "@/types/models";

/**
 * Beeldverhouding van het welkomstfoto-kader op de publieke groep-
 * landingspagina -- gedeeld met de kadreer-modal in /beheer/instellingen
 * zodat wat de beheerder daar ziet exact overeenkomt met wat een bezoeker
 * nadien te zien krijgt, ongeacht schermbreedte (i.p.v. enkel een
 * max-height op de afbeelding, die op smallere schermen niet dezelfde
 * uitsnede geeft).
 */
export const LANDING_ASPECT_RATIO = "12 / 5";

/**
 * CSS voor de <img> zelf: object-fit/object-position dekt de "welk deel
 * van de foto" af, een transform-scale met dezelfde origin voegt de
 * in/uitzoom toe -- zoomen blijft zo altijd gecentreerd op het gekozen
 * focuspunt, in elk kader ter grootte dan ook.
 */
export function landingsafbeeldingStyle(positie?: Groep["landingsafbeeldingPositie"]): CSSProperties {
  const x = positie?.x ?? 50;
  const y = positie?.y ?? 50;
  const zoom = positie?.zoom ?? 1;
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
    display: "block",
  };
}
