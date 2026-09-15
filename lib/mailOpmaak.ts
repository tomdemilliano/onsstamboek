/**
 * Bewust GEEN `import "server-only"` hier: de mailing-opstelpagina (Client
 * Component) heeft `naarRijkeHtml` ook nodig voor de live HTML-voorbeeld,
 * zelfde reden als lib/feedbackMail.ts. Het versturen zelf gebeurt
 * uitsluitend server-side via lib/resend.ts.
 *
 * Eenvoudige, eigen notatie in plaats van een rich-text-editor:
 * `**vet**`, `*cursief*`, `[tekst](url)`, `# Titel`/`## Subtitel`, lege
 * regel = nieuwe alinea, `- ` = bullet-lijstitem, `1. ` = genummerd
 * lijstitem (zelfde basisconventie als lib/feedbackMail.ts:naarHtml).
 * Escaped eerst de ruwe tekst (tegen HTML-injectie in de door de
 * beheerder getypte inhoud), past dan pas de notatie toe.
 */

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Enkel http(s)-links toelaten -- voorkomt bv. een `javascript:`-schema via [tekst](url). Vet vóór cursief verwerken, zodat er geen losse `*` overblijven die de cursief-notatie in de war zouden sturen. */
function inlineOpmaak(regel: string): string {
  return regel
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, tekst: string, url: string) => `<a href="${url.replace(/"/g, "&quot;")}">${tekst}</a>`);
}

export function naarRijkeHtml(inhoud: string): string {
  const alinea: string[] = [];
  let lijstItems: string[] = [];
  let lijstSoort: "ul" | "ol" | null = null;

  function sluitLijstAf() {
    if (lijstItems.length > 0 && lijstSoort) {
      alinea.push(`<${lijstSoort}>${lijstItems.map((item) => `<li>${item}</li>`).join("")}</${lijstSoort}>`);
      lijstItems = [];
    }
    lijstSoort = null;
  }

  for (const ruweRegel of escapeHtml(inhoud).split("\n")) {
    const koppMatch = ruweRegel.match(/^(#{1,2})\s+(.*)$/);
    const genummerdMatch = ruweRegel.match(/^\d+\.\s+(.*)$/);

    if (koppMatch) {
      sluitLijstAf();
      const tag = koppMatch[1].length === 1 ? "h2" : "h3";
      alinea.push(`<${tag}>${inlineOpmaak(koppMatch[2])}</${tag}>`);
    } else if (ruweRegel.startsWith("- ")) {
      if (lijstSoort !== "ul") sluitLijstAf();
      lijstSoort = "ul";
      lijstItems.push(inlineOpmaak(ruweRegel.slice(2)));
    } else if (genummerdMatch) {
      if (lijstSoort !== "ol") sluitLijstAf();
      lijstSoort = "ol";
      lijstItems.push(inlineOpmaak(genummerdMatch[1]));
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
