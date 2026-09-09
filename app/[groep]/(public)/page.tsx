"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import {
  EntryFactory,
  LocationFactory,
  ExtraLocationFactory,
  LeidingFactory,
  PhotoFactory,
  GroepMijlpaalFactory,
  OrganisatieMijlpaalFactory,
} from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { LANDING_ASPECT_RATIO, landingsafbeeldingStyle } from "@/lib/landingsafbeelding";

interface Stats {
  leden: number;
  kampplaatsen: number;
  leidingsploegen: number;
  fotos: number;
}

interface Weetje {
  jaar: number;
  titel: string;
  beschrijving?: string;
  type: "scouting" | "groep";
}

export default function GroepLanding() {
  const groep = useGroep();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weetjes, setWeetjes] = useState<Weetje[]>([]);
  const [weetje, setWeetje] = useState<Weetje | null>(null);

  useEffect(() => {
    let actief = true;
    Promise.all([
      EntryFactory.getPublished(groep.id),
      LocationFactory.getAll(groep.id),
      ExtraLocationFactory.getPublished(groep.id),
      LeidingFactory.getAll(groep.id),
      PhotoFactory.getPublished(groep.id),
      GroepMijlpaalFactory.getPublished(groep.id),
      groep.organisatieId ? OrganisatieMijlpaalFactory.getPublished(groep.organisatieId) : Promise.resolve([]),
    ]).then(([entries, locaties, extraLocaties, leiding, fotos, groepMijlpalen, organisatieMijlpalen]) => {
      if (!actief) return;

      const gekoppeldeKampplaatsen = locaties.filter((l) => !l.genegeerd && l.lat != null && l.lng != null).length;

      setStats({
        leden: entries.length,
        kampplaatsen: gekoppeldeKampplaatsen + extraLocaties.length,
        leidingsploegen: leiding.filter((l) => (l.leden || []).length > 0).length,
        fotos: fotos.length,
      });

      const alleWeetjes: Weetje[] = [
        ...groepMijlpalen.map((m) => ({ jaar: m.jaar, titel: m.titel, beschrijving: m.beschrijving, type: "groep" as const })),
        ...organisatieMijlpalen.map((m) => ({ jaar: m.jaar, titel: m.titel, beschrijving: m.beschrijving, type: "scouting" as const })),
      ];
      setWeetjes(alleWeetjes);
      if (alleWeetjes.length > 0) setWeetje(alleWeetjes[Math.floor(Math.random() * alleWeetjes.length)]);

      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id, groep.organisatieId]);

  function toonAnderWeetje() {
    if (weetjes.length < 2) return;
    let volgende = weetje;
    while (volgende === weetje) {
      volgende = weetjes[Math.floor(Math.random() * weetjes.length)];
    }
    setWeetje(volgende);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 100px" }}>
      {groep.landingsafbeeldingUrl && (
        <div style={{ width: "100%", aspectRatio: LANDING_ASPECT_RATIO, borderRadius: radius.card, overflow: "hidden", marginTop: 24, border: `1px solid ${colors.line}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={groep.landingsafbeeldingUrl} alt="" style={landingsafbeeldingStyle(groep.landingsafbeeldingPositie)} />
        </div>
      )}

      <div style={{ textAlign: "center", padding: "32px 0 8px" }}>
        <p style={{ fontFamily: fonts.body, fontSize: 16, color: colors.ink }}>Welkom op het stamboek van {groep.naam}.</p>
      </div>

      {!loading && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, margin: "28px 0" }}>
          {groep.gemeente && <StatKaart label="Gemeente" waarde={groep.gemeente} icon="📍" />}
          <StatKaart label="Leden" waarde={stats.leden} icon="📖" />
          <StatKaart label="Kampplaatsen" waarde={stats.kampplaatsen} icon="🏕️" />
          <StatKaart label="Leidingsploegen" waarde={stats.leidingsploegen} icon="👥" />
          <StatKaart label="Foto's" waarde={stats.fotos} icon="📷" />
        </div>
      )}

      {weetje && (
        <div
          style={{
            marginTop: 20,
            background: colors.campfireLight,
            border: `1.5px dashed ${colors.campfire}`,
            borderRadius: radius.card,
            padding: "20px 22px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.campfire, marginBottom: 8 }}>
            💡 Wist je dat...
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 700, color: colors.ink, marginBottom: weetje.beschrijving ? 6 : 0 }}>
            {weetje.jaar} — {weetje.titel}
          </div>
          {weetje.beschrijving && <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, margin: 0, lineHeight: 1.5 }}>{weetje.beschrijving}</p>}
          {weetjes.length > 1 && (
            <button
              onClick={toonAnderWeetje}
              style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.campfire, textDecoration: "underline" }}
            >
              🎲 Nog een weetje
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatKaart({ label, waarde, icon }: { label: string; waarde: number | string; icon: string }) {
  return (
    <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{waarde}</div>
      <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{label}</div>
    </div>
  );
}
