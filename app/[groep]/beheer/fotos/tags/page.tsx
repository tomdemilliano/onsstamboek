"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { PhotoTagFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { PhotoTag, WithId } from "@/types/models";

export default function FotoTagsPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [tags, setTags] = useState<WithId<PhotoTag>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bewerkNaam, setBewerkNaam] = useState("");

  async function load() {
    setLoading(true);
    setTags(await PhotoTagFactory.getAll(groep.id));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    PhotoTagFactory.getAll(groep.id).then((t) => {
      if (!actief) return;
      setTags(t);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const tabs = [
    { href: `${basis}/beheer/fotos`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/fotos/toevoegen`, label: "+ Foto's toevoegen" },
    { href: `${basis}/beheer/fotos/tags`, label: "Tags" },
    { href: `${basis}/beheer/fotos/sorteren`, label: "🗓️ Op decennium sorteren" },
    { href: `${basis}/beheer/fotos/dubbels`, label: "🔍 Dubbels" },
  ];

  async function handleToevoegen() {
    setFout(null);
    if (!nieuweNaam.trim()) {
      setFout("Vul een naam voor de tag in.");
      return;
    }
    if (tags.some((t) => t.naam.toLowerCase() === nieuweNaam.trim().toLowerCase())) {
      setFout("Deze tag bestaat al.");
      return;
    }
    setToevoegBezig(true);
    try {
      await PhotoTagFactory.create(groep.id, nieuweNaam.trim());
      setNieuweNaam("");
      await load();
    } finally {
      setToevoegBezig(false);
    }
  }

  function startBewerken(tag: WithId<PhotoTag>) {
    setBewerkId(tag.id);
    setBewerkNaam(tag.naam);
  }

  async function opslaanBewerking() {
    if (!bewerkNaam.trim() || !bewerkId) return;
    await PhotoTagFactory.update(bewerkId, bewerkNaam.trim());
    setBewerkId(null);
    load();
  }

  async function handleVerwijderen(tag: WithId<PhotoTag>) {
    if (!confirm(`Tag "${tag.naam}" verwijderen? Foto's die deze tag hadden, verliezen 'm dan gewoon.`)) return;
    await PhotoTagFactory.remove(tag.id);
    load();
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Foto&apos;s</h1>

      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Tags beheren</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Enkel jij als beheerder maakt nieuwe categorieën aan — zo blijft de lijst overzichtelijk. Iedereen mag daarna wel bestaande tags aan een foto toekennen, in het beheer én op de publieke fotopagina.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={nieuweNaam}
          onChange={(e) => setNieuweNaam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleToevoegen()}
          placeholder="bv. Kampvuur, Groepsfoto, Zwemmen..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "+ Toevoegen"}
        </button>
      </div>
      {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: -14, marginBottom: 16 }}>{fout}</div>}

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tags.map((tag) => (
          <div key={tag.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card }}>
            {bewerkId === tag.id ? (
              <>
                <input type="text" value={bewerkNaam} onChange={(e) => setBewerkNaam(e.target.value)} onKeyDown={(e) => e.key === "Enter" && opslaanBewerking()} style={{ ...inputStyle, flex: 1 }} autoFocus />
                <button onClick={opslaanBewerking} style={btn(colors.forest)}>
                  Opslaan
                </button>
                <button onClick={() => setBewerkId(null)} style={btn(colors.inkMuted)}>
                  Annuleren
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink, fontWeight: 600 }}>{tag.naam}</span>
                <button onClick={() => startBewerken(tag)} style={btn(colors.inkMuted)}>
                  Bewerken
                </button>
                <button onClick={() => handleVerwijderen(tag)} style={btn(colors.stamp)}>
                  Verwijderen
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && tags.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen tags aangemaakt.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};

function btn(color: string): React.CSSProperties {
  return { padding: "9px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
