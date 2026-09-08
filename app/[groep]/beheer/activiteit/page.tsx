"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { ActivityFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Activiteit, ActiviteitType, WithId } from "@/types/models";

const TYPE_ICOON: Record<ActiviteitType, string> = {
  foto: "📷",
  leiding: "👥",
  kampplaats: "📍",
  mijlpaal: "🚩",
  entry: "📖",
  overig: "✏️",
};

const TYPE_LABEL: Record<ActiviteitType, string> = {
  foto: "Foto's",
  leiding: "Leidingsploegen",
  kampplaats: "Kampplaatsen",
  mijlpaal: "Mijlpalen",
  entry: "Vriendenboekje",
  overig: "Overig",
};

function laatsteDagen(n: number): string[] {
  const dagen: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dagen.push(d.toISOString().slice(0, 10));
  }
  return dagen;
}

function relatieveTijd(seconds?: number): string {
  if (!seconds) return "";
  const nu = Date.now() / 1000;
  const verschil = nu - seconds;
  if (verschil < 60) return "net nu";
  if (verschil < 3600) return `${Math.floor(verschil / 60)} min. geleden`;
  if (verschil < 86400) return `${Math.floor(verschil / 3600)} u geleden`;
  const dagen = Math.floor(verschil / 86400);
  if (dagen === 1) return "gisteren";
  if (dagen < 14) return `${dagen} dagen geleden`;
  return new Date(seconds * 1000).toLocaleDateString("nl-BE");
}

