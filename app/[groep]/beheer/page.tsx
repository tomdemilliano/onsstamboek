"use client";

import { useGroep } from "@/lib/groepContext";

export default function BeheerDashboard() {
  const groep = useGroep();

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <h1>Beheer — {groep.naam}</h1>
      <p>
        Dashboard-overzicht (aantal fiches, foto&apos;s te goedkeuren, ...) komt hier --
        zelfde soort tegels als in de bestaande single-tenant app, nu gefilterd op deze groep.
      </p>
    </div>
  );
}
