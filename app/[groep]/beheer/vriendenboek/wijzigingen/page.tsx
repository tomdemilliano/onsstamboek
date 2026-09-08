"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, WijzigingFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { Entry, WijzigingsVoorstel, WithId } from "@/types/models";

const VELD_LABELS: Record<string, string> = {
  naam: "Naam",
  geboortejaar: "Geboortejaar",
  totemnaam: "Totemnaam",
  periode: "Periode",
  leuksteActiviteit: "Leukste activiteit",
  besteKampplaats: "Beste kampplaats",
  lekkersteEten: "Lekkerste eten",
};

function alsTekst(waarde: unknown): string {
  if (Array.isArray(waarde)) return waarde.join(", ") || "—";
  return (waarde as string) || "—";
}

export default function WijzigingenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  const [voorstellen, setVoorstellen] = useState<WithId<WijzigingsVoorstel>[]>([]);
  const [entries, setEntries] = useState<Record<string, WithId<Entry> | null>>({});
  const [loading, setLoading] = useState(true);
  const [bezigVoor, setBezigVoor] = useState<string | null>(null);

  async function haalOp() {
    const lijst = await WijzigingFactory.getAll(groep.id);
    const ontbrekendeIds = [...new Set(lijst.map((v) => v.entryId))];
    const opgehaald = await Promise.all(ontbrekendeIds.map((id) => EntryFactory.getById(id)));
    const map: Record<string, WithId<Entry> | null> = {};
    ontbrekendeIds.forEach((id, i) => (map[id] = opgehaald[i]));
    return { lijst, map };
  }

  async function load() {
    setLoading(true);
    const { lijst, map } = await haalOp();
    setVoorstellen(lijst);
    setEntries(map);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    haalOp().then(({ lijst, map }) => {
      if (!actief) return;
      setVoorstellen(lijst);
      setEntries(map);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groep.id]);

  // Vanuit het activiteitenlog rechtstreeks naar het voorstel voor een
  // bepaalde fiche springen.
  const gemarkeerdeEntryId = searchParams.get("entry");
  useEffect(() => {
    if (loading || !gemarkeerdeEntryId) return;
    const timer = setTimeout(() => {
      document.getElementById(`voorstel-entry-${gemarkeerdeEntryId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, gemarkeerdeEntryId]);

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  async function handleGoedkeuren(voorstel: WithId<WijzigingsVoorstel>) {
    setBezigVoor(voorstel.id);
    try {
      await WijzigingFactory.goedkeuren(voorstel);
      await load();
    } finally {
      setBezigVoor(null);
    }
  }

  async function handleWeigeren(voorstel: WithId<WijzigingsVoorstel>) {
    if (!confirm("Dit wijzigingsvoorstel weigeren? De fiche blijft dan ongewijzigd.")) return;
    setBezigVoor(voorstel.id);
    try {
      await WijzigingFactory.weigeren(voorstel.id);
      await load();
    } finally {
      setBezigVoor(null);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Vriendenboek</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Wijzigingsvoorstellen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Bezoekers stelden deze wijzigingen voor op een al gepubliceerde fiche. Goedkeuren past de fiche meteen aan; weigeren laat ze ongewijzigd.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && voorstellen.length === 0 && (
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", fontFamily: fonts.body, fontSize: 14, color: colors.forest, fontWeight: 600 }}>
          🎉 Geen openstaande wijzigingsvoorstellen.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {voorstellen.map((voorstel) => {
          const huidig = entries[voorstel.entryId];
          const gewijzigdeVelden = Object.keys(VELD_LABELS).filter((veld) => {
            if (!huidig) return true;
            const oud = (huidig as unknown as Record<string, unknown>)[veld];
            const nieuw = (voorstel as unknown as Record<string, unknown>)[veld];
            if (Array.isArray(oud) || Array.isArray(nieuw)) {
              return ((oud as string[]) || []).join("|") !== ((nieuw as string[]) || []).join("|");
            }
            return (oud || "") !== (nieuw || "");
          });

          return (
            <div
              key={voorstel.id}
              id={`voorstel-entry-${voorstel.entryId}`}
              style={{
                background: colors.campfireLight,
                border: `1.5px dashed ${colors.campfire}`,
                borderRadius: radius.card,
                padding: "16px 18px",
                outline: gemarkeerdeEntryId === voorstel.entryId ? `3px solid ${colors.forest}` : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.ink }}>{huidig ? huidig.naam : "(fiche niet gevonden)"}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>Ingediend door: {voorstel.email}</div>
              </div>

              {!huidig ? (
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.stamp }}>De onderliggende fiche bestaat niet meer — dit voorstel kan enkel nog geweigerd (verwijderd) worden.</p>
              ) : gewijzigdeVelden.length === 0 ? (
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Geen verschil met de huidige fiche.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {gewijzigdeVelden.map((veld) => (
                    <div key={veld} style={{ fontFamily: fonts.body, fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: colors.ink }}>{VELD_LABELS[veld]}: </span>
                      <span style={{ color: colors.stamp, textDecoration: "line-through" }}>{alsTekst((huidig as unknown as Record<string, unknown>)[veld])}</span>
                      {" → "}
                      <span style={{ color: colors.forest, fontWeight: 600 }}>{alsTekst((voorstel as unknown as Record<string, unknown>)[veld])}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {huidig && (
                  <button onClick={() => handleGoedkeuren(voorstel)} disabled={bezigVoor === voorstel.id} style={btn(colors.forest)}>
                    {bezigVoor === voorstel.id ? "Bezig..." : "✓ Goedkeuren"}
                  </button>
                )}
                <button onClick={() => handleWeigeren(voorstel)} disabled={bezigVoor === voorstel.id} style={btn(colors.stamp)}>
                  Weigeren
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { padding: "8px 18px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
