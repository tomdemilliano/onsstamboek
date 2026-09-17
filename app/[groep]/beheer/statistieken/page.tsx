"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { StatsFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";

interface DagBezoek {
  dag: string;
  aantal: number;
}

interface PaginaBezoek {
  pad: string;
  aantal: number;
}

interface BezoekStats {
  totaal30: number;
  totaalAllerTijden: number;
  perDag: DagBezoek[];
  topPaginas: PaginaBezoek[];
}

function laatsteDagen(n: number): string[] {
  const dagen: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dagen.push(d.toISOString().slice(0, 10));
  }
  return dagen;
}

export default function StatistiekenPage() {
  const groep = useGroep();

  const [loading, setLoading] = useState(true);
  const [bezoekStats, setBezoekStats] = useState<BezoekStats | null>(null);

  useEffect(() => {
    let actief = true;
    StatsFactory.getAll(groep.id).then((bezoeken) => {
      if (!actief) return;

      const dagen30 = laatsteDagen(30);
      const perDagMap: Record<string, number> = {};
      dagen30.forEach((d) => (perDagMap[d] = 0));
      const paginaMap: Record<string, number> = {};
      let totaalAllerTijden = 0;
      bezoeken.forEach((r) => {
        totaalAllerTijden += r.aantal || 0;
        if (perDagMap[r.dag] !== undefined) perDagMap[r.dag] += r.aantal || 0;
        paginaMap[r.pad] = (paginaMap[r.pad] || 0) + (r.aantal || 0);
      });
      const perDag = dagen30.map((dag) => ({ dag, aantal: perDagMap[dag] }));
      const topPaginas = Object.entries(paginaMap)
        .map(([pad, aantal]) => ({ pad, aantal }))
        .sort((a, b) => b.aantal - a.aantal)
        .slice(0, 10);
      setBezoekStats({
        totaal30: perDag.reduce((som, r) => som + r.aantal, 0),
        totaalAllerTijden,
        perDag,
        topPaginas,
      });
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 24px" }}>Statistieken</h1>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && bezoekStats && (
        <div>
          <SectieTitel>Bezoekerstatistieken</SectieTitel>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: -4, marginBottom: 16 }}>
            Enkel het aantal paginabezoeken per dag wordt geteld -- geen individuele bezoekers of IP-adressen.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
              <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{bezoekStats.totaal30}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>Bezoeken (30 dagen)</div>
            </div>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
              <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{bezoekStats.totaalAllerTijden}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>Bezoeken (all-time)</div>
            </div>
          </div>

          <div
            style={{
              background: colors.paperCard,
              border: `1px solid ${colors.line}`,
              borderRadius: radius.card,
              padding: "18px 20px",
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 120,
              marginBottom: 4,
            }}
          >
            {(() => {
              const maxPerDag = Math.max(1, ...bezoekStats.perDag.map((r) => r.aantal));
              return bezoekStats.perDag.map((r) => (
                <div
                  key={r.dag}
                  title={`${r.dag}: ${r.aantal} bezoek${r.aantal === 1 ? "" : "en"}`}
                  style={{
                    flex: 1,
                    height: `${Math.max((r.aantal / maxPerDag) * 100, r.aantal > 0 ? 4 : 1)}%`,
                    background: r.aantal > 0 ? colors.forest : colors.line,
                    borderRadius: "2px 2px 0 0",
                    minWidth: 2,
                  }}
                />
              ));
            })()}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginBottom: 20 }}>
            <span>{bezoekStats.perDag[0]?.dag}</span>
            <span>{bezoekStats.perDag[bezoekStats.perDag.length - 1]?.dag}</span>
          </div>

          <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>
            Meest bezochte pagina&apos;s
          </div>
          {bezoekStats.topPaginas.length === 0 ? (
            <p style={{ fontFamily: fonts.body, color: colors.inkMuted, fontSize: 13 }}>Nog geen data.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bezoekStats.topPaginas.map((r) => (
                <div
                  key={r.pad}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 14px",
                    background: colors.paperCard,
                    border: `1px solid ${colors.line}`,
                    borderRadius: radius.card,
                    fontFamily: fonts.body,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: colors.ink, fontWeight: 600 }}>{r.pad}</span>
                  <span style={{ color: colors.forest, fontWeight: 700 }}>{r.aantal}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}
