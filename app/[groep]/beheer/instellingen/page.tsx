"use client";

import { useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { GroepFactory } from "@/lib/dbSchema";

export default function GroepInstellingen() {
  const groep = useGroep();
  const [naam, setNaam] = useState(groep.naam);
  const [gemeente, setGemeente] = useState(groep.gemeente ?? "");
  const [contactEmail, setContactEmail] = useState(groep.contactEmail ?? "");
  const [oprichtingsjaar, setOprichtingsjaar] = useState(groep.oprichtingsjaar?.toString() ?? "");
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setOpgeslagen(false);
    try {
      await GroepFactory.update(groep.id, {
        naam,
        gemeente,
        contactEmail,
        oprichtingsjaar: oprichtingsjaar ? Number(oprichtingsjaar) : null,
      });
      setOpgeslagen(true);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 480 }}>
      <h1>Instellingen</h1>
      <form onSubmit={opslaan} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          Naam
          <input value={naam} onChange={(e) => setNaam(e.target.value)} required />
        </label>
        <label>
          Gemeente
          <input value={gemeente} onChange={(e) => setGemeente(e.target.value)} />
        </label>
        <label>
          Algemeen contactadres (publiek zichtbaar op &quot;over de groep&quot;)
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </label>
        <label>
          Oprichtingsjaar
          <input
            type="number"
            value={oprichtingsjaar}
            onChange={(e) => setOprichtingsjaar(e.target.value)}
          />
        </label>
        <button type="submit" disabled={bezig}>
          {bezig ? "Bezig met opslaan..." : "Opslaan"}
        </button>
        {opgeslagen && <p>Opgeslagen.</p>}
      </form>
    </div>
  );
}
