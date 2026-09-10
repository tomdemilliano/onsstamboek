import Link from "next/link";
import VoorwaardenTekst from "@/components/VoorwaardenTekst";
import { colors, fonts, fontImports } from "@/lib/theme";

// Publiek raadpleegbaar (bv. om door te sturen naar een nieuwe groep vóór
// die effectief toegang krijgt) -- de eigenlijke, verplichte acceptatie
// gebeurt in het beheerscherm zelf, zie components/RequireGroepsbeheerder.
export default function VoorwaardenPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 100px" }}>
        <Link href="/" style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
          ← Naar het platform
        </Link>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.ink, margin: "10px 0 20px" }}>
          Gebruiksvoorwaarden voor groepsbeheerders
        </h1>
        <VoorwaardenTekst />
      </div>
    </div>
  );
}
