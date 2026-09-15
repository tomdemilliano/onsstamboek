"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { MailCampagneFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { MailCampagne, WithId } from "@/types/models";

function tijdstip(campagne: WithId<MailCampagne>): string {
  const seconds = (campagne as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds;
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleString("nl-BE");
}

export default function MailingGeschiedenisPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/ontvangers`, label: "Ontvangers" },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  const [campagnes, setCampagnes] = useState<WithId<MailCampagne>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    MailCampagneFactory.getAll(groep.id).then((c) => {
      if (!actief) return;
      setCampagnes(c);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  async function verwijderen(id: string) {
    if (!confirm("Dit concept verwijderen?")) return;
    await MailCampagneFactory.verwijderConcept(id);
    setCampagnes((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Mailing</h1>
      <AdminSubNav tabs={tabs} />

      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>Concepten en eerder verstuurde ledenmailings, nieuwste eerst.</p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {campagnes.map((campagne) => (
          <div key={campagne.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={badgeStijl(campagne.status === "concept" ? colors.campfire : colors.forestDark, campagne.status === "concept" ? colors.campfireLight : colors.paper)}>
                  {campagne.status === "concept" ? "Concept" : "Verzonden"}
                </span>
                <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: colors.ink }}>{campagne.onderwerp || <em>(geen onderwerp)</em>}</div>
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{tijdstip(campagne)}</span>
            </div>

            {campagne.status === "verzonden" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={badgeStijl(colors.forestDark, colors.paper)}>{campagne.aantalVerzonden} verzonden</span>
                {campagne.aantalMislukt > 0 && <span style={badgeStijl(colors.stamp, colors.campfireLight)}>{campagne.aantalMislukt} mislukt</span>}
                <span style={badgeStijl(colors.inkMuted, colors.paper)}>{campagne.doelgroep === "selectie" ? "Selectie" : "Iedereen"}</span>
              </div>
            )}

            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, whiteSpace: "pre-line", margin: "0 0 10px" }}>{campagne.inhoud}</p>

            {campagne.status === "concept" && (
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`${basis}/beheer/mailing?conceptId=${campagne.id}`}
                  style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.forest, textDecoration: "underline" }}
                >
                  Bewerken/versturen
                </Link>
                <button type="button" onClick={() => verwijderen(campagne.id)} style={{ background: "none", border: "none", color: colors.stamp, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Verwijderen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && campagnes.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen mailings.</p>}
    </div>
  );
}

function badgeStijl(kleur: string, achtergrond: string): React.CSSProperties {
  return {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: kleur,
    background: achtergrond,
    borderRadius: radius.badge,
    padding: "2px 8px",
  };
}
