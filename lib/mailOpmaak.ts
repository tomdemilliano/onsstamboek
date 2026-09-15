/**
 * Bewust GEEN `import "server-only"` hier: de mailing-opstelpagina (Client
 * Component) heeft `naarRijkeHtml` ook nodig voor de live HTML-voorbeeld,
 * zelfde reden als lib/feedbackMail.ts. Het versturen zelf gebeurt
 * uitsluitend server-side via lib/resend.ts.
 *
 * Eenvoudige, eigen notatie in plaats van een rich-text-editor: `**vet**`,
 * `[tekst](url)`, lege regel = nieuwe alinea, `- ` = lijstitem (zelfde
 * bullet-conventie als lib/feedbackMail.ts:naarHtml). Escaped eerst de
 * ruwe tekst (tegen HTML-injectie in de door de beheerder getypte inhoud),
 * past dan pas de notatie toe.
 */

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Enkel http(s)-links toelaten -- voorkomt bv. een `javascript:`-schema via [tekst](url). */
function inlineOpmaak(regel: string): string {
  return regel
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, tekst: string, url: string) => `<a href="${url.replace(/"/g, "&quot;")}">${tekst}</a>`);
}

export function naarRijkeHtml(inhoud: string): string {
  const alinea: string[] = [];
  let lijstItems: string[] = [];

  function sluitLijstAf() {
    if (lijstItems.length > 0) {
      alinea.push(`<ul>${lijstItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      lijstItems = [];
    }
  }

  for (const ruweRegel of escapeHtml(inhoud).split("\n")) {
    if (ruweRegel.startsWith("- ")) {
      lijstItems.push(inlineOpmaak(ruweRegel.slice(2)));
    } else if (ruweRegel.trim() === "") {
      sluitLijstAf();
    } else {
      sluitLijstAf();
      alinea.push(`<p>${inlineOpmaak(ruweRegel)}</p>`);
    }
  }
  sluitLijstAf();

  return alinea.join("\n");
}
