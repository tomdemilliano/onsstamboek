"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, WijzigingFactory, ActivityFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, Label, type EntryVelden } from "@/components/EntryVeldenEditor";
import { useAntiSpam } from "@/components/useAntiSpam";
import type { Entry, WithId } from "@/types/models";

export default function WijzigenPage(props: PageProps<"/[groep]/entry/[id]/wijzigen">) {
  const { id } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [entry, setEntry] = useState<WithId<Entry> | null | undefined>(undefined);
  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [email, setEmail] = useState("");
  const [versturen, setVersturen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);
  const { isBot, checkSom, HoneypotField, CaptchaField } = useAntiSpam();

  useEffect(() => {
    let actief = true;
    EntryFactory.getById(id).then((e) => {
      if (!actief) return;
      const geldig = e && e.status === "published" && e.groepId === groep.id;
      setEntry(geldig ? e : null);
      if (geldig && e) {
        setFields({
          naam: e.naam || "",
          geboortejaar: e.geboortejaar || "",
          totemnaam: e.totemnaam || "",
          periode: e.periode || "",
          leuksteActiviteit: e.leuksteActiviteit?.length ? e.leuksteActiviteit : [""],
          besteKampplaats: e.besteKampplaats?.length ? e.besteKampplaats : [""],
          lekkersteEten: e.lekkersteEten?.length ? e.lekkersteEten : [""],
        });
      }
    });
    return () => {
      actief = false;
    };
  }, [id, groep.id]);

  async function versturen_() {
    setFoutmelding(null);
    if (!fields.naam.trim()) {
      setFoutmelding("Vul minstens de naam in.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFoutmelding("Vul een geldig e-mailadres in — de beheerder kan hiermee eventueel nog contact opnemen.");
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
      await WijzigingFactory.create(groep.id, { entryId: id, ...opgeschoond(fields), email: email.trim() });
      await ActivityFactory.log(groep.id, {
        type: "entry",
        actie: "Wijziging voorgesteld op vriendenboekje-fiche",
        itemId: id,
        omschrijving: `"${entry?.naam}" — wacht op goedkeuring door de beheerder.`,
      });
      setVerzonden(true);
    } catch {
      setFoutmelding("Er ging iets mis bij het versturen. Probeer het straks nog eens.");
    } finally {
      setVersturen(false);
    }
  }

  if (entry === undefined) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }

  if (entry === null) {
    return <p style={{ padding: 48, textAlign: "center", fontFamily: fonts.body, color: colors.stamp }}>Deze fiche bestaat niet of is niet gepubliceerd.</p>;
  }

  if (verzonden) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <link rel="stylesheet" href={fontImports} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 100px" }}>
          <div style={{ marginTop: 60, textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
            <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Bedankt!</h1>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
              Je wijziging is doorgestuurd. De beheerder bekijkt ze eerst voor ze effectief wordt doorgevoerd op de fiche.
            </p>
            <Link
              href={`${basis}/entry/${id}`}
              style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: radius.badge, background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >
              Terug naar de fiche
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
          <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Wijziging voorstellen</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, maxWidth: 460, margin: "0 auto" }}>
            Klopt er iets niet (meer) aan de fiche van <strong>{entry.naam}</strong>? Pas hieronder aan wat nodig is.
          </p>
        </div>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryVeldenEditor fields={fields} onChange={setFields} />

          {HoneypotField}

          <div style={{ border: `1px dashed ${colors.line}`, borderRadius: radius.card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            <Label>Jouw e-mailadres — niet dat van {entry.naam}. Enkel zichtbaar voor de beheerder.</Label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@email.be"
              style={{ padding: "10px 12px", borderRadius: radius.input, border: `1px solid ${colors.line}`, background: colors.white, fontFamily: fonts.body, fontSize: 14, color: colors.ink, boxSizing: "border-box" }}
            />
          </div>

          {CaptchaField}

          {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={versturen_}
              disabled={versturen}
              style={{ padding: "12px 24px", borderRadius: radius.badge, border: "none", background: versturen ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: versturen ? "default" : "pointer" }}
            >
              {versturen ? "Bezig met versturen..." : "Wijziging versturen"}
            </button>
            <Link href={`${basis}/entry/${id}`} style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.inkMuted, textDecoration: "underline" }}>
              Annuleren
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
