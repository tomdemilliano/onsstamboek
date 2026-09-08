"use client";

import { useGroep } from "@/lib/groepContext";
import { colors, fonts } from "@/lib/theme";

export default function BeheerDashboard() {
  const groep = useGroep();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 8px" }}>
        Beheer — {groep.naam}
      </h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted }}>
        Dashboard-overzicht (aantal fiches, foto&apos;s te goedkeuren, ...) komt hier --
        zelfde soort tegels als in de bestaande single-tenant app, nu gefilterd op deze groep.
      </p>
    </div>
  );
}
