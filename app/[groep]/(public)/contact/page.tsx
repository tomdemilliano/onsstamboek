"use client";

import { useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { ContactFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { useAntiSpam } from "@/components/useAntiSpam";

export default function ContactPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const { isBot, checkSom, HoneypotField, CaptchaField } = useAntiSpam();

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [bericht, setBericht] = useState("");
  const [versturen, setVersturen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);

  async function handleVerstuur() {
    setFoutmelding(null);

    if (!naam.trim() || !bericht.trim()) {
      setFoutmelding("Vul minstens je naam en een bericht in.");
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
      // Het "groep"-veld uit de oude, single-tenant contactfunctie (daar
      // bedoeld om de afzenders eigen scoutsgroep te vragen bij een "wil
      // je ook zo'n website"-aanvraag) heeft hier geen duidelijk doel meer
      // -- dit formulier gaat altijd al naar de beheerder van déze ene
      // groep. Leeg meesturen om het bestaande schema niet te wijzigen.
      await ContactFactory.create(groep.id, { naam: naam.trim(), email: email.trim(), groep: "", bericht: bericht.trim() });
      setVerzonden(true);
    } catch (err) {
      console.error("Versturen van contactbericht mislukt:", err);
      setFoutmelding("Er ging iets mis bij het versturen. Probeer het straks nog eens.");
    } finally {
      setVersturen(false);
    }
  }

  if (verzonden) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <link rel="stylesheet" href={fontImports} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 100px" }}>
          <div style={{ marginTop: 40, textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Bedankt!</h1>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
              Je bericht is verstuurd. De beheerder van {groep.naam} neemt zo snel mogelijk contact met je op.
            </p>
            <Link href={basis} style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: radius.badge, background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Terug naar de startpagina
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 32px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>
            Contacteer {groep.naam}
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, maxWidth: 440, margin: "0 auto" }}>
            Een vraag, foutje gevonden, of iets anders om door te geven aan de beheerder? Laat het hieronder weten.
          </p>
        </div>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Veld label="Naam" value={naam} onChange={setNaam} placeholder="Voornaam Achternaam" />
          <Veld label="E-mailadres" value={email} onChange={setEmail} placeholder="jouw@email.be" type="email" />
          <Veld label="Bericht" value={bericht} onChange={setBericht} multiline />

          {HoneypotField}
          {CaptchaField}

          {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}

          <button
            onClick={handleVerstuur}
            disabled={versturen}
            style={{ alignSelf: "flex-start", padding: "12px 24px", borderRadius: radius.badge, border: "none", background: versturen ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: versturen ? "default" : "pointer" }}
          >
            {versturen ? "Bezig met versturen..." : "Versturen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Veld({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
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
