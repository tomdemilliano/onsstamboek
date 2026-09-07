"use client";

import { use, useEffect, useState } from "react";
import { OrganisatieKentekenFactory } from "@/lib/dbSchema";
import type { OrganisatieKenteken, WithId } from "@/types/models";

export default function OrganisatieKentekens(props: PageProps<"/systeembeheer/organisaties/[id]/kentekens">) {
  const { id: organisatieId } = use(props.params);
  const [kentekens, setKentekens] = useState<WithId<OrganisatieKenteken>[]>([]);
  const [startJaar, setStartJaar] = useState("");
  const [jaarleuze, setJaarleuze] = useState("");

  useEffect(() => {
    let actief = true;
    OrganisatieKentekenFactory.getAll(organisatieId).then((data) => {
      if (actief) setKentekens(data);
    });
    return () => {
      actief = false;
    };
  }, [organisatieId]);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    await OrganisatieKentekenFactory.set(organisatieId, Number(startJaar), { jaarleuze });
    setStartJaar("");
    setJaarleuze("");
    setKentekens(await OrganisatieKentekenFactory.getAll(organisatieId));
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 480 }}>
      <h1>Jaarkentekens</h1>
      <p>Bewegingsbreed, gedeeld door alle groepen van deze organisatie.</p>
      <ul>
        {kentekens.map((k) => (
          <li key={k.id}>
            {k.startJaar} — {k.jaarleuze}
          </li>
        ))}
      </ul>
      <form onSubmit={toevoegen} style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <input
          type="number"
          placeholder="Startjaar"
          value={startJaar}
          onChange={(e) => setStartJaar(e.target.value)}
          required
        />
        <input
          placeholder="Jaarleuze"
          value={jaarleuze}
          onChange={(e) => setJaarleuze(e.target.value)}
          required
        />
        <button type="submit">Toevoegen</button>
      </form>
    </div>
  );
}
