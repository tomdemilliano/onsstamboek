"use client";

import { useState } from "react";
import { colors, fonts, radius } from "@/lib/theme";

function nieuweSom() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  return { a, b };
}

/**
 * Eenvoudige, lichtgewicht spambescherming voor publieke formulieren zonder
 * login (/toevoegen, /entry/[id]/wijzigen): een verborgen honeypot-veld
 * (bots vullen dit vaak automatisch in) + een rekensom. Geen extern dienst
 * nodig, zoals in de oude app.
 */
export function useAntiSpam() {
  const [honeypot, setHoneypot] = useState("");
  const [som, setSom] = useState(() => nieuweSom());
  const [somAntwoord, setSomAntwoord] = useState("");
  const [somFout, setSomFout] = useState(false);

  /** true = waarschijnlijk een bot (honeypot ingevuld) -- doe stilletjes alsof het gelukt is, zonder iets op te slaan. */
  function isBot(): boolean {
    return honeypot.trim().length > 0;
  }

  /** Controleert de rekensom; ververst 'm bij een fout antwoord. */
  function checkSom(): boolean {
    const juist = parseInt(somAntwoord, 10) === som.a + som.b;
    if (!juist) {
      setSom(nieuweSom());
      setSomAntwoord("");
      setSomFout(true);
    }
    return juist;
  }

  const HoneypotField = (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
      <label htmlFor="website-antispam">Laat dit veld leeg</label>
      <input
        id="website-antispam"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
    </div>
  );

  const CaptchaField = (
    <div style={{ border: `1px dashed ${colors.line}`, borderRadius: radius.card, padding: "14px 16px" }}>
      <label
        style={{
          display: "block",
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: 600,
          color: colors.inkMuted,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        Even controleren dat je geen robot bent
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink }}>
          Hoeveel is {som.a} + {som.b}?
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={somAntwoord}
          onChange={(e) => {
            setSomAntwoord(e.target.value);
            setSomFout(false);
          }}
          style={{
            width: 70,
            padding: "10px 12px",
            borderRadius: radius.input,
            border: `1px solid ${somFout ? colors.stamp : colors.line}`,
            background: colors.white,
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.ink,
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );

  return { isBot, checkSom, HoneypotField, CaptchaField };
}
