"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, DishFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { groupByArrayField, type VeldGroep } from "@/lib/textUtils";
import type { Dish, Entry, WithId } from "@/types/models";

export default function GerechtenPage() {
  const groep = useGroep();

  const [groepen, setGroepen] = useState<VeldGroep<WithId<Entry>>[]>([]);
  const [recepten, setRecepten] = useState<Record<string, WithId<Dish>>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [entries, dishes] = await Promise.all([EntryFactory.getAll(groep.id), DishFactory.getAll(groep.id)]);
    setGroepen(groupByArrayField(entries, "lekkersteEten"));
    const byNaam: Record<string, WithId<Dish>> = {};
    dishes.forEach((d) => (byNaam[d.naam.trim().toLowerCase()] = d));
    setRecepten(byNaam);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([EntryFactory.getAll(groep.id), DishFactory.getAll(groep.id)]).then(([entries, dishes]) => {
      if (!actief) return;
      setGroepen(groupByArrayField(entries, "lekkersteEten"));
      const byNaam: Record<string, WithId<Dish>> = {};
      dishes.forEach((d) => (byNaam[d.naam.trim().toLowerCase()] = d));
      setRecepten(byNaam);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Gerechten &amp; recepten</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>Koppel eventueel een recept aan een gerecht. Op de publieke pagina wordt dat gerecht dan klikbaar.</p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groepen.map((groepItem) => (
          <DishCard key={groepItem.label} groepId={groep.id} groepItem={groepItem} recept={recepten[groepItem.label.trim().toLowerCase()]} onChanged={load} />
        ))}
      </div>

      {!loading && groepen.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen gerechten ingevuld.</p>}
    </div>
  );
}

function DishCard({
  groepId,
  groepItem,
  recept,
  onChanged,
}: {
  groepId: string;
  groepItem: VeldGroep<WithId<Entry>>;
  recept?: WithId<Dish>;
  onChanged: () => void;
}) {
  const [receptUrl, setReceptUrl] = useState(recept?.receptUrl || "");
  const [receptNotitie, setReceptNotitie] = useState(recept?.receptNotitie || "");
  const [bezig, setBezig] = useState(false);

  async function opslaan() {
    setBezig(true);
    try {
      await DishFactory.set(groepId, groepItem.label, { receptUrl: receptUrl.trim(), receptNotitie: receptNotitie.trim() });
      onChanged();
    } finally {
      setBezig(false);
    }
  }

  async function verwijderKoppeling() {
    await DishFactory.remove(groepId, groepItem.label);
    setReceptUrl("");
    setReceptNotitie("");
    onChanged();
  }

  return (
    <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{groepItem.label}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{groepItem.entries.length}× vermeld</div>
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2, marginBottom: 12 }}>{groepItem.entries.map((e) => e.naam).join(", ")}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="text" value={receptUrl} onChange={(e) => setReceptUrl(e.target.value)} placeholder="https://... (link naar een recept)" style={inputStyle} />
        <input type="text" value={receptNotitie} onChange={(e) => setReceptNotitie(e.target.value)} placeholder="Korte notitie (optioneel, bv. 'Mama's recept')" style={inputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={opslaan} disabled={bezig} style={btn(colors.forest)}>
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
          {recept && (
            <button onClick={verwijderKoppeling} style={btn(colors.stamp)}>
              Ontkoppelen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.ink,
  boxSizing: "border-box",
};

function btn(color: string): React.CSSProperties {
  return { padding: "8px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
