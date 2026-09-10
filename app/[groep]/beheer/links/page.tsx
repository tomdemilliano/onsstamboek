"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { LinkFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { naarVeiligeUrl } from "@/lib/textUtils";
import type { Link as GroepLink, WithId } from "@/types/models";

const leeg = { naam: "", url: "", omschrijving: "" };

export default function LinksBeheerPage() {
  const groep = useGroep();

  const [links, setLinks] = useState<WithId<GroepLink>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuw, setNieuw] = useState(leeg);
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLinks(await LinkFactory.getAll(groep.id));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    LinkFactory.getAll(groep.id).then((l) => {
      if (!actief) return;
      setLinks(l);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  async function handleToevoegen() {
    setFoutmelding(null);
    if (!nieuw.naam.trim() || !nieuw.url.trim()) {
      setFoutmelding("Naam en URL zijn verplicht.");
      return;
    }
    const url = naarVeiligeUrl(nieuw.url);

    setToevoegBezig(true);
    try {
      await LinkFactory.create(groep.id, { naam: nieuw.naam.trim(), url, omschrijving: nieuw.omschrijving.trim() });
      setNieuw(leeg);
      load();
    } catch (err) {
      console.error("Aanmaken van link mislukt:", err);
      setFoutmelding("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setToevoegBezig(false);
    }
  }

  async function handleVerwijderen(link: WithId<GroepLink>) {
    if (!confirm(`Link "${link.naam}" verwijderen?`)) return;
    await LinkFactory.remove(link.id);
    load();
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Links beheren</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Deze links verschijnen publiek op de <code>/links</code>-pagina.
      </p>

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Nieuwe link</div>
        <input type="text" value={nieuw.naam} onChange={(e) => setNieuw((p) => ({ ...p, naam: e.target.value }))} placeholder="Naam (bv. Antwerp Ropes)" style={inputStyle} />
        <input type="text" value={nieuw.url} onChange={(e) => setNieuw((p) => ({ ...p, url: e.target.value }))} placeholder="URL (bv. www.voorbeeld.be)" style={inputStyle} />
        <textarea value={nieuw.omschrijving} onChange={(e) => setNieuw((p) => ({ ...p, omschrijving: e.target.value }))} placeholder="Korte omschrijving (optioneel)" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}
        <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
          {toevoegBezig ? "Bezig..." : "+ Link toevoegen"}
        </button>
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((link) => (
          <div key={link.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.ink }}>{link.naam}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.forest }}>{link.url}</div>
              {link.omschrijving && <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 2 }}>{link.omschrijving}</div>}
            </div>
            <button onClick={() => handleVerwijderen(link)} style={btn(colors.stamp)}>
              Verwijderen
            </button>
          </div>
        ))}
      </div>

      {!loading && links.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen links toegevoegd.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};

function btn(color: string): React.CSSProperties {
  return { alignSelf: "flex-start", padding: "9px 18px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
