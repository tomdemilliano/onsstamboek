"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";
import { clearGroepCookie } from "@/lib/groepCookie";

const LINKS = [
  { href: "/vriendenboekje", label: "Vriendenboekje", icon: "📖" },
  { href: "/tijdlijn", label: "Tijdlijn", icon: "⏳" },
  { href: "/kampplaatsen", label: "Kampplaatsen", icon: "🏕️" },
  { href: "/fotos", label: "Foto's", icon: "📷" },
  { href: "/eten", label: "Eten", icon: "🍲" },
  { href: "/spellen", label: "Spellen", icon: "🎲" },
  { href: "/links", label: "Links", icon: "🔗" },
  { href: "/over-de-groep", label: "Over de groep", icon: "ℹ️" },
];

// Lichtjes scheve hoeken en rotaties, per knop verschillend maar altijd
// dezelfde volgorde (geen Math.random -- anders klopt server- en
// client-render niet met elkaar, wat een hydration-fout geeft).
const RADIUS = [
  "16px 22px 18px 24px / 20px 16px 22px 14px",
  "22px 16px 24px 18px / 16px 22px 14px 20px",
  "18px 24px 16px 22px / 22px 14px 20px 16px",
  "24px 18px 22px 16px / 14px 20px 16px 22px",
];
const ROTATIE = [-1.5, 1, -1, 1.5];

function Kampvuurtje({ maat = 30 }: { maat?: number }) {
  return (
    <svg width={maat} height={maat} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M6 24 L14 12" stroke={colors.forestDark} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 24 L16 12" stroke={colors.forestDark} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 9 C 11 13, 11 17, 15 21 C 19 17, 19 13, 15 9 Z" fill={colors.campfire} />
      <path d="M15 13 C 13 15.5, 13 17.5, 15 19.5 C 17 17.5, 17 15.5, 15 13 Z" fill="#F4B860" />
    </svg>
  );
}

export default function PublicNav() {
  const groep = useGroep();
  const router = useRouter();
  const pathname = usePathname();
  const basis = `/${groep.slug}`;
  const [menuOpen, setMenuOpen] = useState(false);

  function kiesAndereGroep() {
    // Zonder de cookie te wissen zou proxy.ts "/" meteen terugsturen naar
    // deze zelfde groep.
    clearGroepCookie();
    router.push("/");
  }

  // Sluit het uitklapmenu bij navigatie -- aanpassen tijdens het renderen
  // (React's aanbevolen patroon om state te resetten op een prop-wijziging)
  // i.p.v. in een effect, dat hier een overbodige extra render zou geven.
  const [vorigePathname, setVorigePathname] = useState(pathname);
  if (pathname !== vorigePathname) {
    setVorigePathname(pathname);
    setMenuOpen(false);
  }

  return (
    <div>
      {/* Volledige weergave -- vanaf een breder scherm */}
      <div className="vb-nav-groot">
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <Link href={basis} style={{ textDecoration: "none" }}>
            {groep.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={groep.logoUrl} alt={groep.naam} style={{ display: "inline-block", width: "100%", maxWidth: 420, height: "auto" }} />
            ) : (
              <span style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: colors.ink }}>{groep.naam}</span>
            )}
          </Link>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", padding: "18px 20px 0" }}>
          <Link href={basis} aria-label="Naar de groep-startpagina" style={{ display: "flex", marginRight: 4 }}>
            <Kampvuurtje />
          </Link>

          {LINKS.map((link, i) => {
            const href = `${basis}${link.href}`;
            const active = pathname === href;
            return (
              <Link
                key={link.href}
                href={href}
                style={{
                  padding: "7px 16px",
                  borderRadius: RADIUS[i % RADIUS.length],
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? colors.white : colors.ink,
                  background: active ? colors.forest : colors.paperCard,
                  border: `1.5px solid ${active ? colors.forest : colors.line}`,
                  transform: `rotate(${ROTATIE[i % ROTATIE.length]}deg)`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <button
            onClick={kiesAndereGroep}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecoration: "underline" }}
          >
            Niet jouw groep? Kies opnieuw
          </button>
        </div>
      </div>

      {/* Compacte balk + uitklapmenu -- enkel op een smal scherm */}
      <div className="vb-nav-klein">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <Link href={basis} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Kampvuurtje maat={26} />
            <span style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, color: colors.ink }}>{groep.naam}</span>
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={menuOpen}
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.input,
              border: `1.5px solid ${colors.line}`,
              background: colors.paperCard,
              fontSize: 16,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            {LINKS.map((link) => {
              const href = `${basis}${link.href}`;
              const active = pathname === href;
              return (
                <Link
                  key={link.href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: radius.input,
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    color: active ? colors.white : colors.ink,
                    background: active ? colors.forest : colors.paperCard,
                    border: `1.5px solid ${active ? colors.forest : colors.line}`,
                  }}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={kiesAndereGroep}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "10px 14px", fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "underline" }}
            >
              Niet jouw groep? Kies opnieuw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
