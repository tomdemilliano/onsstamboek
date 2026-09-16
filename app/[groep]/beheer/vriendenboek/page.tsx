"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, FeedbackFactory, LocationFactory, PhotoFactory, LeidingFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import AdminSubNav from "@/components/AdminSubNav";
import type { Entry, Photo, Leidingsploeg, WithId } from "@/types/models";

type StatusFilter = "alle" | "goedtekeuren" | "published" | "stub";

export default function VriendenboekPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<WithId<Entry>[]>([]);
  const [gekoppeldeNamen, setGekoppeldeNamen] = useState<Set<string>>(new Set());
  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [leidingsploegen, setLeidingsploegen] = useState<WithId<Leidingsploeg>[]>([]);
  const [loading, setLoading] = useState(true);
  // Voorgefilterd overzicht via query-parameters (bv. vanaf het dashboard,
  // later): gelezen als lazy initial state i.p.v. in een effect, want
  // searchParams is meteen beschikbaar bij de eerste render.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const status = searchParams.get("status");
    return status && ["alle", "goedtekeuren", "published", "stub"].includes(status) ? (status as StatusFilter) : "alle";
  });
  const [zoekterm, setZoekterm] = useState("");

  async function load() {
    setLoading(true);
    const [all, locaties, fotoData, leidingData] = await Promise.all([
      EntryFactory.getAll(groep.id),
      LocationFactory.getAll(groep.id),
      PhotoFactory.getAllAdmin(groep.id),
      LeidingFactory.getAll(groep.id),
    ]);
    setEntries(all);
    setGekoppeldeNamen(new Set(locaties.map((l) => l.naam.trim().toLowerCase())));
    setFotos(fotoData);
    setLeidingsploegen(leidingData);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([EntryFactory.getAll(groep.id), LocationFactory.getAll(groep.id), PhotoFactory.getAllAdmin(groep.id), LeidingFactory.getAll(groep.id)]).then(
      ([all, locaties, fotoData, leidingData]) => {
        if (!actief) return;
        setEntries(all);
        setGekoppeldeNamen(new Set(locaties.map((l) => l.naam.trim().toLowerCase())));
        setFotos(fotoData);
        setLeidingsploegen(leidingData);
        setLoading(false);
      }
    );
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const isGoedTeKeuren = (entry: Entry) => entry.status === "draft" || (entry.status === "published" && entry.goedgekeurd === false);

  async function handlePublish(entry: WithId<Entry>) {
    await EntryFactory.publish(entry.id);
    await FeedbackFactory.stuur({ groepId: groep.id, categorie: "fiche", actie: "goedgekeurd", ontvangerEmail: entry.email, referentie: entry.naam });
    load();
  }

  async function handleUnpublish(id: string) {
    await EntryFactory.unpublish(id);
    load();
  }

  async function handleKeurGoed(entry: WithId<Entry>) {
    await EntryFactory.keurGoed(entry.id);
    await FeedbackFactory.stuur({ groepId: groep.id, categorie: "fiche", actie: "goedgekeurd", ontvangerEmail: entry.email, referentie: entry.naam });
    load();
  }

  async function handleDelete(entry: WithId<Entry>) {
    if (entry.status === "stub") {
      if (!confirm(`"${entry.naam}" definitief verwijderen? Dit verwijdert ook meteen de foto-tags en leidingsploeg-koppelingen van deze persoon.`)) return;
      await EntryFactory.removeStub(groep.id, entry.id);
    } else {
      if (!confirm(`"${entry.naam}" definitief verwijderen?`)) return;
      await EntryFactory.remove(entry.id, entry.scanPath);
      // Enkel als "afgewezen" melden als het nog een openstaande inzending
      // was -- het verwijderen van een reeds goedgekeurde, gepubliceerde
      // fiche is gewone opkuis, geen afwijzing van een indiening.
      if (entry.goedgekeurd !== true) {
        await FeedbackFactory.stuur({ groepId: groep.id, categorie: "fiche", actie: "afgewezen", ontvangerEmail: entry.email, referentie: entry.naam });
      }
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

  const fotoCountByEntry = useMemo(() => {
    const map = new Map<string, number>();
    for (const foto of fotos) {
      for (const id of foto.taggedEntryIds || []) map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  }, [fotos]);

  const leidingCountByEntry = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of leidingsploegen) {
      for (const lid of item.leden || []) {
        if (lid.entryId) map.set(lid.entryId, (map.get(lid.entryId) || 0) + 1);
      }
    }
    return map;
  }, [leidingsploegen]);

  const gefilterd = useMemo(() => {
    const term = zoekterm.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter === "goedtekeuren" && !isGoedTeKeuren(entry)) return false;
      if (statusFilter === "published" && !(entry.status === "published" && entry.goedgekeurd !== false)) return false;
      if (statusFilter === "stub" && entry.status !== "stub") return false;
      if (term) {
        const naam = (entry.naam || "").trim().toLowerCase();
        const totem = (entry.totemnaam || "").trim().toLowerCase();
        if (!naam.includes(term) && !totem.includes(term)) return false;
      }
      return true;
    });
  }, [entries, statusFilter, zoekterm]);

  const aantalGoedTeKeuren = entries.filter(isGoedTeKeuren).length;
  const aantalStub = entries.filter((e) => e.status === "stub").length;

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/bulk-upload`, label: "+ Meerdere scans" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 4px" }}>Vriendenboek</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, margin: "0 0 20px" }}>
        {gefilterd.length === entries.length ? (
          <>
            {entries.length} formulier{entries.length === 1 ? "" : "en"}
          </>
        ) : (
          <>
            {gefilterd.length} van {entries.length} formulier{entries.length === 1 ? "" : "en"} getoond
          </>
        )}
        {" · "}
        {entries.filter((e) => e.status === "published").length} gepubliceerd
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

        <input
          type="text"
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          placeholder="Zoek op naam of totemnaam..."
          style={{
            padding: "8px 12px",
            borderRadius: radius.input,
            border: `1px solid ${colors.line}`,
            background: colors.white,
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.ink,
            boxSizing: "border-box",
            minWidth: 220,
            flex: "0 1 260px",
          }}
        />
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gefilterd.map((entry) => {
          const kampplaatsInfo = kampplaatsStatus(entry);
          const aantalFotos = fotoCountByEntry.get(entry.id) || 0;
          const aantalLeiding = leidingCountByEntry.get(entry.id) || 0;
          return (
            <div
              key={entry.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, flexWrap: "wrap" }}
            >
              <div>
                <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 600, color: colors.ink, display: "flex", alignItems: "center", gap: 6 }}>
                  {entry.naam || "(naamloos)"}{" "}
                  <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 400, color: colors.inkMuted }}>{entry.totemnaam && `— ${entry.totemnaam}`}</span>
                  {entry.email && (
                    <span title={`E-mailadres bekend: ${entry.email}`} aria-label="E-mailadres bekend" style={{ fontSize: 13 }}>
                      ✉️
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span>{entry.periode || "periode onbekend"}</span>
                  <span style={{ color: isGoedTeKeuren(entry) || entry.status === "stub" ? colors.campfire : colors.forest, fontWeight: 600 }}>
                    {isGoedTeKeuren(entry) ? "Goed te keuren" : entry.status === "stub" ? "Getagd, geen fiche" : "Gepubliceerd"}
                  </span>
                  <KampplaatsBadge status={kampplaatsInfo} />
                  {aantalFotos > 0 && <span>· 📷 {aantalFotos}</span>}
                  {aantalLeiding > 0 && <span>· 👥 {aantalLeiding}</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <IconKnop titel="Bewerken" icon="✏️" kleur={colors.ink} outline href={`${basis}/beheer/vriendenboek/${entry.id}`} />
                {entry.status === "draft" && <IconKnop titel="Publiceren" icon="📤" kleur={colors.forest} onClick={() => handlePublish(entry)} />}
                {entry.status === "published" && entry.goedgekeurd === false && <IconKnop titel="Goedkeuren" icon="✅" kleur={colors.forest} onClick={() => handleKeurGoed(entry)} />}
                {entry.status === "published" && <IconKnop titel="Depubliceren" icon="⏸" kleur={colors.inkMuted} onClick={() => handleUnpublish(entry.id)} />}
                <IconKnop titel="Verwijderen" icon="🗑️" kleur={colors.stamp} onClick={() => handleDelete(entry)} />
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

/** Compacte icoon-knop voor de actierij per fiche -- title/aria-label i.p.v. tekst, om plaats te sparen op een rij die al veel info toont. */
function IconKnop({
  titel,
  icon,
  kleur,
  onClick,
  href,
  outline,
}: {
  titel: string;
  icon: string;
  kleur: string;
  onClick?: () => void;
  href?: string;
  outline?: boolean;
}) {
  const stijl: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: outline ? `1.5px solid ${colors.line}` : "none",
    background: outline ? colors.white : kleur,
    color: outline ? kleur : colors.white,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    flexShrink: 0,
  };
  if (href) {
    return (
      <Link href={href} title={titel} aria-label={titel} style={stijl}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} title={titel} aria-label={titel} style={stijl}>
      {icon}
    </button>
  );
}
