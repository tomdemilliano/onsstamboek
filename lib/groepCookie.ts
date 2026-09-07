const GROEP_COOKIE = "stamboek_groep";

/**
 * Onthoudt de gekozen groep voor een volgend bezoek aan "/" (zie proxy.ts).
 * Bewust een gewone, leesbare cookie (geen http-only, geen gevoelige data).
 * Losstaande module-level functie (i.p.v. inline in een component) zodat
 * de mutatie van `document.cookie` niet als een render-tijd side effect
 * gezien wordt.
 */
export function setGroepCookie(slug: string) {
  document.cookie = `${GROEP_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
