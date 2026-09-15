"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { MailContactFactory, MailCampagneFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import MailRichEditor from "@/components/MailRichEditor";
import type { MailContact, WithId } from "@/types/models";

/** De editor levert altijd geldige HTML, ook leeg (bv. "<p></p>") -- dus telt de tekst zonder tags om te bepalen of er echt iets ingevuld is. */
function heeftInhoud(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

export default function MailingPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/ontvangers`, label: "Ontvangers" },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  const [onderwerp, setOnderwerp] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [doelgroep, setDoelgroep] = useState<"alle" | "selectie">("alle");
  const [geselecteerdeIds, setGeselecteerdeIds] = useState<string[]>([]);
  const [contactZoek, setContactZoek] = useState("");
  const [contacten, setContacten] = useState<WithId<MailContact>[]>([]);
  const [campagneId, setCampagneId] = useState<string | undefined>(undefined);
  const [stap, setStap] = useState<"opstellen" | "nazicht">("opstellen");
  const [conceptBezig, setConceptBezig] = useState(false);
  const [conceptMelding, setConceptMelding] = useState<string | null>(null);
  const [testBezig, setTestBezig] = useState(false);
  const [testMelding, setTestMelding] = useState<string | null>(null);
  const [verzendBezig, setVerzendBezig] = useState(false);
  const [verzendFout, setVerzendFout] = useState<string | null>(null);
  const [verzendResultaat, setVerzendResultaat] = useState<{ aantalVerzonden: number; aantalMislukt: number } | null>(null);

  useEffect(() => {
    let actief = true;
    MailContactFactory.getAll(groep.id).then((c) => {
      if (actief) setContacten(c);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  useEffect(() => {
    const id = searchParams.get("conceptId");
    if (!id) return;
    MailCampagneFactory.getConcept(id).then((concept) => {
      if (!concept || concept.status !== "concept") return;
      setCampagneId(concept.id);
      setOnderwerp(concept.onderwerp);
      setInhoud(concept.inhoud);
      setDoelgroep(concept.doelgroep);
      setGeselecteerdeIds(concept.contactIds || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mailbareContacten = useMemo(() => contacten.filter((c) => c.magMailen), [contacten]);
  const gefilterdeContacten = useMemo(() => {
    const term = contactZoek.trim().toLowerCase();
    if (!term) return mailbareContacten;
    return mailbareContacten.filter((c) => c.naam.toLowerCase().includes(term) || c.email.toLowerCase().includes(term));
  }, [mailbareContacten, contactZoek]);
  const aantalOntvangers = doelgroep === "alle" ? mailbareContacten.length : geselecteerdeIds.length;

  function toggleContact(id: string) {
    setGeselecteerdeIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function velden() {
    return { onderwerp, inhoud, doelgroep, contactIds: doelgroep === "selectie" ? geselecteerdeIds : undefined };
  }

  async function bewaarConcept() {
    setConceptBezig(true);
    setConceptMelding(null);
    try {
      const id = await MailCampagneFactory.bewaarConcept(groep.id, velden(), campagneId);
      setCampagneId(id);
      router.replace(`${pathname}?conceptId=${id}`);
      setConceptMelding("✓ Concept bewaard.");
    } catch (err) {
      setConceptMelding(err instanceof Error ? err.message : "Bewaren mislukt.");
    } finally {
      setConceptBezig(false);
    }
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
      const resultaat = await MailCampagneFactory.verstuur(groep.id, { ...velden(), campagneId });
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
    setDoelgroep("alle");
    setGeselecteerdeIds([]);
    setCampagneId(undefined);
    setStap("opstellen");
    setVerzendResultaat(null);
    setTestMelding(null);
    setConceptMelding(null);
    router.replace(pathname);
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
            <MailRichEditor value={inhoud} onChange={setInhoud} />
          </label>

          <div>
            <span style={veldLabelStijl}>Doelgroep</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer" }}>
                <input type="radio" checked={doelgroep === "alle"} onChange={() => setDoelgroep("alle")} />
                Iedereen die opt-in gaf ({mailbareContacten.length})
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer" }}>
                <input type="radio" checked={doelgroep === "selectie"} onChange={() => setDoelgroep("selectie")} />
                Een selectie ({geselecteerdeIds.length} gekozen)
              </label>
            </div>

            {doelgroep === "selectie" && (
              <div style={{ marginTop: 10, border: `1px solid ${colors.line}`, borderRadius: radius.input, padding: "10px 12px" }}>
                <input
                  value={contactZoek}
                  onChange={(e) => setContactZoek(e.target.value)}
                  placeholder="Zoek op naam of e-mailadres..."
                  style={{ ...inputStijl, marginBottom: 8 }}
                />
                <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {gefilterdeContacten.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer", padding: "4px 2px" }}>
                      <input type="checkbox" checked={geselecteerdeIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                      {c.naam || <em>(naamloos)</em>} <span style={{ color: colors.inkMuted }}>— {c.email}</span>
                    </label>
                  ))}
                  {gefilterdeContacten.length === 0 && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, margin: 0 }}>Geen resultaten.</p>}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={testVersturen} disabled={testBezig || !onderwerp.trim() || !heeftInhoud(inhoud)} style={knopStijl(colors.inkMuted, true)}>
              {testBezig ? "Bezig..." : "Verstuur testmail naar mezelf"}
            </button>
            <button type="button" onClick={bewaarConcept} disabled={conceptBezig || (!onderwerp.trim() && !heeftInhoud(inhoud))} style={knopStijl(colors.inkMuted, true)}>
              {conceptBezig ? "Bezig..." : "Bewaar als concept"}
            </button>
            {(testMelding || conceptMelding) && <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest }}>{testMelding || conceptMelding}</span>}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStap("nazicht")}
              disabled={!onderwerp.trim() || !heeftInhoud(inhoud) || aantalOntvangers === 0}
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
            dangerouslySetInnerHTML={{ __html: inhoud }}
          />

          <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, margin: 0 }}>
            Doelgroep: {doelgroep === "alle" ? "iedereen die opt-in gaf" : "een selectie"} -- {aantalOntvangers}{" "}
            {aantalOntvangers === 1 ? "ontvanger" : "ontvangers"}.
          </p>

          {verzendFout && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.stamp, margin: 0 }}>{verzendFout}</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStap("opstellen")} disabled={verzendBezig} style={knopStijl(colors.inkMuted, true)}>
              Terug
            </button>
            <button type="button" onClick={verstuur} disabled={verzendBezig} style={knopStijl(colors.campfire)}>
              {verzendBezig ? "Bezig met versturen..." : `Ja, verstuur naar ${aantalOntvangers} ${aantalOntvangers === 1 ? "persoon" : "personen"}`}
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
