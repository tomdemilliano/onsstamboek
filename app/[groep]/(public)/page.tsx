"use client";

import { useGroep } from "@/lib/groepContext";
import { colors, fonts } from "@/lib/theme";

export default function GroepLanding() {
  const groep = useGroep();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>{groep.naam}</h1>
      {groep.gemeente && <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, margin: "0 0 16px" }}>{groep.gemeente}</p>}
      <p style={{ fontFamily: fonts.body, fontSize: 16, color: colors.ink }}>Welkom op het vriendenboekje van {groep.naam}.</p>
    </div>
  );
}
