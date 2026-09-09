"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";

const SECTIES = [
  { href: "/systeembeheer", label: "🧭 Organisaties", exact: true },
  { href: "/systeembeheer/groepen", label: "👥 Groepen" },
];

export default function SysteemNav() {
  const pathname = usePathname();

  return (
    <header style={{ background: colors.stamp }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/systeembeheer" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <span style={{ fontSize: 18 }}>🧭</span>
          <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.white }}>Systeembeheer</span>
        </Link>

        <button
          onClick={() => logout()}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.35)",
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

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4 }}>
        {SECTIES.map((sectie) => {
          const actief = sectie.exact ? pathname === sectie.href : pathname.startsWith(sectie.href);
          return (
            <Link
              key={sectie.href}
              href={sectie.href}
              style={{
                padding: "8px 14px",
                borderBottom: `2.5px solid ${actief ? colors.campfire : "transparent"}`,
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: 600,
                color: actief ? colors.white : "rgba(255,255,255,0.65)",
                textDecoration: "none",
              }}
            >
              {sectie.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
