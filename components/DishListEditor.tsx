"use client";

import { colors, fonts, radius } from "@/lib/theme";

export default function DishListEditor({
  value,
  onChange,
  placeholder = "bv. Stoemp met worst",
  mergeLabel = "Samenvoegen met vorige",
  addLabel = "+ Gerecht toevoegen",
}: {
  value: string[];
  onChange: (waarden: string[]) => void;
  placeholder?: string;
  mergeLabel?: string;
  addLabel?: string;
}) {
  const items = value.length ? value : [""];

  const update = (index: number, tekst: string) => {
    const next = [...items];
    next[index] = tekst;
    onChange(next);
  };

  const verwijder = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  };

  const voegToe = () => {
    onChange([...items, ""]);
  };

  const voegSamenMetVorige = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    const samengevoegd = `${next[index - 1]} ${next[index]}`.trim();
    next[index - 1] = samengevoegd;
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(index, e.target.value)}
            style={{
              flex: 1,
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
          {index > 0 && (
            <button type="button" onClick={() => voegSamenMetVorige(index)} title={mergeLabel} style={iconBtn(colors.forest)}>
              ⬆
            </button>
          )}
          {items.length > 1 && (
            <button type="button" onClick={() => verwijder(index)} title="Verwijderen" style={iconBtn(colors.stamp)}>
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={voegToe}
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          borderRadius: radius.badge,
          border: `1px dashed ${colors.line}`,
          background: "transparent",
          color: colors.inkMuted,
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {addLabel}
      </button>
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    flexShrink: 0,
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "none",
    background: color,
    color: "#FFF",
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
