"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, LocationFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import AdminSubNav from "@/components/AdminSubNav";
import type { Entry, WithId } from "@/types/models";

type StatusFilter = "alle" | "goedtekeuren" | "published" | "stub";
type KampplaatsFilter = "alle" | "niet-gekoppeld";

export default function VriendenboekPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<WithId<Entry>[]>([]);
  const [gekoppeldeNamen, setGekoppeldeNamen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Voorgefilterd overzicht via query-parameters (bv. vanaf het dashboard,
  // later): gelezen als lazy initial state i.p.v. in een effect, want
  // searchParams is meteen beschikbaar bij de eerste render.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const status = searchParams.get("status");
    return status && ["alle", "goedtekeuren", "published", "stub"].includes(status) ? (status as StatusFilter) : "alle";
  });
  const [kampplaatsFilter, setKampplaatsFilter] = useState<KampplaatsFilter>(() => {
    const kampplaats = searchParams.get("kampplaats");
    return kampplaats === "niet-gekoppeld" ? "niet-gekoppeld" : "alle";
  });

  async function load() {
    setLoading(true);
    const [all, locaties] = await Promise.all([EntryFactory.getAll(groep.id), LocationFactory.getAll(groep.id)]);
    setEntries(all);
    setGekoppeldeNamen(new Set(locaties.map((l) => l.naam.trim().toLowerCase())));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([EntryFactory.getAll(groep.id), LocationFactory.getAll(groep.id)]).then(([all, locaties]) => {
      if (!actief) return;
      setEntries(all);
      setGekoppeldeNamen(new Set(locaties.map((l) => l.naam.trim().toLowerCase())));
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const isGoedTeKeuren = (entry: Entry) => entry.status === "draft" || (entry.status === "published" && entry.goedgekeurd === false);

  async function handlePublish(id: string) {
    await EntryFactory.publish(id);
    load();
  }

  async function handleUnpublish(id: string) {
    await EntryFactory.unpublish(id);
    load();
  }

  async function handleKeurGoed(id: string) {
    await EntryFactory.keurGoed(id);
    load();
  }

  async function handleDelete(entry: WithId<Entry>) {
    if (entry.status === "stub") {
      if (!confirm(`"${entry.naam}" definitief verwijderen? Dit verwijdert ook meteen de foto-tags en leidingsploeg-koppelingen van deze persoon.`)) return;
      await EntryFactory.removeStub(groep.id, entry.id);
    } else {
      if (!confirm(`"${entry.naam}" definitief verwijderen?`)) return;
      await EntryFactory.remove(entry.id, entry.scanPath);
    }
    load();
  }

  function kampplaatsStatus(entry: Entry) {
    const plaatsen = toTextArray(entry.besteKampplaats).filter(Boolean);
    if (plaatsen.length === 0) return { type: "geen" as const, linked: 0, total: 0 };
    const linked = plaatsen.filter((p) => gekoppeldeNamen.has(p.trim().toLowerCase())).length;
    if (linked === plaatsen.length) return { type: "volledig" as const, linked, total: plaatsen.length };
    if (linked === 0) return { type: "niet" as const, linked, total: plaatsen.length };
    return { type: "deels" as const, linked, total: plaatsen.length };
  }

  const gefilterd = useMemo(() => {
    return entries.filter((entry) => {
      if (statusFilter === "goedtekeuren" && !isGoedTeKeuren(entry)) return false;
      if (statusFilter === "published" && !(entry.status === "published" && entry.goedgekeurd !== false)) return false;
      if (statusFilter === "stub" && entry.status !== "stub") return false;
      if (kampplaatsFilter === "niet-gekoppeld") {
        const { type } = kampplaatsStatus(entry);
        if (type !== "niet" && type !== "deels") return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, statusFilter, kampplaatsFilter, gekoppeldeNamen]);

  const aantalGoedTeKeuren = entries.filter(isGoedTeKeuren).length;
  const aantalStub = entries.filter((e) => e.status === "stub").length;
  const aantalNietGekoppeld = entries.filter((e) => {
    const { type } = kampplaatsStatus(e);
    return type === "niet" || type === "deels";
  }).length;

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 4px" }}>Vriendenboek</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, margin: "0 0 20px" }}>
        {entries.length} formulier{entries.length === 1 ? "" : "en"} · {entries.filter((e) => e.status === "published").length} gepubliceerd
      </p>

      <AdminSubNav tabs={tabs} />

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <FilterGroup label="Status">
          <FilterButton active={statusFilter === "alle"} onClick={() => setStatusFilter("alle")}>
            Alle
          </FilterButton>
          <FilterButton active={statusFilter === "goedtekeuren"} onClick={() => setStatusFilter("goedtekeuren")}>
            Goed te keuren {aantalGoedTeKeuren > 0 && `(${aantalGoedTeKeuren})`}
          </FilterButton>
          <FilterButton active={statusFilter === "published"} onClick={() => setStatusFilter("published")}>
            Gepubliceerd
          </FilterButton>
          <FilterButton active={statusFilter === "stub"} onClick={() => setStatusFilter("stub")}>
            Getagd, geen fiche {aantalStub > 0 && `(${aantalStub})`}
          </FilterButton>
        </FilterGroup>

        <FilterGroup label="Kampplaats">
          <FilterButton active={kampplaatsFilter === "alle"} onClick={() => setKampplaatsFilter("alle")}>
            Alle
          </FilterButton>
          <FilterButton active={kampplaatsFilter === "niet-gekoppeld"} onClick={() => setKampplaatsFilter("niet-gekoppeld")}>
            Niet gekoppeld {aantalNietGekoppeld > 0 && `(${aantalNietGekoppeld})`}
          </FilterButton>
        </FilterGroup>
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gefilterd.map((entry) => {
          const kampplaatsInfo = kampplaatsStatus(entry);
          return (
            <div
              key={entry.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, flexWrap: "wrap" }}
            >
              <div>
                <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 600, color: colors.ink }}>
                  {entry.naam || "(naamloos)"}{" "}
                  <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 400, color: colors.inkMuted }}>{entry.totemnaam && `— ${entry.totemnaam}`}</span>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span>{entry.periode || "periode onbekend"}</span>
                  <span style={{ color: isGoedTeKeuren(entry) || entry.status === "stub" ? colors.campfire : colors.forest, fontWeight: 600 }}>
                    {isGoedTeKeuren(entry) ? "Goed te keuren" : entry.status === "stub" ? "Getagd, geen fiche" : "Gepubliceerd"}
                  </span>
                  <KampplaatsBadge status={kampplaatsInfo} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {entry.status !== "stub" && (
                  <>
                    <Link href={`${basis}/beheer/vriendenboek/${entry.id}`} style={btnStyleOutline}>
                      Bewerken
                    </Link>
                    {entry.status === "draft" && (
                      <button onClick={() => handlePublish(entry.id)} style={btnStyle(colors.forest)}>
                        Publiceren
                      </button>
                    )}
                    {entry.status === "published" && entry.goedgekeurd === false && (
                      <button onClick={() => handleKeurGoed(entry.id)} style={btnStyle(colors.forest)}>
                        ✓ Goedkeuren
                      </button>
                    )}
                    {entry.status === "published" && (
                      <button onClick={() => handleUnpublish(entry.id)} style={btnStyle(colors.inkMuted)}>
                        Depubliceren
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => handleDelete(entry)} style={btnStyle(colors.stamp)}>
                  Verwijderen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && gefilterd.length === 0 && entries.length > 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Geen formulieren die aan deze filters voldoen.</p>}
      {!loading && entries.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen formulieren toegevoegd.</p>}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginRight: 2 }}>{label}</span>
      {children}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${active ? colors.forest : colors.line}`, background: active ? colors.forest : "transparent", color: active ? colors.white : colors.inkMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function KampplaatsBadge({ status }: { status: { type: "geen" | "volledig" | "deels" | "niet"; linked: number; total: number } }) {
  if (status.type === "geen") return <span style={{ color: colors.inkMuted }}>· geen kampplaats ingevuld</span>;
  if (status.type === "volledig")
    return (
      <span style={{ color: colors.forest, fontWeight: 600 }}>
        · 📍 gekoppeld{status.total > 1 ? ` (${status.total})` : ""}
      </span>
    );
  if (status.type === "deels")
    return (
      <span style={{ color: colors.stamp, fontWeight: 600 }}>
        · ⚠ {status.linked}/{status.total} kampplaatsen gekoppeld
      </span>
    );
  return (
    <span style={{ color: colors.stamp, fontWeight: 600 }}>
      · ⚠ kampplaats{status.total > 1 ? "en" : ""} niet gekoppeld
    </span>
  );
}

const btnStyleOutline: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 999,
  border: `1px solid ${colors.line}`,
  color: colors.ink,
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

function btnStyle(color: string): React.CSSProperties {
  return { padding: "7px 14px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
