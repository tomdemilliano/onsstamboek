"use client";

import { use, useEffect, useState } from "react";
import { OrganisatieKentekenFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { huidigWerkingsjaarStart, werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import AdminSubNav from "@/components/AdminSubNav";
import type { OrganisatieKenteken, WithId } from "@/types/models";

export default function OrganisatieKentekens(props: PageProps<"/systeembeheer/organisaties/[id]/kentekens">) {
  const { id: organisatieId } = use(props.params);

  const [kentekens, setKentekens] = useState<WithId<OrganisatieKenteken>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuwJaar, setNieuwJaar] = useState(String(huidigWerkingsjaarStart()));
  const [nieuwLeuze, setNieuwLeuze] = useState("");
  const [nieuwBestand, setNieuwBestand] = useState<File | null>(null);
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [bewerkJaar, setBewerkJaar] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setKentekens(await OrganisatieKentekenFactory.getAll(organisatieId));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    OrganisatieKentekenFactory.getAll(organisatieId).then((data) => {
      if (!actief) return;
      setKentekens(data);
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
    const jaarNum = parseInt(nieuwJaar, 10);
    if (!jaarNum || jaarNum < 1900) {
      setFoutmelding("Vul een geldig startjaar in.");
      return;
    }
    setToevoegBezig(true);
    try {
      await OrganisatieKentekenFactory.set(organisatieId, jaarNum, { jaarleuze: nieuwLeuze.trim(), file: nieuwBestand });
      setNieuwLeuze("");
      setNieuwBestand(null);
      load();
    } catch (err) {
      console.error("Opslaan van kenteken mislukt:", err);
      setFoutmelding("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setToevoegBezig(false);
    }
  }

  async function handleVerwijderen(k: WithId<OrganisatieKenteken>) {
    if (!confirm(`Kenteken ${werkingsjaarLabel(k.startJaar)} verwijderen?`)) return;
    await OrganisatieKentekenFactory.remove(organisatieId, k.startJaar, k.afbeeldingPath);
    load();
  }

  async function handleOpslaanBewerking(k: WithId<OrganisatieKenteken>, jaarleuze: string, file: File | null) {
    await OrganisatieKentekenFactory.set(organisatieId, k.startJaar, { jaarleuze, file, bestaandePath: k.afbeeldingPath });
    setBewerkJaar(null);
    load();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Jaarkentekens</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Jaarkentekens</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Eén kenteken met jaarleuze per werkingsjaar (start in september), bewegingsbreed gedeeld door alle groepen van deze organisatie. Deze verschijnen op de tijdlijn van elke gekoppelde groep.
      </p>

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Kenteken toevoegen / bijwerken</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Startjaar werkingsjaar</label>
            <input type="number" min="1900" value={nieuwJaar} onChange={(e) => setNieuwJaar(e.target.value)} style={{ ...inputStyle, width: 110 }} />
            {nieuwJaar && !isNaN(parseInt(nieuwJaar, 10)) && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 3 }}>= {werkingsjaarLabel(parseInt(nieuwJaar, 10))}</div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>Jaarleuze</label>
            <input type="text" value={nieuwLeuze} onChange={(e) => setNieuwLeuze(e.target.value)} placeholder="bv. Samen op weg" style={inputStyle} />
          </div>
        </div>
        <label style={{ ...labelStyle, cursor: "pointer" }}>
          Afbeelding van het kenteken (optioneel — laat leeg om een bestaande te behouden)
          <input type="file" accept="image/*" onChange={(e) => setNieuwBestand(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
        </label>
        {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "Opslaan"}
        </button>
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {kentekens.map((k) =>
          bewerkJaar === k.startJaar ? (
            <KentekenBewerkForm key={k.id} kenteken={k} onOpslaan={(jaarleuze, file) => handleOpslaanBewerking(k, jaarleuze, file)} onAnnuleren={() => setBewerkJaar(null)} />
          ) : (
            <div key={k.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              {k.afbeeldingUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.afbeeldingUrl} alt={werkingsjaarLabel(k.startJaar)} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${colors.line}`, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: colors.campfireLight, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.ink }}>{werkingsjaarLabel(k.startJaar)}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{k.jaarleuze || <em>geen jaarleuze</em>}</div>
              </div>
              <button onClick={() => setBewerkJaar(k.startJaar)} style={btn(colors.inkMuted)}>
                Bewerken
              </button>
              <button onClick={() => handleVerwijderen(k)} style={btn(colors.stamp)}>
                Verwijderen
              </button>
            </div>
          )
        )}
      </div>

      {!loading && kentekens.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen kentekens toegevoegd.</p>}
    </div>
  );
}

function KentekenBewerkForm({
  kenteken,
  onOpslaan,
  onAnnuleren,
}: {
  kenteken: WithId<OrganisatieKenteken>;
  onOpslaan: (jaarleuze: string, file: File | null) => Promise<void>;
  onAnnuleren: () => void;
}) {
  const [jaarleuze, setJaarleuze] = useState(kenteken.jaarleuze || "");
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan() {
    setBezig(true);
    setFout(null);
    try {
      await onOpslaan(jaarleuze.trim(), bestand);
    } catch (err) {
      console.error("Opslaan van kenteken mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ background: colors.paperCard, border: `1.5px solid ${colors.forest}`, borderRadius: radius.card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {kenteken.afbeeldingUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kenteken.afbeeldingUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${colors.line}` }} />
        )}
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.ink }}>
          {werkingsjaarLabel(kenteken.startJaar)}
          <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 400, color: colors.inkMuted, marginLeft: 8 }}>(werkingsjaar kan niet gewijzigd worden — verwijder en voeg opnieuw toe indien nodig)</span>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Jaarleuze</label>
        <input type="text" value={jaarleuze} onChange={(e) => setJaarleuze(e.target.value)} style={inputStyle} />
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
  return { padding: "9px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", alignSelf: "flex-start" };
}
