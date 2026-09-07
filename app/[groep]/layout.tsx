import { notFound } from "next/navigation";
import { GroepFactory } from "@/lib/dbSchema";
import { GroepProvider } from "@/lib/groepContext";

// Enkel de groep-context (geen navigatie hier): de publieke nav zit in
// (public)/layout.tsx, de beheer-nav in beheer/layout.tsx -- anders staan
// ze allebei tegelijk op elke beheer-pagina.
export default async function GroepLayout(
  props: LayoutProps<"/[groep]">
) {
  const { groep: slug } = await props.params;
  const groep = await GroepFactory.getBySlug(slug);

  if (!groep || groep.status !== "actief") {
    notFound();
  }

  return <GroepProvider groep={groep}>{props.children}</GroepProvider>;
}
