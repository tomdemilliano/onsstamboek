"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { setGroepCookie } from "@/lib/groepCookie";
import { colors, fonts, radius } from "@/lib/theme";
import { landingsafbeeldingStyle } from "@/lib/landingsafbeelding";
import type { Groep, Organisatie, WithId } from "@/types/models";

export default function PlatformLanding({
  groepen,
  organisaties,
}: {
  groepen: WithId<Groep>[];
  organisaties: WithId<Organisatie>[];
}) {
  const [zoek, setZoek] = useState("");
  const [organisatieFilter, setOrganisatieFilter] = useState<string>("alle");

  const organisatieNaam = useMemo(() => {
    const map = new Map(organisaties.map((o) => [o.id, o.naam]));
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [organisaties]);

  // Enkel organisaties tonen als filter die ook effectief aan een actieve
  // groep gekoppeld zijn -- en enkel de hele filterrij als er meer dan één
  // zo'n organisatie is (bij hooguit één heeft filteren geen zin).
  const vertegenwoordigdeOrganisaties = useMemo(() => {
    const ids = new Set(groepen.map((g) => g.organisatieId).filter((id): id is string => Boolean(id)));
    return Array.from(ids)
      .map((id) => ({ id, naam: organisatieNaam(id) || "" }))
      .filter((o) => o.naam)
      .sort((a, b) => a.naam.localeCompare(b.naam));
  }, [groepen, organisatieNaam]);

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return groepen.filter((g) => {
      if (organisatieFilter !== "alle" && g.organisatieId !== organisatieFilter) return false;
      if (!q) return true;
      return g.naam.toLowerCase().includes(q) || (g.gemeente ?? "").toLowerCase().includes(q);
    });
  }, [zoek, organisatieFilter, groepen]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 100px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 20px" }}>
        <Logo />
        <p
          style={{
            fontFamily: fonts.display,
            fontSize: 19,
            fontStyle: "italic",
            color: colors.forest,
            margin: "6px 0 22px",
          }}
        >
          De geschiedenis van jouw groep
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: 16, color: colors.ink, maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
          Ons Stamboek is het gedeelde platform waarop jeugdbewegingen hun eigen geschiedenis
          bijhouden en samen aanvullen: een vriendenboekje van oud-leden, een tijdlijn met mijlpalen en leidingsploegen
          doorheen de jaren, en foto&apos;s van vroeger. Elke groep krijgt haar eigen pagina, opgebouwd door haar eigen
          oud-leden en beheerders.
        </p>
      </div>

      {/* Zoek + organisatie-filter */}
      <div style={{ maxWidth: 480, margin: "0 auto 8px" }}>
        <input
          type="search"
          placeholder="Zoek je groep op naam of gemeente..."
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: radius.badge,
            border: `1.5px solid ${colors.line}`,
            background: colors.white,
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.ink,
            boxSizing: "border-box",
          }}
        />
      </div>

      {vertegenwoordigdeOrganisaties.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "14px 0 28px" }}>
          <FilterPil actief={organisatieFilter === "alle"} onClick={() => setOrganisatieFilter("alle")}>
            Alle organisaties
          </FilterPil>
          {vertegenwoordigdeOrganisaties.map((org) => (
            <FilterPil key={org.id} actief={organisatieFilter === org.id} onClick={() => setOrganisatieFilter(org.id)}>
              {org.naam}
            </FilterPil>
          ))}
        </div>
      )}

      {vertegenwoordigdeOrganisaties.length <= 1 && <div style={{ marginBottom: 28 }} />}

      {/* Groepenoverzicht */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {gefilterd.map((groep) => (
          <Link key={groep.id} href={`/${groep.slug}`} onClick={() => setGroepCookie(groep.slug)} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: colors.paperCard,
                border: `1.5px solid ${colors.line}`,
                borderRadius: radius.card,
                padding: "20px 18px",
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 4,
              }}
            >
              {groep.logoUrl ? (
                <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: `2px solid ${colors.campfire}`, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={groep.logoUrl} alt="" style={landingsafbeeldingStyle(groep.logoPositie)} />
                </div>
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: colors.campfireLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    marginBottom: 8,
                  }}
                >
                  🏕️
                </div>
              )}
              <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.ink }}>{groep.naam}</div>
              {groep.gemeente && <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{groep.gemeente}</div>}
              {organisatieNaam(groep.organisatieId) && (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    color: colors.forest,
                    border: `1px solid ${colors.forest}`,
                    borderRadius: radius.badge,
                    padding: "2px 10px",
                  }}
                >
                  {organisatieNaam(groep.organisatieId)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {gefilterd.length === 0 && (
        <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted, marginTop: 20 }}>
          {groepen.length === 0 ? "Er is nog geen groep actief op dit platform." : "Geen groep gevonden."}
        </p>
      )}

      {/* Contact */}
      <div style={{ textAlign: "center", marginTop: 60, paddingTop: 24, borderTop: `1px solid ${colors.line}` }}>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 10 }}>
          Jouw groep ook op stamboek? Heb je een vraag over het platform?
        </p>
        <Link
          href="/contact"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: radius.badge,
            border: `1.5px solid ${colors.forest}`,
            color: colors.forest,
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          ✉️ Contacteer ons
        </Link>
      </div>
    </div>
  );
}

function FilterPil({ children, actief, onClick }: { children: React.ReactNode; actief: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: radius.badge,
        border: `1.5px solid ${actief ? colors.forest : colors.line}`,
        background: actief ? colors.forest : colors.white,
        color: actief ? colors.white : colors.ink,
        fontFamily: fonts.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Toont het logo-bestand als het bestaat; anders enkel de tekst-wordmark
 * (geen gebroken-afbeelding-icoon). Zet `public/logo.png` (de illustratie
 * van de uitkijktoren + "Ons Stamboek") klaar om het icoon te laten
 * verschijnen -- de tekst hieronder blijft sowieso zichtbaar.
 */
function Logo() {
  const [afbeeldingOk, setAfbeeldingOk] = useState(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {afbeeldingOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt=""
          style={{ maxWidth: 260, width: "70%", height: "auto" }}
          onError={() => setAfbeeldingOk(false)}
        />
      )}
      <h1 style={{ fontFamily: fonts.display, fontSize: 44, fontWeight: 700, color: colors.ink, margin: 0 }}>Ons Stamboek</h1>
    </div>
  );
}
