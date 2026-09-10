import type { CSSProperties } from "react";

/**
 * Beeldverhouding van het welkomstfoto-kader op de publieke groep-
 * landingspagina -- gedeeld met de kadreer-modal in /beheer/instellingen
 * zodat wat de beheerder daar ziet exact overeenkomt met wat een bezoeker
 * nadien te zien krijgt, ongeacht schermbreedte (i.p.v. enkel een
 * max-height op de afbeelding, die op smallere schermen niet dezelfde
 * uitsnede geeft).
 */
export const LANDING_ASPECT_RATIO = "12 / 5";

/** Beeldverhouding van de (ronde) avatar/profielfoto -- altijd vierkant, de cirkel komt van border-radius: 50%. */
export const AVATAR_ASPECT_RATIO = "1 / 1";

/** Kadrering (focuspunt + zoom) van een afbeelding -- gedeeld tussen welkomstfoto en avatar. */
export type Kadrering = { x: number; y: number; zoom: number };

/**
 * Vult x/y/zoom elk apart aan met hun standaardwaarde. Nodig omdat een
 * kadrering die opgeslagen werd vóór het zoom-veld bestond nog een
 * object zonder `zoom` kan zijn -- `positie ?? standaard` op het hele
 * object zou dan niets doen (het object is niet null/undefined, enkel
 * onvolledig) en `zoom` blijft `undefined`, wat de zoom-slider zonder
 * `value` laat en de browser die dan standaard in het midden zet i.p.v.
 * links (bij min=1).
 */
export function normaliseerPositie(positie?: Kadrering | null): Kadrering {
  return { x: positie?.x ?? 50, y: positie?.y ?? 50, zoom: positie?.zoom ?? 1 };
}

/**
 * CSS voor de <img> zelf: object-fit/object-position dekt de "welk deel
 * van de foto" af, een transform-scale met dezelfde origin voegt de
 * in/uitzoom toe -- zoomen blijft zo altijd gecentreerd op het gekozen
 * focuspunt, in elk kader ter grootte dan ook.
 */
export function landingsafbeeldingStyle(positie?: Kadrering | null): CSSProperties {
  const { x, y, zoom } = normaliseerPositie(positie);
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
