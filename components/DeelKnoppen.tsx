"use client";

import { useSyncExternalStore } from "react";
import { colors, fonts, radius } from "@/lib/theme";

const geenAbonnement = () => () => {};
const leesOndersteuning = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const serverOndersteuning = () => false;

/**
 * Enkel een navigator.share()-knop (het "native deelvenster" op mobiel) als
 * progressive enhancement -- de platte WhatsApp/Facebook/X-deel-links op de
 * kaart-pagina zelf werken sowieso al zonder JS, dit is er gewoon een fijnere
 * optie bovenop wanneer de browser het ondersteunt. `useSyncExternalStore`
 * (i.p.v. een effect + setState) leest deze browser-capaciteit veilig uit
 * zonder hydration-mismatch: server-render toont niets, client-render
 * daarna meteen de correcte waarde.
 */
export default function DeelKnoppen({ url, titel, tekst }: { url: string; titel: string; tekst: string }) {
  const kanDelen = useSyncExternalStore(geenAbonnement, leesOndersteuning, serverOndersteuning);

  if (!kanDelen) return null;

  return (
    <button
      onClick={() => {
        navigator.share({ title: titel, text: tekst, url }).catch(() => {});
      }}
      style={{
        padding: "10px 22px",
        borderRadius: radius.badge,
        border: `1px solid ${colors.line}`,
        background: colors.paperCard,
        color: colors.ink,
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      📤 Delen
    </button>
  );
}
