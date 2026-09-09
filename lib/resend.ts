import "server-only";

/**
 * Minimale Resend-integratie -- rechtstreeks via fetch naar hun REST API in
 * plaats van het `resend`-npm-pakket, want dit is de enige plek in de app
 * die e-mail verstuurt (uitnodigingsmails voor nieuwe gebruikers, zie
 * app/api/systeembeheer/gebruikers/route.ts) en één POST-aanroep weegt niet
 * op tegen een extra dependency.
 *
 * Vereist `RESEND_API_KEY` (Resend-dashboard -> API Keys) en een
 * geverifieerd verzenddomein bij Resend (hier: onsstamboek.be).
 */
export async function verstuurEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ontbreekt -- e-mail kan niet verstuurd worden.");
  }
  const van = process.env.RESEND_FROM_EMAIL || "Ons Stamboek <noreply@onsstamboek.be>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: van, to, subject, html }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    throw new Error(`Versturen van e-mail via Resend mislukt (${res.status}): ${tekst}`);
  }
}
