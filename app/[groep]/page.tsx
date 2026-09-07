"use client";

import { useGroep } from "@/lib/groepContext";

export default function GroepLanding() {
  const groep = useGroep();

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <h1>{groep.naam}</h1>
      {groep.gemeente && <p>{groep.gemeente}</p>}
      <p>Welkom op het vriendenboekje van {groep.naam}.</p>
    </div>
  );
}
