"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, DishFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports } from "@/lib/theme";
import { groupByArrayField, type VeldGroep } from "@/lib/textUtils";
import type { Dish, Entry, WithId } from "@/types/models";

const KLEUREN = [colors.forest, colors.campfire, colors.stamp, colors.forestDark];

export default function EtenPage() {
  const groep = useGroep();

  const [gerechten, setGerechten] = useState<VeldGroep<WithId<Entry>>[]>([]);
  const [recepten, setRecepten] = useState<Record<string, WithId<Dish>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    Promise.all([EntryFactory.getPublished(groep.id), DishFactory.getAll(groep.id)]).then(([entries, dishes]) => {
      if (!actief) return;
      setGerechten(groupByArrayField(entries, "lekkersteEten"));
      const byNaam: Record<string, WithId<Dish>> = {};
      dishes.forEach((d) => (byNaam[d.naam.trim().toLowerCase()] = d));
      setRecepten(byNaam);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const max = gerechten[0]?.entries.length || 1;
  const min = gerechten[gerechten.length - 1]?.entries.length || 1;

  function fontSizeFor(aantal: number) {
    if (max === min) return 22;
    const t = (aantal - min) / (max - min);
    return 15 + t * 34; // 15px .. 49px
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 40px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 38, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Het lekkerste kamp-eten</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted }}>Hoe vaker genoemd, hoe groter het gerecht — klik voor een recept, als er een gekoppeld is</p>
        </div>

        {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", gap: "8px 20px", padding: "20px 10px" }}>
          {gerechten.map((g, i) => {
            const recept = recepten[g.label.trim().toLowerCase()];
            const inhoud = (
              <span
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 600,
                  fontSize: fontSizeFor(g.entries.length),
                  color: KLEUREN[i % KLEUREN.length],
                  lineHeight: 1.2,
                  textDecoration: recept?.receptUrl ? "underline" : "none",
                  textDecorationColor: colors.line,
                  textUnderlineOffset: 4,
                }}
                title={`${g.entries.length}× genoemd${recept?.receptNotitie ? " — " + recept.receptNotitie : ""}`}
              >
                {g.label}
              </span>
            );
            return recept?.receptUrl ? (
              <a key={g.label} href={recept.receptUrl} target="_blank" rel="noopener noreferrer">
                {inhoud}
              </a>
            ) : (
              <span key={g.label}>{inhoud}</span>
            );
          })}
        </div>

        {!loading && gerechten.length === 0 && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Nog niet genoeg data om te tonen.</p>}
      </div>
    </div>
  );
}
