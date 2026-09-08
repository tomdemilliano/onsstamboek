"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { logout } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import GroepWisselaar from "./GroepWisselaar";

const SECTIES = [
  { href: "/beheer", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/beheer/vriendenboek", label: "Vriendenboek", icon: "📖" },
  { href: "/beheer/tijdlijn", label: "Tijdlijn", icon: "⏳" },
  { href: "/beheer/kampplaatsen", label: "Kampplaatsen", icon: "📍" },
  { href: "/beheer/fotos", label: "Foto's", icon: "📷" },
  { href: "/beheer/gerechten", label: "Gerechten", icon: "🍽️" },
  { href: "/beheer/links", label: "Links", icon: "🔗" },
  { href: "/beheer/instellingen", label: "Instellingen", icon: "⚙️" },
];

export default function AdminNav() {
  const groep = useGroep();
  const pathname = usePathname();
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={groep.logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
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

      <nav style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2, flexWrap: "wrap" }}>
        {SECTIES.map((sectie) => {
          const href = `${basis}${sectie.href}`;
          const actief = sectie.exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 12px",
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: 600,
                color: actief ? colors.white : "rgba(255,255,255,0.65)",
                borderBottom: actief ? `2px solid ${colors.campfire}` : "2px solid transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true">{sectie.icon}</span>
              {sectie.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
