"use client";

import { useEffect, useState } from "react";
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

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Mailing</h1>
      <AdminSubNav tabs={tabs} />

      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>Alle eerder verstuurde ledenmailings, nieuwste eerst.</p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {campagnes.map((campagne) => (
          <div key={campagne.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: colors.ink }}>{campagne.onderwerp}</div>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{tijdstip(campagne)}</span>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={badgeStijl(colors.forestDark, colors.paper)}>{campagne.aantalVerzonden} verzonden</span>
              {campagne.aantalMislukt > 0 && <span style={badgeStijl(colors.stamp, colors.campfireLight)}>{campagne.aantalMislukt} mislukt</span>}
            </div>

            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, whiteSpace: "pre-line", margin: 0 }}>{campagne.inhoud}</p>
          </div>
        ))}
      </div>

      {!loading && campagnes.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen mailings verstuurd.</p>}
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
