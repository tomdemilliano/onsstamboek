"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { toDisplayArray } from "@/lib/textUtils";
import type { Entry, WithId } from "@/types/models";

// Foto's en leidingsploeg-jaren van deze persoon komen hier bij zodra de
// Foto's- en Tijdlijn-fases gebouwd zijn (PhotoFactory.getByEntryId,
// LeidingFactory.getByEntryId) -- nu nog niet, want die collecties/schermen
// bestaan nog niet.
export default function EntryDetailPage(props: PageProps<"/[groep]/entry/[id]">) {
  const { id } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [entry, setEntry] = useState<WithId<Entry> | null | undefined>(undefined);

  useEffect(() => {
    let actief = true;
    EntryFactory.getById(id).then((e) => {
      if (!actief) return;
      const geldig = e && (e.status === "published" || e.status === "stub") && e.groepId === groep.id;
      setEntry(geldig ? e : null);
    });
    return () => {
      actief = false;
    };
  }, [id, groep.id]);

  if (entry === undefined) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }

  if (entry === null) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ fontFamily: fonts.body, color: colors.stamp, marginBottom: 12 }}>
          Dit formulier bestaat niet (meer) of is nog niet gepubliceerd.
        </p>
        <Link href={`${basis}/vriendenboekje`} style={{ fontFamily: fonts.body, color: colors.forest }}>
          ← Terug naar het vriendenboekje
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 100px" }}>
        <Link href={`${basis}/vriendenboekje`} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
          ← Terug naar het vriendenboekje
        </Link>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "36px 32px", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: 0 }}>{entry.naam}</h1>
              {(entry.geboortejaar || entry.periode) && (
                <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, margin: "6px 0 0" }}>
                  {entry.geboortejaar && `°${entry.geboortejaar} · `}
                  {entry.periode && `Lid van ${entry.periode}`}
                </p>
              )}
              {entry.status === "stub" && (
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.campfire, margin: "6px 0 0" }}>
                  Nog geen eigen vriendenboekje-fiche —{" "}
                  <Link href={`${basis}/toevoegen`} style={{ color: colors.campfire, fontWeight: 600 }}>
                    ben jij dit, of ken je deze persoon? Vul &apos;m zelf aan
                  </Link>
                  .
                </p>
              )}
              {entry.status === "published" && entry.goedgekeurd === false && (
                <p
                  style={{
                    display: "inline-block",
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.campfire,
                    background: colors.campfireLight,
                    border: `1px solid ${colors.campfire}`,
                    borderRadius: radius.badge,
                    padding: "4px 12px",
                    margin: "8px 0 0",
                  }}
                >
                  ⏳ Wacht op goedkeuring van de beheerder
                </p>
              )}
            </div>
            {entry.status === "published" && (
              <Link
                href={`${basis}/entry/${id}/wijzigen`}
                style={{
                  flexShrink: 0,
                  padding: "7px 14px",
                  borderRadius: radius.badge,
                  border: `1px solid ${colors.line}`,
                  background: colors.paperCard,
                  color: colors.ink,
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                ✏️ Wijziging voorstellen
              </Link>
            )}
            {entry.totemnaam && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: colors.stamp,
                  border: `1.5px solid ${colors.stamp}`,
                  borderRadius: radius.badge,
                  padding: "5px 14px",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.totemnaam}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: colors.line, margin: "26px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <VeldRij titel="Het plezantste spel of de strafste activiteit" waarden={toDisplayArray(entry.leuksteActiviteit)} />
            <VeldRij titel="De beste kampplaats ooit" waarden={toDisplayArray(entry.besteKampplaats)} />
            <VeldRij titel="Het lekkerste kamp-eten" waarden={toDisplayArray(entry.lekkersteEten)} achtergrond={colors.campfireLight} zonderRand />
          </div>

          {entry.scanUrl && (
            <div style={{ marginTop: 30 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.scanUrl}
                alt={`Origineel formulier van ${entry.naam}`}
                style={{ display: "block", maxWidth: "100%", borderRadius: radius.card, border: `1px solid ${colors.line}` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VeldRij({
  titel,
  waarden,
  achtergrond,
  zonderRand,
}: {
  titel: string;
  waarden: string[];
  achtergrond?: string;
  zonderRand?: boolean;
}) {
  if (waarden.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: colors.forest,
          marginBottom: 6,
        }}
      >
        {titel}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {waarden.map((waarde, i) => (
          <span
            key={i}
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 600,
              color: colors.ink,
              background: achtergrond ?? colors.white,
              border: zonderRand ? undefined : `1px solid ${colors.line}`,
              borderRadius: radius.badge,
              padding: "5px 14px",
            }}
          >
            {waarde}
          </span>
        ))}
      </div>
    </div>
  );
}
