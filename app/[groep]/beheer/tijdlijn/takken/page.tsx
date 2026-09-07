"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { TakFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { ScoutTak, WithId } from "@/types/models";

export default function TakkenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [takken, setTakken] = useState<WithId<ScoutTak>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bewerkNaam, setBewerkNaam] = useState("");

  async function load() {
    setLoading(true);
    setTakken(await TakFactory.getAll(groep.id));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    TakFactory.getAll(groep.id).then((data) => {
      if (!actief) return;
      setTakken(data);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const tabs = [
    { href: `${basis}/beheer/tijdlijn`, label: "🚩 Mijlpalen", exact: true },
    { href: `${basis}/beheer/tijdlijn/takken`, label: "👥 Takken" },
    { href: `${basis}/beheer/tijdlijn/leiding`, label: "Leidingsploegen" },
  ];

  async function handleToevoegen() {
    setFout(null);
    if (!nieuweNaam.trim()) {
      setFout("Vul een naam voor de tak in.");
      return;
    }
    if (takken.some((t) => t.naam.toLowerCase() === nieuweNaam.trim().toLowerCase())) {
      setFout("Deze tak bestaat al.");
      return;
    }
    setToevoegBezig(true);
    try {
      await TakFactory.create(groep.id, nieuweNaam.trim());
      setNieuweNaam("");
      await load();
    } finally {
      setToevoegBezig(false);
    }
  }

  function startBewerken(tak: WithId<ScoutTak>) {
    setBewerkId(tak.id);
    setBewerkNaam(tak.naam);
  }

  async function opslaanBewerking() {
    if (!bewerkNaam.trim() || !bewerkId) return;
    await TakFactory.update(bewerkId, bewerkNaam.trim());
    setBewerkId(null);
    load();
  }

  async function handleVerwijderen(tak: WithId<ScoutTak>) {
    if (!confirm(`Tak "${tak.naam}" verwijderen? Bijhorende leidingsploeg-gegevens blijven wel bestaan, maar zijn niet meer gekoppeld aan een naam.`)) return;
    await TakFactory.remove(tak.id);
    load();
  }

  async function verplaats(index: number, richting: number) {
    const andereIndex = index + richting;
    if (andereIndex < 0 || andereIndex >= takken.length) return;
    const a = takken[index];
    const b = takken[andereIndex];
    await Promise.all([TakFactory.setVolgorde(a.id, andereIndex), TakFactory.setVolgorde(b.id, index)]);
    load();
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Tijdlijn</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Takken / groepen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        De lijst van takken waaruit je kan kiezen bij het invullen van een leidingsploeg (bv. Kapoenen, Welpen, Jonggivers, Givers, Jin...). De volgorde hieronder bepaalt ook de volgorde op de tijdlijn.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={nieuweNaam}
          onChange={(e) => setNieuweNaam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleToevoegen()}
          placeholder="bv. Kapoenen"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "+ Toevoegen"}
        </button>
      </div>
      {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: -14, marginBottom: 16 }}>{fout}</div>}

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {takken.map((tak, index) => (
          <div key={tak.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card }}>
            {bewerkId === tak.id ? (
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
                  <button onClick={() => verplaats(index, 1)} disabled={index === takken.length - 1} style={pijlBtn(index === takken.length - 1)} aria-label="Naar beneden">
                    ▼
                  </button>
                </div>
                <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink, fontWeight: 600 }}>{tak.naam}</span>
                <button onClick={() => startBewerken(tak)} style={btn(colors.inkMuted)}>
                  Bewerken
                </button>
                <button onClick={() => handleVerwijderen(tak)} style={btn(colors.stamp)}>
                  Verwijderen
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && takken.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen takken aangemaakt.</p>}
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
