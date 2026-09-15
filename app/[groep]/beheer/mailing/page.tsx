"use client";

import { useEffect, useRef, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, MailCampagneFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { naarRijkeHtml } from "@/lib/mailOpmaak";
import AdminSubNav from "@/components/AdminSubNav";

export default function MailingPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [aantalOntvangers, setAantalOntvangers] = useState<number | null>(null);
  const [stap, setStap] = useState<"opstellen" | "nazicht">("opstellen");
  const [testBezig, setTestBezig] = useState(false);
  const [testMelding, setTestMelding] = useState<string | null>(null);
  const [verzendBezig, setVerzendBezig] = useState(false);
  const [verzendFout, setVerzendFout] = useState<string | null>(null);
  const [verzendResultaat, setVerzendResultaat] = useState<{ aantalVerzonden: number; aantalMislukt: number } | null>(null);
  const tekstvakRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let actief = true;
    EntryFactory.getMailbareLeden(groep.id).then((leden) => {
      if (actief) setAantalOntvangers(leden.length);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  function omzetten(voor: string, na: string) {
    const el = tekstvakRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const eind = el.selectionEnd;
    const selectie = inhoud.slice(start, eind) || "tekst";
    const nieuw = inhoud.slice(0, start) + voor + selectie + na + inhoud.slice(eind);
    setInhoud(nieuw);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + voor.length, start + voor.length + selectie.length);
    });
  }

  function voegLinkToe() {
    const url = window.prompt("Naar welke link?", "https://");
    if (!url) return;
    omzetten("[", `](${url})`);
  }

  async function testVersturen() {
    setTestBezig(true);
    setTestMelding(null);
    try {
      await MailCampagneFactory.verstuurTest(groep.id, onderwerp, inhoud);
      setTestMelding("✓ Testmail verstuurd naar je eigen adres.");
    } catch (err) {
      setTestMelding(err instanceof Error ? err.message : "Versturen van testmail mislukt.");
    } finally {
      setTestBezig(false);
    }
  }

  async function verstuur() {
    setVerzendBezig(true);
    setVerzendFout(null);
    try {
      const resultaat = await MailCampagneFactory.verstuur(groep.id, onderwerp, inhoud);
      setVerzendResultaat(resultaat);
    } catch (err) {
      setVerzendFout(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setVerzendBezig(false);
    }
  }

  function opnieuwBeginnen() {
    setOnderwerp("");
    setInhoud("");
    setStap("opstellen");
    setVerzendResultaat(null);
    setTestMelding(null);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Mailing</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Stuur nieuws of een aankondiging naar leden die aangaven dit te willen ontvangen.
      </p>
      <AdminSubNav tabs={tabs} />

      {verzendResultaat ? (
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.ink, margin: "0 0 16px" }}>
            Verstuurd naar {verzendResultaat.aantalVerzonden} {verzendResultaat.aantalVerzonden === 1 ? "persoon" : "personen"}
            {verzendResultaat.aantalMislukt > 0 && `, ${verzendResultaat.aantalMislukt} mislukt`}.
          </p>
          <button onClick={opnieuwBeginnen} style={knopStijl(colors.forest)}>
            Nieuwe mailing opstellen
          </button>
        </div>
      ) : stap === "opstellen" ? (
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "block" }}>
            <span style={veldLabelStijl}>Onderwerp</span>
            <input value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} style={inputStijl} />
          </label>

          <label style={{ display: "block" }}>
            <span style={veldLabelStijl}>Inhoud</span>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button type="button" onClick={() => omzetten("**", "**")} style={werkbalkKnopStijl}>
                <strong>V</strong>et
              </button>
              <button type="button" onClick={voegLinkToe} style={werkbalkKnopStijl}>
                🔗 Link
              </button>
            </div>
            <textarea ref={tekstvakRef} value={inhoud} onChange={(e) => setInhoud(e.target.value)} rows={10} style={{ ...inputStijl, resize: "vertical", fontFamily: "inherit" }} />
          </label>

          {inhoud.trim() && (
            <div>
              <span style={veldLabelStijl}>Voorbeeld</span>
              <div
                style={{ border: `1px solid ${colors.line}`, borderRadius: radius.input, padding: "12px 14px", background: colors.white, fontFamily: fonts.body, fontSize: 14, color: colors.ink }}
                dangerouslySetInnerHTML={{ __html: naarRijkeHtml(inhoud) }}
              />
            </div>
          )}

          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, margin: 0 }}>
            {aantalOntvangers === null ? "Bezig met tellen..." : `${aantalOntvangers} ${aantalOntvangers === 1 ? "lid" : "leden"} gaf/gaven toestemming om gemaild te worden.`}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={testVersturen} disabled={testBezig || !onderwerp.trim() || !inhoud.trim()} style={knopStijl(colors.inkMuted, true)}>
              {testBezig ? "Bezig..." : "Verstuur testmail naar mezelf"}
            </button>
            {testMelding && <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest }}>{testMelding}</span>}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStap("nazicht")}
              disabled={!onderwerp.trim() || !inhoud.trim() || !aantalOntvangers}
              style={knopStijl(colors.forest)}
            >
              Volgende: nazicht
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={veldLabelStijl}>Onderwerp</span>
          <p style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 600, color: colors.ink, margin: 0 }}>{onderwerp}</p>

          <span style={veldLabelStijl}>Inhoud</span>
          <div
            style={{ border: `1px solid ${colors.line}`, borderRadius: radius.input, padding: "12px 14px", background: colors.white, fontFamily: fonts.body, fontSize: 14, color: colors.ink }}
            dangerouslySetInnerHTML={{ __html: naarRijkeHtml(inhoud) }}
          />

          {verzendFout && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.stamp, margin: 0 }}>{verzendFout}</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStap("opstellen")} disabled={verzendBezig} style={knopStijl(colors.inkMuted, true)}>
              Terug
            </button>
            <button type="button" onClick={verstuur} disabled={verzendBezig} style={knopStijl(colors.campfire)}>
              {verzendBezig ? "Bezig met versturen..." : `Ja, verstuur naar ${aantalOntvangers ?? 0} ${aantalOntvangers === 1 ? "persoon" : "personen"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const veldLabelStijl: React.CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: colors.inkMuted,
  marginBottom: 5,
};

const inputStijl: React.CSSProperties = {
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

const werkbalkKnopStijl: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: radius.badge,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 12,
  color: colors.ink,
  cursor: "pointer",
};

function knopStijl(kleur: string, outline?: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: radius.badge,
    border: outline ? `1px solid ${colors.line}` : "none",
    background: outline ? "transparent" : kleur,
    color: outline ? colors.inkMuted : colors.white,
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  };
}
