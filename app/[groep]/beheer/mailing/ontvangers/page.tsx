"use client";

import { useEffect, useMemo, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { MailContactFactory } from "@/lib/dbSchema";
import { useConceptenAantal } from "@/lib/useConceptenAantal";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { MailContact, WithId } from "@/types/models";

function datum(timestamp: unknown): string {
  const seconds = (timestamp as { seconds?: number } | null | undefined)?.seconds;
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleDateString("nl-BE");
}

export default function OntvangersPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const { aantal: aantalConcepten } = useConceptenAantal(groep.id);
  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/concepten`, label: "Concepten", count: aantalConcepten },
    { href: `${basis}/beheer/mailing/ontvangers`, label: "Ontvangers" },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  const [contacten, setContacten] = useState<WithId<MailContact>[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoek, setZoek] = useState("");

  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweEmail, setNieuweEmail] = useState("");
  const [nieuweMagMailen, setNieuweMagMailen] = useState(false);
  const [toevoegenBezig, setToevoegenBezig] = useState(false);
  const [toevoegenFout, setToevoegenFout] = useState<string | null>(null);

  async function laden() {
    setLoading(true);
    setContacten(await MailContactFactory.getAll(groep.id));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    MailContactFactory.getAll(groep.id).then((c) => {
      if (!actief) return;
      setContacten(c);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return contacten;
    return contacten.filter((c) => c.naam.toLowerCase().includes(term) || c.email.toLowerCase().includes(term));
  }, [contacten, zoek]);

  async function toevoegen() {
    setToevoegenFout(null);
    if (!nieuweEmail.trim() || !nieuweEmail.includes("@")) {
      setToevoegenFout("Vul een geldig e-mailadres in.");
      return;
    }
    setToevoegenBezig(true);
    try {
      if (await MailContactFactory.bestaat(groep.id, nieuweEmail)) {
        setToevoegenFout("Dit e-mailadres staat al in de lijst.");
        return;
      }
      await MailContactFactory.maak(groep.id, nieuweNaam.trim(), nieuweEmail, nieuweMagMailen);
      setNieuweNaam("");
      setNieuweEmail("");
      setNieuweMagMailen(false);
      await laden();
    } catch (err) {
      setToevoegenFout(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setToevoegenBezig(false);
    }
  }

  async function bewerkNaam(contact: WithId<MailContact>, naam: string) {
    if (naam === contact.naam) return;
    await MailContactFactory.bewerk(contact.id, { naam });
    setContacten((prev) => prev.map((c) => (c.id === contact.id ? { ...c, naam } : c)));
  }

  async function toggleMagMailen(contact: WithId<MailContact>) {
    const magMailen = !contact.magMailen;
    await MailContactFactory.bewerk(contact.id, { magMailen });
    setContacten((prev) => prev.map((c) => (c.id === contact.id ? { ...c, magMailen } : c)));
  }

  async function verwijderen(contact: WithId<MailContact>) {
    if (!confirm(`"${contact.naam || contact.email}" verwijderen uit de mailinglijst?`)) return;
    await MailContactFactory.verwijder(contact.id);
    setContacten((prev) => prev.filter((c) => c.id !== contact.id));
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Mailing</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Wie mag gemaild worden -- ook mensen zonder eigen vriendenboekje-fiche.
      </p>
      <AdminSubNav tabs={tabs} />

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>
          + Ontvanger toevoegen
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} placeholder="Naam" style={{ ...inputStijl, flex: "1 1 160px" }} />
          <input value={nieuweEmail} onChange={(e) => setNieuweEmail(e.target.value)} placeholder="E-mailadres" type="email" style={{ ...inputStijl, flex: "1 1 220px" }} />
          <button type="button" onClick={toevoegen} disabled={toevoegenBezig} style={knopStijl(colors.forest)}>
            {toevoegenBezig ? "Bezig..." : "Toevoegen"}
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={nieuweMagMailen} onChange={(e) => setNieuweMagMailen(e.target.checked)} />
          Mag meteen gemaild worden
        </label>
        {toevoegenFout && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.stamp, margin: 0 }}>{toevoegenFout}</p>}
      </div>

      <input
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoek op naam of e-mailadres..."
        style={{ ...inputStijl, marginBottom: 14 }}
      />

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {gefilterd.map((c) => (
          <div key={c.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input
              defaultValue={c.naam}
              onBlur={(e) => bewerkNaam(c, e.target.value.trim())}
              placeholder="(naamloos)"
              style={{ ...inputStijl, flex: "1 1 160px", fontWeight: 600 }}
            />
            <span style={{ flex: "1 1 220px", fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{c.email}</span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fonts.body, fontSize: 12, color: colors.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={c.magMailen} onChange={() => toggleMagMailen(c)} />
              Mag mailen
            </label>
            {c.entryId && (
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.forestDark, background: colors.paper, borderRadius: radius.badge, padding: "2px 8px" }}>
                🔗 fiche
              </span>
            )}
            {c.afgemeldOp && (
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.stamp }}>Afgemeld op {datum(c.afgemeldOp)}</span>
            )}
            <button type="button" onClick={() => verwijderen(c)} style={{ background: "none", border: "none", color: colors.stamp, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Verwijderen
            </button>
          </div>
        ))}
      </div>

      {!loading && gefilterd.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen ontvangers.</p>}
    </div>
  );
}

const inputStijl: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
  width: "100%",
};

function knopStijl(kleur: string): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: radius.badge,
    border: "none",
    background: kleur,
    color: colors.white,
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  };
}
