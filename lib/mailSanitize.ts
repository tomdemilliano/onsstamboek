import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * De opstelpagina levert rauwe HTML van de Tiptap-editor aan (zie
 * components/MailRichEditor.tsx). Die HTML wordt nooit vertrouwd --
 * iemand kan in principe ook rechtstreeks naar deze API posten, buiten
 * de editor-UI om -- dus wordt ze hier, vlak vóór ze in een e-mail
 * terechtkomt, tegen een allowlist gesaneerd. De toegelaten tags komen
 * overeen met wat de editor zelf kan produceren (StarterKit beperkt tot
 * vet/cursief/onderlijnd/koppen(2-3)/lijsten/links).
 */
export function saneerMailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "strong", "em", "u", "h2", "h3", "ul", "ol", "li", "a", "br"],
    allowedAttributes: { a: ["href"] },
    allowedSchemesByTag: { a: ["http", "https"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true) },
  });
}
