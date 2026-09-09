"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth, isSysteembeheerder, logout } from "@/lib/auth";
import { LidmaatschapFactory } from "@/lib/dbSchema";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";

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

  if (status === "laden") {
    return <p style={{ padding: "2rem", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (status === "geenToegang") {
    return (
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
        <p style={{ fontFamily: fonts.body, color: colors.stamp, margin: 0 }}>
          Je bent (nog) geen beheerder van {groep.naam}. Vraag de systeembeheerder om je account aan deze groep te
          koppelen, of meld je aan met een ander account.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600, textDecoration: "none" }}>
            ← Naar het platform
          </Link>
          <button
            onClick={() => logout().then(() => router.replace("/aanmelden"))}
            style={{
              padding: "6px 14px",
              borderRadius: radius.badge,
              border: `1px solid ${colors.line}`,
              background: colors.white,
              color: colors.ink,
              fontFamily: fonts.body,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Uitloggen
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
