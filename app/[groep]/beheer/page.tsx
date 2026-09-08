"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import {
  EntryFactory,
  LocationFactory,
  ExtraLocationFactory,
  GroepMijlpaalFactory,
  LinkFactory,
  PhotoFactory,
  WijzigingFactory,
} from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import type { Entry, WithId } from "@/types/models";

interface Stats {
  entriesGepubliceerd: number;
  entriesConcept: number;
  entriesStub: number;
  kampplaatsenGekoppeld: number;
  extraLocatiesGepubliceerd: number;
  mijlpalenGepubliceerd: number;
  fotosGepubliceerd: number;
  links: number;
}

interface Todo {
  href: string;
  label: string;
  icon: string;
}

export default function BeheerDashboard() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    let actief = true;
    Promise.all([
      EntryFactory.getAll(groep.id),
      LocationFactory.getAll(groep.id),
      ExtraLocationFactory.getAllAdmin(groep.id),
      GroepMijlpaalFactory.getAllAdmin(groep.id),
      LinkFactory.getAll(groep.id),
      PhotoFactory.getAllAdmin(groep.id),
      WijzigingFactory.getAll(groep.id),
    ]).then(([entries, locaties, extraLocaties, mijlpalen, links, fotos, wijzigingen]) => {
      if (!actief) return;

      const isGoedTeKeuren = (e: WithId<Entry>) => e.status === "draft" || (e.status === "published" && e.goedgekeurd === false);
      const conceptEntries = entries.filter(isGoedTeKeuren);
      const stubEntries = entries.filter((e) => e.status === "stub");

      const gekoppeldeNamen = new Set(locaties.map((l) => l.naam.trim().toLowerCase()));
      const entriesNietGekoppeld = entries.filter((entry) => {
        const plaatsen = toTextArray(entry.besteKampplaats).filter(Boolean);
        if (plaatsen.length === 0) return false;
        return plaatsen.some((p) => !gekoppeldeNamen.has(p.trim().toLowerCase()));
      });

      const extraPending = extraLocaties.filter((l) => l.status === "pending");
      const mijlpalenPending = mijlpalen.filter((m) => m.status === "pending");
      const mijlpalenGepubliceerd = mijlpalen.filter((m) => m.status === "published");

      const fotosPending = fotos.filter((f) => f.status === "pending");
      const fotosVerwijderVerzoek = fotos.filter((f) => f.status === "published" && f.verwijderVerzoek);
      const fotosGepubliceerd = fotos.filter((f) => f.status === "published");

      setStats({
        entriesGepubliceerd: entries.filter((e) => e.status === "published" && e.goedgekeurd !== false).length,
        entriesConcept: conceptEntries.length,
        entriesStub: stubEntries.length,
        kampplaatsenGekoppeld: locaties.length,
        extraLocatiesGepubliceerd: extraLocaties.filter((l) => l.status === "published").length,
        mijlpalenGepubliceerd: mijlpalenGepubliceerd.length,
        fotosGepubliceerd: fotosGepubliceerd.length,
        links: links.length,
      });

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

      {!loading && stats && (
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

          <div>
            <SectieTitel>Statistieken</SectieTitel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              <StatKaart label="Leden gepubliceerd" waarde={stats.entriesGepubliceerd} icon="📖" href={`${basis}/beheer/vriendenboek`} />
              <StatKaart label="Goed te keuren" waarde={stats.entriesConcept} icon="📝" href={`${basis}/beheer/vriendenboek?status=goedtekeuren`} />
              <StatKaart label="Getagd, geen fiche" waarde={stats.entriesStub} icon="🏷️" href={`${basis}/beheer/vriendenboek?status=stub`} />
              <StatKaart label="Kampplaatsen gekoppeld" waarde={stats.kampplaatsenGekoppeld} icon="❤️" href={`${basis}/beheer/kampplaatsen`} />
              <StatKaart label="Extra kampplaatsen" waarde={stats.extraLocatiesGepubliceerd} icon="📍" href={`${basis}/beheer/kampplaatsen/extra`} />
              <StatKaart label="Mijlpalen gepubliceerd" waarde={stats.mijlpalenGepubliceerd} icon="🚩" href={`${basis}/beheer/tijdlijn`} />
              <StatKaart label="Foto's" waarde={stats.fotosGepubliceerd} icon="📷" href={`${basis}/beheer/fotos`} />
              <StatKaart label="Links" waarde={stats.links} icon="🔗" href={`${basis}/beheer/links`} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
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
