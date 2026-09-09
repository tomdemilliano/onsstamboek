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

/**
 * Wist de gekozen groep. Nodig vóór je iemand naar "/" stuurt om opnieuw te
 * kiezen: proxy.ts stuurt "/" anders meteen terug naar de nog aanwezige
 * cookie, en "niet jouw groep?" zou dan nooit iets doen.
 */
export function clearGroepCookie() {
  document.cookie = `${GROEP_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Leest de gekozen groep (slug), of `null` als die er niet is. Gebruikt
 * door het aanmeld-knopje (zie PublicNav) om "Groepsbeheer openen" naar de
 * laatst bezochte groep te sturen zonder de gebruiker eerst te laten
 * kiezen.
 */
export function getGroepCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${GROEP_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
