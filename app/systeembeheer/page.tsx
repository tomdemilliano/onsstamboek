"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GroepFactory, OrganisatieFactory, SysteemContactFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";

interface Stats {
  groepenTotaal: number;
  groepenActief: number;
  organisatiesTotaal: number;
  contactOngelezen: number;
}

// Voorlopig een eenvoudig overzicht met platform-brede kerncijfers -- puur
// informatief, geen beheeracties. Wordt in een latere fase uitgebreid (bv.
// recente activiteit, aanmeldingen, systeembrede "te behandelen"-signalen),
// naar analogie van het dashboard per groep (app/[groep]/beheer/page.tsx).
export default function SysteembeheerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    Promise.all([GroepFactory.getAll(), OrganisatieFactory.getAll(), SysteemContactFactory.getAll()]).then(([groepen, organisaties, berichten]) => {
      if (!actief) return;
      setStats({
        groepenTotaal: groepen.length,
        groepenActief: groepen.filter((g) => g.status === "actief").length,
        organisatiesTotaal: organisaties.length,
        contactOngelezen: berichten.filter((b) => !b.gelezen).length,
      });
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Dashboard</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Platform-brede kerncijfers. Dit scherm krijgt later meer functionaliteit (activiteit, aanmeldingen, signalen) -- voorlopig een eerste overzicht.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && stats && stats.contactOngelezen > 0 && (
        <Link href="/systeembeheer/contact" style={{ textDecoration: "none" }}>
          <div style={{ background: colors.campfireLight, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 20 }}>✉️</span>
            <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.ink, flex: 1 }}>
              {stats.contactOngelezen} nieuw{stats.contactOngelezen === 1 ? "" : "e"} contactbericht{stats.contactOngelezen === 1 ? "" : "en"}
            </span>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.campfire, fontWeight: 600 }}>Bekijken →</span>
          </div>
        </Link>
      )}

      {!loading && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
          <StatKaart label="Groepen" waarde={stats.groepenTotaal} icon="👥" href="/systeembeheer/groepen" />
          <StatKaart label="Actieve groepen" waarde={stats.groepenActief} icon="✅" href="/systeembeheer/groepen" />
          <StatKaart label="Organisaties" waarde={stats.organisatiesTotaal} icon="🧭" href="/systeembeheer/organisaties" />
          <StatKaart label="Contactberichten" waarde={stats.contactOngelezen} icon="✉️" href="/systeembeheer/contact" />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/systeembeheer/groepen" style={{ textDecoration: "none" }}>
          <div style={{ background: colors.campfireLight, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "14px 18px", fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.ink }}>
            👥 Groepen beheren →
          </div>
        </Link>
        <Link href="/systeembeheer/organisaties" style={{ textDecoration: "none" }}>
          <div style={{ background: colors.campfireLight, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "14px 18px", fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.ink }}>
            🧭 Organisaties beheren →
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatKaart({ label, waarde, icon, href }: { label: string; waarde: number; icon: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{waarde}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{label}</div>
      </div>
    </Link>
  );
}
