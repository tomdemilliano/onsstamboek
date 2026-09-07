"use client";

import { useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { GroepMijlpaalFactory, ActivityFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { useAntiSpam } from "@/components/useAntiSpam";
import { Label } from "@/components/EntryVeldenEditor";

// Enkel mijlpalen van de eigen groep (🚩) -- scouting-brede mijlpalen (⚜️)
// worden centraal beheerd door de systeembeheerder (organisaties/{id}/
// mijlpalen), daar is geen publiek voorstel-pad voor.
export default function MijlpaalToevoegenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [jaar, setJaar] = useState("");
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [email, setEmail] = useState("");
  const [versturen, setVersturen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);
  const { isBot, checkSom, HoneypotField, CaptchaField } = useAntiSpam();

  async function versturen_() {
    setFoutmelding(null);
    const jaarNum = parseInt(jaar, 10);
    if (!jaarNum || jaarNum < 1900 || jaarNum > 2200) {
      setFoutmelding("Vul een geldig jaartal in.");
      return;
    }
    if (!titel.trim()) {
      setFoutmelding("Vul een titel in.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFoutmelding("Vul een geldig e-mailadres in.");
      return;
    }
    if (!checkSom()) {
      setFoutmelding("Dat is niet het juiste antwoord op de rekensom — probeer opnieuw.");
      return;
    }
    if (isBot()) {
      setVerzonden(true);
      return;
    }

    setVersturen(true);
    try {
      const nieuwId = await GroepMijlpaalFactory.createPublic(groep.id, {
        jaar: jaarNum,
        titel: titel.trim(),
        beschrijving: beschrijving.trim(),
        contactEmail: email.trim(),
      });
      await ActivityFactory.log(groep.id, {
        type: "mijlpaal",
        actie: "Nieuwe mijlpaal voorgesteld",
        itemId: nieuwId,
        omschrijving: `${jaarNum} — "${titel.trim()}" — wacht op goedkeuring.`,
      });
      setVerzonden(true);
    } catch (err) {
      console.error("Versturen van mijlpaal mislukt:", err);
      setFoutmelding("Er ging iets mis bij het versturen. Probeer het straks nog eens.");
    } finally {
      setVersturen(false);
    }
  }

  if (verzonden) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ marginTop: 40, textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚩</div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Bedankt!</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
            Je mijlpaal is verstuurd. De beheerder kijkt &apos;m nog even na voor hij op de tijdlijn verschijnt.
          </p>
          <Link href={`${basis}/tijdlijn`} style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: radius.badge, background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Terug naar de tijdlijn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 100px" }}>
      <div style={{ textAlign: "center", margin: "28px 0 32px" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Stel een mijlpaal voor</h1>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, maxWidth: 440, margin: "0 auto" }}>
          Ken je een belangrijk moment uit de geschiedenis van {groep.naam} dat nog niet op de tijdlijn staat?
        </p>
      </div>

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 110 }}>
            <Label>Jaar</Label>
            <input type="number" value={jaar} onChange={(e) => setJaar(e.target.value)} placeholder="1944" style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Label>Titel</Label>
            <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="bv. Oprichting van de groep" style={inputStyle} />
          </div>
        </div>

        <div>
          <Label>Beschrijving (optioneel)</Label>
          <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div>
          <Label>Je e-mailadres</Label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jouw@email.be" style={inputStyle} />
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>Enkel zichtbaar voor de beheerder, voor eventuele vragen — niet publiek.</p>
        </div>

        {HoneypotField}
        {CaptchaField}

        {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}

        <button
          onClick={versturen_}
          disabled={versturen}
          style={{ alignSelf: "flex-start", padding: "12px 24px", borderRadius: radius.badge, border: "none", background: versturen ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: versturen ? "default" : "pointer" }}
        >
          {versturen ? "Bezig met versturen..." : "Versturen"}
        </button>
      </div>
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
