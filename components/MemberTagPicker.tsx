"use client";

import { useEffect, useState } from "react";
import { EntryFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Entry, LidLeidingsploeg, WithId } from "@/types/models";

/**
 * value: array van { naam, entryId } -- entryId is altijd gevuld: een vrij
 * getypte naam die niet overeenkomt met een bestaand lid wordt automatisch
 * bewaard als een minimale "stub"-oudlid-fiche (EntryFactory.findOrCreateStub),
 * zodat diezelfde persoon bij een volgende tag teruggevonden wordt in plaats
 * van telkens opnieuw te moeten intypen.
 */
export default function MemberTagPicker({
  groepId,
  value,
  onChange,
}: {
  groepId: string;
  value: LidLeidingsploeg[];
  onChange: (leden: LidLeidingsploeg[]) => void;
}) {
  const [alleLeden, setAlleLeden] = useState<WithId<Entry>[]>([]);
  const [zoekterm, setZoekterm] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    EntryFactory.getSearchable(groepId).then(setAlleLeden);
  }, [groepId]);

  const tags = value || [];

  const suggesties = zoekterm.trim()
    ? alleLeden
        .filter((e) => e.naam?.toLowerCase().includes(zoekterm.trim().toLowerCase()))
        .filter((e) => !tags.some((t) => t.entryId === e.id))
        .slice(0, 6)
    : [];

  async function voegToe(naam: string, entryId: string | null) {
    if (tags.some((t) => t.naam.toLowerCase() === naam.toLowerCase())) return;

    if (entryId) {
      onChange([...tags, { naam, entryId }]);
      setZoekterm("");
      return;
    }

    setBezig(true);
    try {
      const nieuwId = await EntryFactory.findOrCreateStub(groepId, naam);
      const gevonden = alleLeden.find((e) => e.id === nieuwId);
      onChange([...tags, { naam: gevonden?.naam || naam, entryId: nieuwId }]);
      setZoekterm("");
      if (!gevonden && nieuwId) {
        setAlleLeden((prev) => [...prev, { id: nieuwId, groepId, naam, status: "stub" }]);
      }
    } finally {
      setBezig(false);
    }
  }

  function verwijder(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: tags.length ? 8 : 0 }}>
        {tags.map((tag, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: radius.badge,
              background: colors.campfireLight,
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 600,
              color: colors.ink,
            }}
          >
            {tag.naam}
            <button
              type="button"
              onClick={() => verwijder(i)}
              aria-label={`${tag.naam} verwijderen`}
              style={{ background: "none", border: "none", color: colors.stamp, cursor: "pointer", fontSize: 12, padding: 0 }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && zoekterm.trim() && !bezig) {
              e.preventDefault();
              voegToe(zoekterm.trim(), null);
            }
          }}
          placeholder={bezig ? "Bezig met opslaan..." : "Typ een naam..."}
          disabled={bezig}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "9px 12px",
            borderRadius: radius.input,
            border: `1px solid ${colors.line}`,
            background: colors.white,
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.ink,
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => zoekterm.trim() && voegToe(zoekterm.trim(), null)}
          disabled={bezig || !zoekterm.trim()}
          style={{
            padding: "9px 16px",
            borderRadius: radius.input,
            border: "none",
            background: bezig || !zoekterm.trim() ? colors.inkMuted : colors.forest,
            color: colors.white,
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: bezig || !zoekterm.trim() ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Toevoegen
        </button>
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, margin: "4px 0 0" }}>
        Kies uit de suggesties hieronder, of typ een nieuwe naam en druk op &quot;+ Toevoegen&quot;.
      </p>

      {suggesties.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {suggesties.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => voegToe(e.naam, e.id)}
              style={{
                padding: "5px 12px",
                borderRadius: radius.badge,
                border: `1px solid ${colors.line}`,
                background: colors.white,
                fontFamily: fonts.body,
                fontSize: 12,
                color: colors.ink,
                cursor: "pointer",
              }}
            >
              + {e.naam}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
