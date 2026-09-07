"use client";

import { use, useEffect, useState } from "react";
import { OrganisatieMijlpaalFactory } from "@/lib/dbSchema";
import type { OrganisatieMijlpaal, WithId } from "@/types/models";

export default function OrganisatieMijlpalen(props: PageProps<"/systeembeheer/organisaties/[id]/mijlpalen">) {
  const { id: organisatieId } = use(props.params);
  const [mijlpalen, setMijlpalen] = useState<WithId<OrganisatieMijlpaal>[]>([]);
  const [jaar, setJaar] = useState("");
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");

  useEffect(() => {
    let actief = true;
    OrganisatieMijlpaalFactory.getAllAdmin(organisatieId).then((data) => {
      if (actief) setMijlpalen(data);
    });
    return () => {
      actief = false;
    };
  }, [organisatieId]);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    await OrganisatieMijlpaalFactory.createByAdmin(organisatieId, {
      jaar: Number(jaar),
      titel,
      beschrijving,
    });
    setJaar("");
    setTitel("");
    setBeschrijving("");
    setMijlpalen(await OrganisatieMijlpaalFactory.getAllAdmin(organisatieId));
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 480 }}>
      <h1>Scouting-mijlpalen</h1>
      <p>
        Bewegingsbreed (⚜️ op de tijdlijn van elke groep), los van de eigen
        groep-mijlpalen (🚩) die elke groep zelf beheert.
      </p>
      <ul>
        {mijlpalen.map((m) => (
          <li key={m.id}>
            {m.jaar} — {m.titel}
          </li>
        ))}
      </ul>
      <form onSubmit={toevoegen} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
        <input type="number" placeholder="Jaar" value={jaar} onChange={(e) => setJaar(e.target.value)} required />
        <input placeholder="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
        <textarea
          placeholder="Beschrijving"
          value={beschrijving}
          onChange={(e) => setBeschrijving(e.target.value)}
        />
        <button type="submit">Toevoegen</button>
      </form>
    </div>
  );
}
