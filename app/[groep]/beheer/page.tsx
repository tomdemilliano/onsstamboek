"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { StatsFactory } from "@/lib/dbSchema";
import { fetchAdminOverzichtData } from "@/lib/adminOverzichtData";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import type { Entry, WithId } from "@/types/models";

interface Todo {
  href: string;
  label: string;
  icon: string;
}

interface BezoekStats {
  totaal30: number;
  totaalAllerTijden: number;
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

export default function BeheerDashboard() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [bezoekStats, setBezoekStats] = useState<BezoekStats | null>(null);

  useEffect(() => {
    let actief = true;
    Promise.all([fetchAdminOverzichtData(groep.id), StatsFactory.getAll(groep.id)]).then(([overzicht, bezoeken]) => {
      if (!actief) return;
      const { entries, locaties, extraLocaties, mijlpalen, fotos, wijzigingen, contactBerichten, leidingsploegen } = overzicht;

      const dagen30 = laatsteDagen(30);
      const perDagMap: Record<string, number> = {};
      dagen30.forEach((d) => (perDagMap[d] = 0));
      let totaalAllerTijden = 0;
      bezoeken.forEach((r) => {
        totaalAllerTijden += r.aantal || 0;
        if (perDagMap[r.dag] !== undefined) perDagMap[r.dag] += r.aantal || 0;
      });
      const totaal30 = Object.values(perDagMap).reduce((som, aantal) => som + aantal, 0);
      setBezoekStats({ totaal30, totaalAllerTijden });

      const isGoedTeKeuren = (e: WithId<Entry>) => e.status === "draft" || (e.status === "published" && e.goedgekeurd === false);
      const conceptEntries = entries.filter(isGoedTeKeuren);

      const gekoppeldeNamen = new Set(locaties.map((l) => l.naam.trim().toLowerCase()));
      const entriesNietGekoppeld = entries.filter((entry) => {
        const plaatsen = toTextArray(entry.besteKampplaats).filter(Boolean);
        if (plaatsen.length === 0) return false;
        return plaatsen.some((p) => !gekoppeldeNamen.has(p.trim().toLowerCase()));
      });

      const extraPending = extraLocaties.filter((l) => l.status === "pending");
      const mijlpalenPending = mijlpalen.filter((m) => m.status === "pending");

      const fotosPending = fotos.filter((f) => f.status === "pending");
      const fotosVerwijderVerzoek = fotos.filter((f) => f.status === "published" && f.verwijderVerzoek);

      const lijst: Todo[] = [];
      if (!groep.organisatieId) {
        lijst.push({
          href: `${basis}/beheer/instellingen`,
          label: "Nog geen organisatie gekoppeld -- nodig voor gedeelde jaarkentekens en scouting-brede mijlpalen op de tijdlijn",
          icon: "🔗",
        });
      }
      if (conceptEntries.length > 0) {
        lijst.push({
          href: `${basis}/beheer/vriendenboek?status=goedtekeuren`,
          label: `${conceptEntries.length} vriendenboek-formulier${conceptEntries.length === 1 ? "" : "en"} goed te keuren`,
          icon: "📖",
        });
      }
      if (entriesNietGekoppeld.length > 0) {
        lijst.push({
          href: `${basis}/beheer/kampplaatsen`,
          label: `${entriesNietGekoppeld.length} kampplaats${entriesNietGekoppeld.length === 1 ? "" : "en"} nog niet (volledig) gekoppeld aan de kaart`,
          icon: "📍",
        });
      }
      if (extraPending.length > 0) {
        lijst.push({
          href: `${basis}/beheer/kampplaatsen/extra`,
          label: `${extraPending.length} extra kampplaats${extraPending.length === 1 ? "" : "en"} wachten op goedkeuring`,
          icon: "🗺️",
        });
      }
      if (mijlpalenPending.length > 0) {
        lijst.push({
          href: `${basis}/beheer/tijdlijn`,
          label: `${mijlpalenPending.length} mijlpaal${mijlpalenPending.length === 1 ? "" : "en"} wachten op goedkeuring`,
          icon: "🚩",
        });
      }
      if (fotosPending.length > 0) {
        lijst.push({
          href: `${basis}/beheer/fotos`,
          label: `${fotosPending.length} foto${fotosPending.length === 1 ? "" : "'s"} wachten op goedkeuring`,
          icon: "📷",
        });
      }
      if (fotosVerwijderVerzoek.length > 0) {
        lijst.push({
          href: `${basis}/beheer/fotos`,
          label: `${fotosVerwijderVerzoek.length} verwijderverzoek${fotosVerwijderVerzoek.length === 1 ? "" : "en"} voor foto's`,
          icon: "🗑️",
        });
      }
      if (wijzigingen.length > 0) {
        lijst.push({
          href: `${basis}/beheer/vriendenboek/wijzigingen`,
          label: `${wijzigingen.length} wijzigingsvoorstel${wijzigingen.length === 1 ? "" : "len"} om na te kijken`,
          icon: "✏️",
        });
      }
      const leidingGoedTeKeuren = leidingsploegen.filter((l) => l.goedgekeurd === false);
      if (leidingGoedTeKeuren.length > 0) {
        lijst.push({
          href: `${basis}/beheer/tijdlijn/leiding`,
          label: `${leidingGoedTeKeuren.length} leidingsploeg${leidingGoedTeKeuren.length === 1 ? "" : "en"} wacht${leidingGoedTeKeuren.length === 1 ? "" : "en"} op goedkeuring`,
          icon: "👥",
        });
      }
      const ongelezenContact = contactBerichten.filter((b) => !b.gelezen);
      if (ongelezenContact.length > 0) {
        lijst.push({
          href: `${basis}/beheer/contact`,
          label: `${ongelezenContact.length} nieuw${ongelezenContact.length === 1 ? "" : "e"} contactbericht${ongelezenContact.length === 1 ? "" : "en"}`,
          icon: "✉️",
        });
      }
      setTodos(lijst);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id, groep.organisatieId, basis]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 24px" }}>
        Dashboard — {groep.naam}
      </h1>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && (
        <>
          <div style={{ marginBottom: 32 }}>
            <SectieTitel>Te behandelen</SectieTitel>
            {todos.length === 0 ? (
              <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", fontFamily: fonts.body, fontSize: 14, color: colors.forest, fontWeight: 600 }}>
                🎉 Alles is bijgewerkt — niets wacht op actie.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todos.map((todo, i) => (
                  <Link key={i} href={todo.href} style={{ textDecoration: "none" }}>
                    <div style={{ background: colors.campfireLight, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{todo.icon}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.ink, flex: 1 }}>{todo.label}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.campfire, fontWeight: 600, whiteSpace: "nowrap" }}>Bekijken →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {bezoekStats && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <SectieTitel>Bezoekers</SectieTitel>
                <Link href={`${basis}/beheer/statistieken`} style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "underline" }}>
                  Alle statistieken →
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
                  <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{bezoekStats.totaal30}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>Bezoeken (30 dagen)</div>
                </div>
                <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 14px" }}>
                  <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink }}>{bezoekStats.totaalAllerTijden}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>Bezoeken (all-time)</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}
