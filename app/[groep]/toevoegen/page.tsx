"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, ActivityFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, type EntryVelden } from "@/components/EntryVeldenEditor";
import { useAntiSpam } from "@/components/useAntiSpam";
import type { Entry, WithId } from "@/types/models";

export default function ToevoegenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [versturen, setVersturen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);
  const [nieuwEntryId, setNieuwEntryId] = useState<string | null>(null);
  const { isBot, checkSom, HoneypotField, CaptchaField } = useAntiSpam();

  // "Ben jij misschien X?" -- controle op bestaande stub-fiches (ontstaan
  // door het taggen van een naam op een foto/leidingsploeg zonder eigen
  // fiche). Zal in de praktijk nog weinig voorkomen zolang Foto's/Tijdlijn
  // niet gebouwd zijn, maar de check kost niets en is al klaar voor later.
  const [kandidaten, setKandidaten] = useState<WithId<Entry>[]>([]);
  const [gekozenStub, setGekozenStub] = useState<{ id: string; naam: string } | null>(null);
  const [promptAfgewezenVoor, setPromptAfgewezenVoor] = useState<string | null>(null);

  useEffect(() => {
    if (gekozenStub) return;
    const naamTrim = fields.naam.trim();
    const timer = setTimeout(() => {
      if (naamTrim.length < 3 || naamTrim === promptAfgewezenVoor) {
        setKandidaten([]);
        return;
      }
      EntryFactory.zoekMogelijkeStub(groep.id, naamTrim).then(setKandidaten);
    }, 500);
    return () => clearTimeout(timer);
  }, [fields.naam, gekozenStub, promptAfgewezenVoor, groep.id]);

  async function versturen_() {
    setFoutmelding(null);
    if (!fields.naam.trim()) {
      setFoutmelding("Vul minstens je naam in.");
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
      const schoon = opgeschoond(fields);
      if (gekozenStub) {
        await EntryFactory.upgradeStubMetFormulier(gekozenStub.id, schoon);
        await ActivityFactory.log(groep.id, {
          type: "entry",
          actie: "Stub-fiche gekoppeld aan formulier",
          itemId: gekozenStub.id,
          omschrijving: `"${schoon.naam}" — koppeling wacht op bevestiging door de beheerder.`,
        });
      } else {
        const nieuwId = await EntryFactory.createPublicSubmission(groep.id, schoon);
        setNieuwEntryId(nieuwId);
        await ActivityFactory.log(groep.id, {
          type: "entry",
          actie: "Nieuw vriendenboekje-formulier ingediend",
          itemId: nieuwId,
          omschrijving: `"${schoon.naam}" — al zichtbaar, wacht op goedkeuring.`,
        });
      }
      setVerzonden(true);
    } catch (err) {
      console.error("Versturen van vriendenboekje-formulier mislukt:", err);
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
          <div style={{ marginTop: 60, textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{gekozenStub ? "🔍" : "🙌"}</div>
            <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>
              {gekozenStub ? "Bijna klaar!" : "Bedankt!"}
            </h1>
            {gekozenStub ? (
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
                Je gegevens zijn verstuurd, maar staan nog niet meteen online — de beheerder controleert eerst de koppeling.
              </p>
            ) : (
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
                Je fiche staat al online! De beheerder kijkt ze binnenkort nog even na.
              </p>
            )}
            {nieuwEntryId && (
              <Link href={`${basis}/entry/${nieuwEntryId}`} style={{ display: "inline-block", marginTop: 14, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest }}>
                → Bekijk je eigen fiche
              </Link>
            )}
            <Link
              href={`${basis}/vriendenboekje`}
              style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: radius.badge, background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >
              Terug naar het vriendenboekje
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 32px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Voeg jezelf toe</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, maxWidth: 440, margin: "0 auto" }}>
            Sta je nog niet in het vriendenboekje, maar wil je er graag bij horen? Je fiche komt meteen online te staan (met een &quot;wacht op goedkeuring&quot;-label tot de beheerder ze even bekeken heeft).
          </p>
        </div>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {gekozenStub && (
            <div style={{ background: colors.forest, borderRadius: radius.card, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.white, fontWeight: 600 }}>
                ✓ Gekoppeld aan de bestaande, al eerder getagde fiche van &quot;{gekozenStub.naam}&quot;
              </span>
              <button
                type="button"
                onClick={() => {
                  setGekozenStub(null);
                  setPromptAfgewezenVoor(fields.naam.trim());
                }}
                style={{ background: "none", border: "none", color: colors.white, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
              >
                Toch niet
              </button>
            </div>
          )}

          {!gekozenStub && kandidaten.length > 0 && (
            <div style={{ background: colors.campfireLight, border: `1.5px dashed ${colors.campfire}`, borderRadius: radius.card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {kandidaten.map((k) => (
                <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
                    Ben jij misschien <strong>{k.naam}</strong>? Die naam staat al getagd op foto&apos;s/leidingsploegen.
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setGekozenStub({ id: k.id, naam: k.naam })}
                      style={{ padding: "6px 14px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Ja, dat ben ik
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptAfgewezenVoor(fields.naam.trim())}
                      style={{ padding: "6px 14px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: colors.white, color: colors.ink, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Nee, iemand anders
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <EntryVeldenEditor fields={fields} onChange={setFields} />

          {HoneypotField}
          {CaptchaField}

          {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={versturen_}
              disabled={versturen}
              style={{ padding: "12px 24px", borderRadius: radius.badge, border: "none", background: versturen ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: versturen ? "default" : "pointer" }}
            >
              {versturen ? "Bezig met versturen..." : "Versturen"}
            </button>
            <Link href={`${basis}/vriendenboekje`} style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.inkMuted, textDecoration: "underline" }}>
              Annuleren
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
