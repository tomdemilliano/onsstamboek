"use client";

import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { logout } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import { landingsafbeeldingStyle } from "@/lib/landingsafbeelding";
import GroepWisselaar from "./GroepWisselaar";

export default function AdminNav() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  return (
    <header style={{ background: colors.forestDark }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Link href={basis} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", minWidth: 0 }}>
          {groep.logoUrl ? (
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={groep.logoUrl} alt="" style={landingsafbeeldingStyle(groep.logoPositie)} />
            </div>
          ) : (
            <span style={{ fontSize: 18 }}>⛺</span>
          )}
          <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {groep.naam}
          </span>
          <span style={{ fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>beheer</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <GroepWisselaar />
          <Link
            href={`${basis}/beheer/handleiding`}
            aria-label="Handleiding"
            title="Handleiding"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.white,
              textDecoration: "none",
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            ❓
          </Link>
          <button
            onClick={() => logout()}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: colors.white,
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Uitloggen
          </button>
        </div>
      </div>
    </header>
  );
}
