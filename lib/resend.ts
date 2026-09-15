import "server-only";

/**
 * Minimale Resend-integratie -- rechtstreeks via fetch naar hun REST API in
 * plaats van het `resend`-npm-pakket, want e-mail versturen blijft in deze
 * app beperkt tot een klein aantal plekken (uitnodigingsmails,
 * feedback-/notificatiemails, ledenmailings) en één POST-aanroep weegt niet
 * op tegen een extra dependency.
 *
 * Vereist `RESEND_API_KEY` (Resend-dashboard -> API Keys) en een
 * geverifieerd verzenddomein bij Resend (hier: onsstamboek.be).
 */

const STANDAARD_AFZENDERNAAM = "Ons Stamboek";
const STANDAARD_AFZENDER = `${STANDAARD_AFZENDERNAAM} <noreply@onsstamboek.be>`;

/**
 * `RESEND_FROM_EMAIL` mag zowel een kaal adres ("noreply@onsstamboek.be")
 * als het volledige "Naam <adres>"-formaat bevatten. Een kaal adres krijgt
 * hier alsnog de standaardnaam ervoor -- zonder naam toont een mailclient
 * anders het adres zelf (dus "noreply") als afzender, wat niet de bedoeling
 * is.
 */
function afzender(): string {
  const ruw = process.env.RESEND_FROM_EMAIL;
  if (!ruw) return STANDAARD_AFZENDER;
  return ruw.includes("<") ? ruw : `${STANDAARD_AFZENDERNAAM} <${ruw}>`;
}

export async function verstuurEmail({
  to,
  subject,
  html,
  replyTo,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  /** Antwoorden (en eventuele bounce-/foutmeldingen van de ontvangende mailserver) komen hier terecht i.p.v. bij `RESEND_FROM_EMAIL`. */
  replyTo?: string;
  /** Extra e-mailheaders, bv. `List-Unsubscribe`/`List-Unsubscribe-Post` voor een mailing. */
  headers?: Record<string, string>;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ontbreekt -- e-mail kan niet verstuurd worden.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: afzender(), to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}), ...(headers ? { headers } : {}) }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    throw new Error(`Versturen van e-mail via Resend mislukt (${res.status}): ${tekst}`);
  }
}
