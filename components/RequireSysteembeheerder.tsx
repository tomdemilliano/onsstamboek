"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { watchAuth, isSysteembeheerder, logout } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";

type Status = "laden" | "toegang" | "geenToegang";

export default function RequireSysteembeheerder({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("laden");

  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        router.replace("/aanmelden");
        return;
      }
      const systeembeheerder = await isSysteembeheerder(user);
      setStatus(systeembeheerder ? "toegang" : "geenToegang");
    });
  }, [router]);

  if (status === "laden") {
    return <p style={{ padding: "2rem", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (status === "geenToegang") {
    return (
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
        <p style={{ fontFamily: fonts.body, color: colors.stamp, margin: 0 }}>Enkel toegankelijk voor de systeembeheerder.</p>
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
