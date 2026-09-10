"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth, isSysteembeheerder, logout } from "@/lib/auth";
import { LidmaatschapFactory } from "@/lib/dbSchema";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";
import VoorwaardenTekst from "@/components/VoorwaardenTekst";

type Status = "laden" | "toegang" | "geenToegang" | "voorwaardenNodig";

/**
 * Beschermt alles onder `/[groep]/beheer`: enkel toegankelijk voor de
 * systeembeheerder, of een gebruiker met een `lidmaatschappen`-document
 * voor déze groep. Centraal op layout-niveau (App Router), in tegenstelling
 * tot de oude app waar elke admin-pagina zelf `<RequireAuth>` importeerde.
 *
 * Een groepsbeheerder (niet de systeembeheerder, die heeft geen
 * lidmaatschap en dus ook geen inhoudelijke verantwoordelijkheid over een
 * individuele groep) moet daarnaast de gebruiksvoorwaarden aanvaard hebben
 * voor déze groep -- anders komt eerst het acceptatiescherm.
 */
export default function RequireGroepsbeheerder({ children }: { children: React.ReactNode }) {
  const groep = useGroep();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("laden");
  const [uid, setUid] = useState<string | null>(null);
  const [accepterenBezig, setAccepterenBezig] = useState(false);

  useEffect(() => {
    return watchAuth(async (user: User | null) => {
      if (!user) {
        router.replace("/aanmelden");
        return;
      }
      setUid(user.uid);
      const systeembeheerder = await isSysteembeheerder(user);
      if (systeembeheerder) {
        setStatus("toegang");
        return;
      }
      const groepsbeheerder = await LidmaatschapFactory.isGroepsbeheerder(user.uid, groep.id);
      if (!groepsbeheerder) {
        setStatus("geenToegang");
        return;
      }
      const voorwaardenOk = await LidmaatschapFactory.heeftVoorwaardenGeaccepteerd(user.uid, groep.id);
      setStatus(voorwaardenOk ? "toegang" : "voorwaardenNodig");
    });
  }, [groep.id, router]);

  async function accepteren() {
    if (!uid) return;
    setAccepterenBezig(true);
    try {
      await LidmaatschapFactory.accepteerVoorwaarden(uid, groep.id);
      setStatus("toegang");
    } finally {
      setAccepterenBezig(false);
    }
  }

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

  if (status === "voorwaardenNodig") {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 20px 4rem" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 4px" }}>
          Gebruiksvoorwaarden voor groepsbeheerders
        </h1>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>
          Om verder te kunnen met het beheer van {groep.naam} vragen we je eerst onderstaande voorwaarden te lezen
          en te aanvaarden.
        </p>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "20px 22px", maxHeight: 420, overflowY: "auto", marginBottom: 20 }}>
          <VoorwaardenTekst />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={accepteren}
            disabled={accepterenBezig}
            style={{
              padding: "10px 22px",
              borderRadius: radius.badge,
              border: "none",
              background: accepterenBezig ? colors.inkMuted : colors.forest,
              color: colors.white,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
              cursor: accepterenBezig ? "default" : "pointer",
            }}
          >
            {accepterenBezig ? "Bezig..." : "Ik ga akkoord"}
          </button>
          <button
            onClick={() => logout().then(() => router.replace("/aanmelden"))}
            style={{
              padding: "10px 18px",
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
            Niet akkoord -- uitloggen
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
