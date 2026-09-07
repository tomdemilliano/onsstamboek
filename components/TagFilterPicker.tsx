"use client";

import { useEffect, useRef, useState } from "react";
import { colors, fonts, radius } from "@/lib/theme";
import type { PhotoTag, WithId } from "@/types/models";

/**
 * Eén knopje dat een uitklappaneel met checkboxes toont -- neemt zo min
 * mogelijk ruimte in (belangrijk op mobiel), ook al zijn er veel tags.
 */
export default function TagFilterPicker({
  alleTags,
  geselecteerd,
  onChange,
}: {
  alleTags: WithId<PhotoTag>[];
  geselecteerd: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!alleTags || alleTags.length === 0) return null;

  function toggle(id: string) {
    if (geselecteerd.includes(id)) onChange(geselecteerd.filter((t) => t !== id));
    else onChange([...geselecteerd, id]);
  }

  return (
    <div style={{ position: "relative" }} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "8px 14px",
          borderRadius: radius.badge,
          border: `1.5px solid ${geselecteerd.length ? colors.campfire : colors.line}`,
          background: geselecteerd.length ? colors.campfire : colors.white,
          color: geselecteerd.length ? colors.white : colors.ink,
          fontFamily: fonts.body,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        🏷️ Tags{geselecteerd.length > 0 ? ` (${geselecteerd.length})` : ""}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            background: colors.white,
            border: `1px solid ${colors.line}`,
            borderRadius: radius.card,
            padding: 10,
            minWidth: 190,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 6px 18px rgba(44,36,25,0.18)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {alleTags.map((tag) => (
            <label
              key={tag.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.ink,
                cursor: "pointer",
                padding: "5px 4px",
                borderRadius: radius.input,
              }}
            >
              <input type="checkbox" checked={geselecteerd.includes(tag.id)} onChange={() => toggle(tag.id)} />
              {tag.naam}
            </label>
          ))}
          {geselecteerd.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                marginTop: 4,
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: colors.stamp,
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 2px",
              }}
            >
              Wis selectie
            </button>
          )}
        </div>
      )}
    </div>
  );
}
