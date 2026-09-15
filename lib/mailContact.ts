/**
 * Bewust GEEN `import "server-only"` hier: pure functies, nodig aan
 * zowel de client-kant (lib/dbSchema.ts:MailContactFactory) als
 * server-side (app/api/mail/contact-koppelen, app/api/mail/campagne).
 */

/** E-mailadres genormaliseerd naar de vorm die overal als sleutel gebruikt wordt (getrimd + lowercase). */
export function genormaliseerdEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deterministisch document-ID voor `mailContacten` -- zelfde idee als
 * het bestaande `lidmaatschappen/{uid}_{groepId}`-patroon. Voorkomt
 * duplicaten (schrijven naar hetzelfde adres raakt altijd hetzelfde
 * document) en maakt "bestaat er al een contact met dit e-mailadres"
 * een rechtstreekse `get()` i.p.v. een query.
 */
export function mailContactId(groepId: string, email: string): string {
  return `${groepId}_${genormaliseerdEmail(email)}`;
}
