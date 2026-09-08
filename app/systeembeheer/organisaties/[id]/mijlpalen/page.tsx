"use client";

import { use, useEffect, useState } from "react";
import { OrganisatieMijlpaalFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { OrganisatieMijlpaal, WithId } from "@/types/models";

const leegNieuw = { jaar: "", titel: "", beschrijving: "" };

export default function OrganisatieMijlpalen(props: PageProps<"/systeembeheer/organisaties/[id]/mijlpalen">) {
  const { id: organisatieId } = use(props.params);

  const [mijlpalen, setMijlpalen] = useState<WithId<OrganisatieMijlpaal>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuw, setNieuw] = useState(leegNieuw);
  const [nieuwBestand, setNieuwBestand] = useState<File | null>(null);
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [bewerkId, setBewerkId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMijlpalen(await OrganisatieMijlpaalFactory.getAllAdmin(organisatieId));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    OrganisatieMijlpaalFactory.getAllAdmin(organisatieId).then((data) => {
      if (!actief) return;
      setMijlpalen(data);
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
  ];

  async function handleToevoegen() {
    setFoutmelding(null);
    const jaarNum = parseInt(nieuw.jaar, 10);
    if (!jaarNum || !nieuw.titel.trim()) {
      setFoutmelding("Jaar en titel zijn verplicht.");
      return;
    }
    setToevoegBezig(true);
    try {
      await OrganisatieMijlpaalFactory.createByAdmin(organisatieId, { jaar: jaarNum, titel: nieuw.titel.trim(), beschrijving: nieuw.beschrijving.trim(), file: nieuwBestand });
      setNieuw(leegNieuw);
      setNieuwBestand(null);
      load();
    } catch (err) {
      console.error("Opslaan van mijlpaal mislukt:", err);
      setFoutmelding("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setToevoegBezig(false);
    }
  }

  async function handleVerwijderen(m: WithId<OrganisatieMijlpaal>) {
    if (!confirm(`Mijlpaal "${m.titel}" verwijderen?`)) return;
    await OrganisatieMijlpaalFactory.remove(organisatieId, m.id, m.afbeeldingPath);
    load();
  }

  async function handleOpslaanBewerking(id: string, velden: { jaar: number; titel: string; beschrijving: string }, file: File | null) {
    await OrganisatieMijlpaalFactory.update(organisatieId, id, { ...velden, file, bestaandePath: mijlpalen.find((m) => m.id === id)?.afbeeldingPath });
    setBewerkId(null);
    load();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Scouting-mijlpalen</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Mijlpalen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Belangrijke momenten uit de geschiedenis van de scoutsbeweging (⚜️), bewegingsbreed te zien op de tijdlijn van elke gekoppelde groep -- los van de eigen groeps-mijlpalen (🚩) die elke groep zelf beheert.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Mijlpaal toevoegen</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Jaar</label>
            <input type="number" value={nieuw.jaar} onChange={(e) => setNieuw((p) => ({ ...p, jaar: e.target.value }))} placeholder="1944" style={{ ...inputStyle, width: 100 }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Titel</label>
            <input type="text" value={nieuw.titel} onChange={(e) => setNieuw((p) => ({ ...p, titel: e.target.value }))} placeholder="bv. Oprichting van de beweging" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Beschrijving (optioneel)</label>
          <textarea value={nieuw.beschrijving} onChange={(e) => setNieuw((p) => ({ ...p, beschrijving: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <label style={{ ...labelStyle, cursor: "pointer" }}>
          Afbeelding (optioneel)
          <input type="file" accept="image/*" onChange={(e) => setNieuwBestand(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
        </label>
        {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "+ Mijlpaal toevoegen"}
        </button>
      </div>

      <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>Alle mijlpalen ({mijlpalen.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mijlpalen.map((m) =>
          bewerkId === m.id ? (
            <MijlpaalBewerkForm key={m.id} mijlpaal={m} onOpslaan={(velden, file) => handleOpslaanBewerking(m.id, velden, file)} onAnnuleren={() => setBewerkId(null)} />
          ) : (
            <div key={m.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              {m.afbeeldingUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.afbeeldingUrl} alt="" style={{ width: 40, height: 40, borderRadius: radius.input, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: colors.ink }}>
                  ⚜️ {m.jaar} — {m.titel}
                </div>
                {m.beschrijving && <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 2 }}>{m.beschrijving}</div>}
              </div>
              <button onClick={() => setBewerkId(m.id)} style={btn(colors.inkMuted)}>
                Bewerken
              </button>
              <button onClick={() => handleVerwijderen(m)} style={btn(colors.stamp)}>
                Verwijderen
              </button>
            </div>
          )
        )}
      </div>

      {!loading && mijlpalen.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen mijlpalen toegevoegd.</p>}
    </div>
  );
}

function MijlpaalBewerkForm({
  mijlpaal,
  onOpslaan,
  onAnnuleren,
}: {
  mijlpaal: WithId<OrganisatieMijlpaal>;
  onOpslaan: (velden: { jaar: number; titel: string; beschrijving: string }, file: File | null) => Promise<void>;
  onAnnuleren: () => void;
}) {
  const [jaar, setJaar] = useState(String(mijlpaal.jaar));
  const [titel, setTitel] = useState(mijlpaal.titel || "");
  const [beschrijving, setBeschrijving] = useState(mijlpaal.beschrijving || "");
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan() {
    const jaarNum = parseInt(jaar, 10);
    if (!jaarNum || !titel.trim()) {
      setFout("Jaar en titel zijn verplicht.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      await onOpslaan({ jaar: jaarNum, titel: titel.trim(), beschrijving: beschrijving.trim() }, bestand);
    } catch (err) {
      console.error("Opslaan van mijlpaal mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ background: colors.paperCard, border: `1.5px solid ${colors.forest}`, borderRadius: radius.card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      {mijlpaal.afbeeldingUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mijlpaal.afbeeldingUrl} alt="" style={{ width: 60, height: 60, borderRadius: radius.input, objectFit: "cover" }} />
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div>
          <label style={labelStyle}>Jaar</label>
          <input type="number" value={jaar} onChange={(e) => setJaar(e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Titel</label>
          <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Beschrijving</label>
        <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      <label style={{ ...labelStyle, cursor: "pointer" }}>
        Nieuwe afbeelding (optioneel — laat leeg om de bestaande te behouden)
        <input type="file" accept="image/*" onChange={(e) => setBestand(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
      </label>
      {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={opslaan} disabled={bezig} style={btn(colors.forest)}>
          {bezig ? "Bezig..." : "Wijzigingen opslaan"}
        </button>
        <button onClick={onAnnuleren} style={btn(colors.inkMuted)}>
          Annuleren
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 3,
};

function btn(color: string): React.CSSProperties {
  return { padding: "8px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
