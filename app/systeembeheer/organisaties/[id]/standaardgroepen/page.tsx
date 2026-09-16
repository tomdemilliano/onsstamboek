"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { OrganisatieFactory, TakSjabloonFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { Organisatie, TakSjabloon, WithId } from "@/types/models";

export default function StandaardgroepenPage(props: PageProps<"/systeembeheer/organisaties/[id]/standaardgroepen">) {
  const { id: organisatieId } = use(props.params);

  const [organisatie, setOrganisatie] = useState<WithId<Organisatie> | null | undefined>(undefined);
  const [groepen, setGroepen] = useState<WithId<TakSjabloon>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bewerkNaam, setBewerkNaam] = useState("");

  async function load() {
    setLoading(true);
    setGroepen(await TakSjabloonFactory.getAll(organisatieId));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([OrganisatieFactory.getById(organisatieId), TakSjabloonFactory.getAll(organisatieId)]).then(([org, data]) => {
      if (!actief) return;
      setOrganisatie(org);
      setGroepen(data);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [organisatieId]);

  const tabs = [
    { href: `/systeembeheer/organisaties/${organisatieId}`, label: "Overzicht", exact: true },
    { href: `/systeembeheer/organisaties/${organisatieId}/kentekens`, label: "🧭 Kentekens" },
    { href: `/systeembeheer/organisaties/${organisatieId}/mijlpalen`, label: "⚜️ Mijlpalen" },
    { href: `/systeembeheer/organisaties/${organisatieId}/standaardgroepen`, label: "🏕️ Standaardgroepen" },
  ];

  async function handleToevoegen() {
    setFout(null);
    if (!nieuweNaam.trim()) {
      setFout("Vul een naam in.");
      return;
    }
    if (groepen.some((g) => g.naam.toLowerCase() === nieuweNaam.trim().toLowerCase())) {
      setFout("Deze naam bestaat al in dit sjabloon.");
      return;
    }
    setToevoegBezig(true);
    try {
      await TakSjabloonFactory.create(organisatieId, nieuweNaam.trim());
      setNieuweNaam("");
      await load();
    } finally {
      setToevoegBezig(false);
    }
  }

  function startBewerken(groep: WithId<TakSjabloon>) {
    setBewerkId(groep.id);
    setBewerkNaam(groep.naam);
  }

  async function opslaanBewerking() {
    if (!bewerkNaam.trim() || !bewerkId) return;
    await TakSjabloonFactory.update(organisatieId, bewerkId, bewerkNaam.trim());
    setBewerkId(null);
    load();
  }

  async function handleVerwijderen(groep: WithId<TakSjabloon>) {
    if (!confirm(`"${groep.naam}" verwijderen uit het sjabloon?`)) return;
    await TakSjabloonFactory.remove(organisatieId, groep.id);
    load();
  }

  async function verplaats(index: number, richting: number) {
    const andereIndex = index + richting;
    if (andereIndex < 0 || andereIndex >= groepen.length) return;
    const a = groepen[index];
    const b = groepen[andereIndex];
    await Promise.all([
      TakSjabloonFactory.setVolgorde(organisatieId, a.id, andereIndex),
      TakSjabloonFactory.setVolgorde(organisatieId, b.id, index),
    ]);
    load();
  }

  if (organisatie === undefined) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (organisatie === null) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.stamp }}>Organisatie niet gevonden.</p>;
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/systeembeheer/organisaties" style={{ display: "inline-block", marginBottom: 14, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
        ← Alle organisaties
      </Link>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>{organisatie.naam}</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Standaardgroepen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Dit sjabloon wordt eenmalig uitgerold naar een groep zodra die voor het eerst aan deze organisatie gekoppeld wordt -- geen levende koppeling: nadien beheert de groep zijn eigen lijst zelf, en een latere wijziging hier raakt al gekoppelde groepen niet meer. De volgorde hieronder bepaalt de volgorde waarin ze bij de groep terechtkomen.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={nieuweNaam}
          onChange={(e) => setNieuweNaam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleToevoegen()}
          placeholder="Naam"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "+ Toevoegen"}
        </button>
      </div>
      {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: -14, marginBottom: 16 }}>{fout}</div>}

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groepen.map((groep, index) => (
          <div key={groep.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card }}>
            {bewerkId === groep.id ? (
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
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => verplaats(index, -1)} disabled={index === 0} style={pijlBtn(index === 0)} aria-label="Naar boven">
                    ▲
                  </button>
                  <button onClick={() => verplaats(index, 1)} disabled={index === groepen.length - 1} style={pijlBtn(index === groepen.length - 1)} aria-label="Naar beneden">
                    ▼
                  </button>
                </div>
                <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink, fontWeight: 600 }}>{groep.naam}</span>
                <button onClick={() => startBewerken(groep)} style={btn(colors.inkMuted)}>
                  Bewerken
                </button>
                <button onClick={() => handleVerwijderen(groep)} style={btn(colors.stamp)}>
                  Verwijderen
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && groepen.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog niets toegevoegd aan dit sjabloon.</p>}
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

function pijlBtn(disabled: boolean): React.CSSProperties {
  return { width: 24, height: 18, padding: 0, borderRadius: 4, border: `1px solid ${colors.line}`, background: disabled ? colors.paper : colors.white, color: disabled ? colors.line : colors.inkMuted, fontSize: 10, cursor: disabled ? "default" : "pointer" };
}
