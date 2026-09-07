"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { watchAuth, isSysteembeheerder } from "@/lib/auth";
import { LidmaatschapFactory } from "@/lib/dbSchema";
import { useGroep } from "@/lib/groepContext";

type Status = "laden" | "toegang" | "geenToegang";

/**
 * Beschermt alles onder `/[groep]/beheer`: enkel toegankelijk voor de
 * systeembeheerder, of een gebruiker met een `lidmaatschappen`-document
 * voor déze groep. Centraal op layout-niveau (App Router), in tegenstelling
 * tot de oude app waar elke admin-pagina zelf `<RequireAuth>` importeerde.
 */
export default function RequireGroepsbeheerder({ children }: { children: React.ReactNode }) {
  const groep = useGroep();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("laden");

  useEffect(() => {
    return watchAuth(async (user: User | null) => {
      if (!user) {
        router.replace("/aanmelden");
        return;
      }
      const systeembeheerder = await isSysteembeheerder(user);
      if (systeembeheerder) {
        setStatus("toegang");
        return;
      }
      const groepsbeheerder = await LidmaatschapFactory.isGroepsbeheerder(user.uid, groep.id);
      setStatus(groepsbeheerder ? "toegang" : "geenToegang");
    });
  }, [groep.id, router]);

  if (status === "laden") return <p style={{ padding: "2rem" }}>Bezig met laden...</p>;
  if (status === "geenToegang") {
    return <p style={{ padding: "2rem" }}>Je bent geen beheerder van {groep.naam}.</p>;
  }
  return <>{children}</>;
}
