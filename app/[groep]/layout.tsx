import { notFound } from "next/navigation";
import { GroepFactory } from "@/lib/dbSchema";
import { GroepProvider } from "@/lib/groepContext";
import PublicNav from "@/components/PublicNav";

export default async function GroepLayout(
  props: LayoutProps<"/[groep]">
) {
  const { groep: slug } = await props.params;
  const groep = await GroepFactory.getBySlug(slug);

  if (!groep || groep.status !== "actief") {
    notFound();
  }

  return (
    <GroepProvider groep={groep}>
      <PublicNav />
      <main>{props.children}</main>
    </GroepProvider>
  );
}
