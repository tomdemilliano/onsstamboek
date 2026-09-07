"use client";

import { colors, fonts, radius } from "@/lib/theme";
import DishListEditor from "./DishListEditor";

export interface EntryVelden {
  naam: string;
  geboortejaar: string;
  totemnaam: string;
  periode: string;
  leuksteActiviteit: string[];
  besteKampplaats: string[];
  lekkersteEten: string[];
}

export const LEGE_ENTRY_VELDEN: EntryVelden = {
  naam: "",
  geboortejaar: "",
  totemnaam: "",
  periode: "",
  leuksteActiviteit: [""],
  besteKampplaats: [""],
  lekkersteEten: [""],
};

/**
 * De gemeenschappelijke set velden van een vriendenboekje-fiche -- hergebruikt
 * door het publieke aanmeldformulier (/toevoegen), het publieke
 * wijzigingsvoorstel (/entry/[id]/wijzigen), en de handmatige
 * beheerformulieren (nieuw/bewerken). Bevat bewust geen scan-upload/OCR
 * (dat komt in een latere fase) en geen eigen opslaan-knop -- dat verschilt
 * per plek waar dit gebruikt wordt.
 */
export default function EntryVeldenEditor({
  fields,
  onChange,
}: {
  fields: EntryVelden;
  onChange: (fields: EntryVelden) => void;
}) {
  const set = <K extends keyof EntryVelden>(key: K, value: EntryVelden[K]) => {
    onChange({ ...fields, [key]: value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Veld label="Naam" value={fields.naam} onChange={(v) => set("naam", v)} placeholder="Voornaam Achternaam" />
      <Veld label="Geboortejaar" value={fields.geboortejaar} onChange={(v) => set("geboortejaar", v)} placeholder="19.." />
      <Veld label="Totemnaam" value={fields.totemnaam} onChange={(v) => set("totemnaam", v)} />
      <Veld label="Lid in periode" value={fields.periode} onChange={(v) => set("periode", v)} placeholder="1952 - 1955" />

      <div>
        <Label>Plezantste spel / strafste activiteit</Label>
        <DishListEditor
          value={fields.leuksteActiviteit}
          onChange={(lijst) => set("leuksteActiviteit", lijst)}
          placeholder="bv. Toneelspelen"
          mergeLabel="Samenvoegen met vorige activiteit"
          addLabel="+ Activiteit toevoegen"
        />
      </div>

      <div>
        <Label>Beste kampplaats ooit</Label>
        <DishListEditor
          value={fields.besteKampplaats}
          onChange={(lijst) => set("besteKampplaats", lijst)}
          placeholder="bv. Falmignoul (Walzin)"
          mergeLabel="Samenvoegen met vorige kampplaats"
          addLabel="+ Kampplaats toevoegen"
        />
      </div>

      <div>
        <Label>Lekkerste kamp-eten</Label>
        <DishListEditor
          value={fields.lekkersteEten}
          onChange={(lijst) => set("lekkersteEten", lijst)}
          mergeLabel="Samenvoegen met vorig gerecht"
          addLabel="+ Gerecht toevoegen"
        />
      </div>
    </div>
  );
}

export function opgeschoond(fields: EntryVelden): EntryVelden {
  return {
    ...fields,
    leuksteActiviteit: fields.leuksteActiviteit.map((v) => v.trim()).filter(Boolean),
    besteKampplaats: fields.besteKampplaats.map((v) => v.trim()).filter(Boolean),
    lekkersteEten: fields.lekkersteEten.map((v) => v.trim()).filter(Boolean),
  };
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: fonts.body,
        fontSize: 12,
        fontWeight: 600,
        color: colors.inkMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

function Veld({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: radius.input,
          border: `1px solid ${colors.line}`,
          background: colors.white,
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.ink,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
