"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setGroepCookie } from "@/lib/groepCookie";
import type { Groep, WithId } from "@/types/models";

export default function GroepKeuze({ groepen }: { groepen: WithId<Groep>[] }) {
  const [zoek, setZoek] = useState("");
  const router = useRouter();

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    if (!q) return groepen;
    return groepen.filter(
      (g) => g.naam.toLowerCase().includes(q) || (g.gemeente ?? "").toLowerCase().includes(q)
    );
  }, [zoek, groepen]);

  function kiesGroep(slug: string) {
    setGroepCookie(slug);
    router.push(`/${slug}`);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <input
        type="search"
        placeholder="Zoek je scoutsgroep..."
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        style={{ width: "100%", padding: "0.6rem 0.8rem", fontSize: "1rem" }}
      />
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {gefilterd.map((groep) => (
          <li key={groep.id}>
            <button
              onClick={() => kiesGroep(groep.slug)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.6rem 0.8rem",
                marginBottom: "0.4rem",
                cursor: "pointer",
              }}
            >
              {groep.naam}
              {groep.gemeente ? ` — ${groep.gemeente}` : ""}
            </button>
          </li>
        ))}
        {gefilterd.length === 0 && <li>Geen groep gevonden.</li>}
      </ul>
    </div>
  );
}
