"use client";

import { useEffect, useMemo, useState } from "react";
import { EntryFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { splitsNamen, vindGelijkaardigeNamen, weergaveNaam } from "@/lib/naamMatching";
import type { Entry, LidLeidingsploeg, WithId } from "@/types/models";

/**
 * value: array van { naam, entryId } -- entryId is altijd gevuld: een vrij
 * getypte naam die niet overeenkomt met een bestaand lid wordt automatisch
 * bewaard als een minimale "stub"-oudlid-fiche (EntryFactory.findOrCreateStub),
 * zodat diezelfde persoon bij een volgende tag teruggevonden wordt in plaats
 * van telkens opnieuw te moeten intypen.
 *
 * Bij vrij intypen (i.p.v. een suggestie aanklikken) gebeuren 2 controles
 * vóór er een nieuwe fiche aangemaakt wordt -- in de praktijk bleken dit de
 * twee vaakst voorkomende oorzaken van dubbele ledenfiches:
 * 1. Een invoer met komma's/puntkomma's erin ("Jan, Piet, Klaas") wordt
 *    gesplitst en elke naam apart verwerkt.
 * 2. Een naam die niet exact, maar wel gelijkaardig is aan een bestaand lid
 *    (schrijffout, of enkel de voornaam) wordt niet zomaar als nieuwe fiche
 *    aangemaakt -- eerst wordt gevraagd of één van de gelijkaardige namen
 *    bedoeld is, of dat het toch om een nieuwe persoon gaat.
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
  const [bevestiging, setBevestiging] = useState<{ naam: string; kandidaten: WithId<Entry>[]; resterend: string[] } | null>(null);

  useEffect(() => {
    EntryFactory.getSearchable(groepId).then(setAlleLeden);
  }, [groepId]);

  const namen = useMemo(() => new Map(alleLeden.map((lid) => [lid.id, lid.naam])), [alleLeden]);
  const tags = value || [];

  const suggesties = zoekterm.trim()
    ? alleLeden
        .filter((e) => e.naam?.toLowerCase().includes(zoekterm.trim().toLowerCase()))
        .filter((e) => !tags.some((t) => t.entryId === e.id))
        .slice(0, 6)
    : [];

  /** Koppelt aan een gekende fiche -- geen verdere controle nodig (suggestieklik, exacte match, of "toch deze persoon" na bevestiging). */
  function koppel(huidigeTags: LidLeidingsploeg[], naam: string, entryId: string): LidLeidingsploeg[] {
    if (huidigeTags.some((t) => t.entryId === entryId)) return huidigeTags;
    return [...huidigeTags, { naam, entryId }];
  }

  /** Maakt een nieuwe stub-fiche aan en koppelt die. */
  async function nieuweFiche(huidigeTags: LidLeidingsploeg[], naam: string): Promise<LidLeidingsploeg[]> {
    const nieuwId = await EntryFactory.findOrCreateStub(groepId, naam);
    if (!nieuwId) return huidigeTags;
    const gevonden = alleLeden.find((e) => e.id === nieuwId);
    if (!gevonden) setAlleLeden((prev) => [...prev, { id: nieuwId, groepId, naam, status: "stub" }]);
    return koppel(huidigeTags, gevonden?.naam || naam, nieuwId);
  }

  /**
   * Verwerkt de vrij ingetypte namen één voor één. Stopt zodra een naam
   * gelijkaardig (maar niet exact gelijk) is aan een bestaand lid en toont
   * dan een bevestiging; de rest van de namen in dezelfde invoer wordt pas
   * verwerkt nadat de gebruiker die keuze gemaakt heeft (zie
   * bevestigingKiezen).
   */
  async function verwerkNamen(namen: string[], beginTags: LidLeidingsploeg[]) {
    let lopendeTags = beginTags;
    for (let i = 0; i < namen.length; i++) {
      const naam = namen[i];
      if (lopendeTags.some((t) => t.naam.toLowerCase() === naam.toLowerCase())) continue;

      const exact = alleLeden.find((e) => e.naam.trim().toLowerCase() === naam.toLowerCase());
      if (exact) {
        lopendeTags = koppel(lopendeTags, exact.naam, exact.id);
        continue;
      }

      const kandidaten = vindGelijkaardigeNamen(
        naam,
        alleLeden.filter((e) => !lopendeTags.some((t) => t.entryId === e.id))
      );
      if (kandidaten.length > 0) {
        onChange(lopendeTags);
        setBevestiging({ naam, kandidaten, resterend: namen.slice(i + 1) });
        setZoekterm("");
        return;
      }

      setBezig(true);
      try {
        lopendeTags = await nieuweFiche(lopendeTags, naam);
      } finally {
        setBezig(false);
      }
    }
    onChange(lopendeTags);
    setZoekterm("");
  }

  function start() {
    if (bezig || bevestiging) return;
    const namen = splitsNamen(zoekterm);
    if (namen.length === 0) return;
    verwerkNamen(namen, tags);
  }

  async function bevestigingKiezen(gekozenEntry: WithId<Entry> | null) {
    if (!bevestiging) return;
    const { naam, resterend } = bevestiging;
    setBevestiging(null);
    let lopendeTags = tags;
    if (gekozenEntry) {
      lopendeTags = koppel(lopendeTags, gekozenEntry.naam, gekozenEntry.id);
    } else {
      setBezig(true);
      try {
        lopendeTags = await nieuweFiche(lopendeTags, naam);
      } finally {
        setBezig(false);
      }
    }
    await verwerkNamen(resterend, lopendeTags);
  }

  function voegSuggestieToe(naam: string, entryId: string) {
    onChange(koppel(tags, naam, entryId));
    setZoekterm("");
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
            {weergaveNaam(tag, namen)}
            <button
              type="button"
              onClick={() => verwijder(i)}
              aria-label={`${weergaveNaam(tag, namen)} verwijderen`}
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
            if (e.key === "Enter" && zoekterm.trim() && !bezig && !bevestiging) {
              e.preventDefault();
              start();
            }
          }}
          placeholder={bezig ? "Bezig met opslaan..." : "Typ een naam (of meerdere, gescheiden door een komma)..."}
          disabled={bezig || !!bevestiging}
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
          onClick={start}
          disabled={bezig || !!bevestiging || !zoekterm.trim()}
          style={{
            padding: "9px 16px",
            borderRadius: radius.input,
            border: "none",
            background: bezig || !!bevestiging || !zoekterm.trim() ? colors.inkMuted : colors.forest,
            color: colors.white,
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: bezig || !!bevestiging || !zoekterm.trim() ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Toevoegen
        </button>
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, margin: "4px 0 0" }}>
        Kies uit de suggesties hieronder, of typ een (of meerdere, gescheiden door een komma) nieuwe naam en druk op &quot;+ Toevoegen&quot;.
      </p>

      {bevestiging && (
        <div style={{ marginTop: 10, background: colors.campfireLight, border: `1.5px dashed ${colors.campfire}`, borderRadius: radius.card, padding: "12px 14px" }}>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, margin: "0 0 8px", fontWeight: 600 }}>
            &quot;{bevestiging.naam}&quot; lijkt op een gekend lid -- bedoel je één van deze?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {bevestiging.kandidaten.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => bevestigingKiezen(k)}
                disabled={bezig}
                style={{ padding: "6px 12px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: bezig ? "default" : "pointer" }}
              >
                {k.naam}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => bevestigingKiezen(null)}
            disabled={bezig}
            style={{ background: "none", border: "none", cursor: bezig ? "default" : "pointer", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.inkMuted, textDecoration: "underline", padding: 0 }}
          >
            Nee, &quot;{bevestiging.naam}&quot; is een nieuwe persoon
          </button>
        </div>
      )}

      {suggesties.length > 0 && !bevestiging && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {suggesties.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => voegSuggestieToe(e.naam, e.id)}
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