function createdAtSeconds(a: WithId<Activiteit>): number | undefined {
  return (a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds;
}

export default function ActiviteitPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [data, setData] = useState<WithId<Activiteit>[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ActiviteitType | "alle">("alle");
  // "Nu" wordt hier opgeslagen i.p.v. rechtstreeks Date.now() te lezen
  // tijdens het renderen -- dat laatste is een onzuivere aanroep binnen de
  // render-body, ook binnen een useMemo (react-hooks/purity).
  const [nu, setNu] = useState<number | null>(null);

  useEffect(() => {
    let actief = true;
    ActivityFactory.getAll(groep.id).then((d) => {
      if (!actief) return;
      setData(d);
      setNu(Date.now() / 1000);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const dagen30 = useMemo(() => laatsteDagen(30), []);
  const perDag = useMemo(() => {
    const map: Record<string, number> = {};
    dagen30.forEach((d) => (map[d] = 0));
    data.forEach((a) => {
      const seconds = createdAtSeconds(a);
      const dag = seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : null;
      if (dag && map[dag] !== undefined) map[dag] += 1;
    });
    return dagen30.map((d) => ({ dag: d, aantal: map[d] }));
  }, [data, dagen30]);
  const maxPerDag = Math.max(1, ...perDag.map((r) => r.aantal));

  const { vandaag, dezeWeek, dezeMaand } = useMemo(() => {
    if (nu == null) return { vandaag: 0, dezeWeek: 0, dezeMaand: 0 };
    return {
      vandaag: data.filter((a) => nu - (createdAtSeconds(a) || 0) < 24 * 60 * 60).length,
      dezeWeek: data.filter((a) => nu - (createdAtSeconds(a) || 0) < 7 * 24 * 60 * 60).length,
      dezeMaand: data.filter((a) => nu - (createdAtSeconds(a) || 0) < 30 * 24 * 60 * 60).length,
    };
  }, [data, nu]);

  const perType = useMemo(() => {
    const map: Partial<Record<ActiviteitType, number>> = {};
    data.forEach((a) => {
      map[a.type] = (map[a.type] || 0) + 1;
    });
    return map;
  }, [data]);

  const gefilterd = typeFilter === "alle" ? data : data.filter((a) => a.type === typeFilter);

  function linkVoor(a: WithId<Activiteit>): string | null {
    if (a.type === "foto") {
      return a.itemId ? `${basis}/beheer/fotos?foto=${a.itemId}` : `${basis}/beheer/fotos`;
    }
    if (a.type === "entry") {
      // Een voorgestelde wijziging op een reeds gepubliceerde fiche wordt
      // elders beheerd (aparte wachtrij) dan een nieuwe/gekoppelde fiche.
      if (a.actie && a.actie.startsWith("Wijziging voorgesteld")) {
        return a.itemId ? `${basis}/beheer/vriendenboek/wijzigingen?entry=${a.itemId}` : `${basis}/beheer/vriendenboek/wijzigingen`;
      }
      return a.itemId ? `${basis}/beheer/vriendenboek/${a.itemId}` : `${basis}/beheer/vriendenboek`;
    }
    if (a.type === "leiding" && a.itemId) {
      const [takId, jaarStr] = a.itemId.split("_");
      if (takId && jaarStr) return `${basis}/beheer/tijdlijn/leiding?tak=${takId}&jaar=${jaarStr}`;
      return `${basis}/beheer/tijdlijn/leiding`;
    }
    if (a.type === "kampplaats") {
      return a.itemId ? `${basis}/beheer/kampplaatsen/extra?locatie=${a.itemId}` : `${basis}/beheer/kampplaatsen/extra`;
    }
    if (a.type === "mijlpaal") {
      return a.itemId ? `${basis}/beheer/tijdlijn?mijlpaal=${a.itemId}` : `${basis}/beheer/tijdlijn`;
    }
    return null;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Activiteit van bezoekers</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 24 }}>
        Alle wijzigingen die bezoekers zelf deden (foto&apos;s taggen/draaien, leidingsploegen invullen, nieuwe voorstellen...) — je eigen bewerkingen als beheerder worden hier niet in meegeteld.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 32 }}>
            <StatKaart label="Vandaag" waarde={vandaag} />
            <StatKaart label="Deze week" waarde={dezeWeek} />
            <StatKaart label="Deze maand" waarde={dezeMaand} />
            <StatKaart label="All-time" waarde={data.length} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <SectieTitel>Per dag (laatste 30 dagen)</SectieTitel>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
              {perDag.map((r) => (
                <div
                  key={r.dag}
                  title={`${r.dag}: ${r.aantal} wijziging${r.aantal === 1 ? "" : "en"}`}
                  style={{ flex: 1, height: `${Math.max((r.aantal / maxPerDag) * 100, r.aantal > 0 ? 4 : 1)}%`, background: r.aantal > 0 ? colors.forest : colors.line, borderRadius: "2px 2px 0 0", minWidth: 2 }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 4 }}>
              <span>{dagen30[0]}</span>
              <span>{dagen30[dagen30.length - 1]}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <SectieTitel>Verdeling per onderdeel</SectieTitel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.entries(TYPE_LABEL) as [ActiviteitType, string][]).map(
                ([type, label]) =>
                  (perType[type] ?? 0) > 0 && (
                    <div key={type} style={{ padding: "6px 12px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.badge, fontFamily: fonts.body, fontSize: 12, color: colors.ink }}>
                      {TYPE_ICOON[type]} {label}: <strong>{perType[type]}</strong>
                    </div>
                  )
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectieTitel>Recente activiteit</SectieTitel>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ActiviteitType | "alle")} style={selectStyle}>
              <option value="alle">Alles</option>
              {(Object.entries(TYPE_LABEL) as [ActiviteitType, string][]).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gefilterd.slice(0, 100).map((a) => {
              const href = linkVoor(a);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card }}>
                  {a.afbeeldingUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.afbeeldingUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: radius.input, flexShrink: 0 }} />
                  ) : (
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICOON[a.type] || "✏️"}</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.ink }}>{a.actie}</div>
                    {a.omschrijving && (
                      <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.omschrijving}</div>
                    )}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, flexShrink: 0, textAlign: "right" }}>
                    {relatieveTijd(createdAtSeconds(a))}
                    {href && (
                      <div>
                        <Link href={href} target="_blank" style={{ color: colors.forest, fontWeight: 600 }}>
                          bekijken →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {gefilterd.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen activiteit.</p>}
          {gefilterd.length > 100 && <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 10 }}>Enkel de meest recente 100 worden getoond.</p>}
        </>
      )}
    </div>
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}

function StatKaart({ label, waarde }: { label: string; waarde: number }) {
  return (
    <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
      <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{waarde}</div>
      <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{label}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 12,
  color: colors.ink,
};
