"use client";

import Link from "next/link";
import { logout } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";

export default function SysteemNav() {
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
    </header>
  );
}
