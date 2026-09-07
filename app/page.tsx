import GroepKeuze from "@/components/GroepKeuze";
import { GroepFactory } from "@/lib/dbSchema";

// Deze pagina heeft geen dynamisch route-segment en gebruikt geen
// cookies()/headers(), dus zou Next.js ze zonder deze regel bij de build
// EENMALIG statisch genereren -- de groepenlijst zou dan bevriezen op de
// stand van de laatste deploy in plaats van live uit Firestore te lezen.
export const dynamic = "force-dynamic";

// Terugkerende bezoekers met een `stamboek_groep`-cookie worden door
// proxy.ts al rechtstreeks naar hun laatst gekozen groep doorgestuurd --
// deze pagina is dus vooral voor nieuwe bezoekers en voor "niet jouw groep?"
// (zie de link in [groep]/layout.tsx).
export default async function PlatformLanding() {
  const groepen = await GroepFactory.getActief();

  return (
    <main style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
      <h1>onsstamboek</h1>
      <p>Het vriendenboekje-platform voor scoutsgroepen. Kies je groep:</p>
      <GroepKeuze groepen={groepen} />
    </main>
  );
}
