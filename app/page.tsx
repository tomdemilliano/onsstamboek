import PlatformLanding from "@/components/PlatformLanding";
import { GroepFactory, OrganisatieFactory } from "@/lib/dbSchema";
import { fontImports } from "@/lib/theme";

// Deze pagina heeft geen dynamisch route-segment en gebruikt geen
// cookies()/headers(), dus zou Next.js ze zonder deze regel bij de build
// EENMALIG statisch genereren -- de groepenlijst zou dan bevriezen op de
// stand van de laatste deploy in plaats van live uit Firestore te lezen.
export const dynamic = "force-dynamic";

// Terugkerende bezoekers met een `stamboek_groep`-cookie worden door
// proxy.ts al rechtstreeks naar hun laatst gekozen groep doorgestuurd --
// deze pagina is dus vooral voor nieuwe bezoekers en voor "niet jouw groep?"
// (zie de link in [groep]/layout.tsx).
export default async function PlatformLandingPage() {
  const [groepen, organisaties] = await Promise.all([GroepFactory.getActief(), OrganisatieFactory.getAll()]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <PlatformLanding groepen={groepen} organisaties={organisaties} />
    </div>
  );
}
