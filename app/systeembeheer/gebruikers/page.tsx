"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { GroepFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Groep, WithId } from "@/types/models";

interface Gebruiker {
  uid: string;
  email: string | null;
  disabled: boolean;
  systeembeheerder: boolean;
  aangemaaktOp: string | null;
  laatsteAanmelding: string | null;
  aantalGroepen: number;
}

type NieuwType = "groepsbeheerder" | "systeembeheerder";

export default function GebruikersPage() {
  const [gebruikers, setGebruikers] = useState<Gebruiker[] | null>(null);
  const [groepen, setGroepen] = useState<WithId<Groep>[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  const [nieuwEmail, setNieuwEmail] = useState("");
  const [nieuwType, setNieuwType] = useState<NieuwType>("groepsbeheerder");
  const [nieuwGroepId, setNieuwGroepId] = useState("");
  const [uitnodigenBezig, setUitnodigenBezig] = useState(false);
  const [uitnodigenBericht, setUitnodigenBericht] = useState<string | null>(null);

  const [actieBezig, setActieBezig] = useState<string | null>(null);
  const [verwijderBevestigingVoor, setVerwijderBevestigingVoor] = useState<string | null>(null);

  // Als raw promise-chain geschreven (i.p.v. async/await) zodat dit vanuit
  // de useEffect hieronder aangeroepen kan worden zonder de "setState
  // direct in een effect"-lintregel te triggeren.
  function load(): Promise<void> {
    if (!auth.currentUser) return Promise.resolve();
    return auth.currentUser
      .getIdToken()
      .then((idToken) => fetch("/api/systeembeheer/gebruikers", { headers: { Authorization: `Bearer ${idToken}` } }))
      .then((res) =>
        res
          .json()
          .catch(() => null)
          .then((data) => ({ res, data }))
      )
      .then(({ res, data }) => {
        if (!res.ok || !data) {
          setFout(data?.error || `Laden mislukt (${res.status}).`);
          return;
        }
        setGebruikers(data.gebruikers);
      })
      .catch(() => setFout("Laden mislukt -- controleer je internetverbinding en probeer opnieuw."));
  }

  useEffect(() => {
    load();
    GroepFactory.getAll().then(setGroepen);
  }, []);

  async function uitnodigen(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setFout(null);
    setUitnodigenBericht(null);
    if (nieuwType === "groepsbeheerder" && !nieuwGroepId) {
      setFout("Kies een groep voor deze groepsbeheerder.");
      return;
    }
    setUitnodigenBezig(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/systeembeheer/gebruikers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          email: nieuwEmail.trim(),
          type: nieuwType,
          ...(nieuwType === "groepsbeheerder" ? { groepId: nieuwGroepId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uitnodigen mislukt");
      setUitnodigenBericht(data.opnieuwUitgenodigd ? `Uitnodiging opnieuw verstuurd naar ${data.email}.` : `Uitnodiging verstuurd naar ${data.email}.`);
      setNieuwEmail("");
      setNieuwGroepId("");
      await load();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Uitnodigen mislukt");
    } finally {
      setUitnodigenBezig(false);
    }
  }

  async function statusWisselen(gebruiker: Gebruiker) {
    if (!auth.currentUser) return;
    setFout(null);
    setActieBezig(gebruiker.uid);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/systeembeheer/gebruikers/${gebruiker.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ disabled: !gebruiker.disabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wijzigen mislukt");
      await load();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Wijzigen mislukt");
    } finally {
      setActieBezig(null);
    }
  }

  async function systeembeheerderWisselen(gebruiker: Gebruiker) {
    if (!auth.currentUser) return;
    setFout(null);
    setActieBezig(gebruiker.uid);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/systeembeheer/gebruikers/${gebruiker.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ systeembeheerder: !gebruiker.systeembeheerder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wijzigen mislukt");
      await load();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Wijzigen mislukt");
    } finally {
      setActieBezig(null);
    }
  }

  async function verwijderen(uid: string) {
    if (!auth.currentUser) return;
    setFout(null);
    setActieBezig(uid);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/systeembeheer/gebruikers/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setVerwijderBevestigingVoor(null);
      await load();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setActieBezig(null);
    }
  }

  const eigenUid = auth.currentUser?.uid;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Gebruikers</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Alle accounts op het platform. Een nieuwe gebruiker krijgt een uitnodigingsmail om zelf een wachtwoord in te stellen.
      </p>

      <form
        onSubmit={uitnodigen}
        style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>
          Gebruiker uitnodigen
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            value={nieuwEmail}
            onChange={(e) => setNieuwEmail(e.target.value)}
            placeholder="e-mailadres"
            required
            style={{ ...inputStyle, flex: 1, minWidth: 220 }}
          />
          <select value={nieuwType} onChange={(e) => setNieuwType(e.target.value as NieuwType)} style={{ ...inputStyle, width: 180 }}>
            <option value="groepsbeheerder">Groepsbeheerder</option>
            <option value="systeembeheerder">Systeembeheerder</option>
          </select>
          {nieuwType === "groepsbeheerder" && (
            <select value={nieuwGroepId} onChange={(e) => setNieuwGroepId(e.target.value)} required style={{ ...inputStyle, width: 200 }}>
              <option value="">— kies een groep —</option>
              {groepen.map((groep) => (
                <option key={groep.id} value={groep.id}>
                  {groep.naam}
                </option>
              ))}
            </select>
          )}
          <button type="submit" disabled={uitnodigenBezig} style={btn(colors.forest)}>
            {uitnodigenBezig ? "Bezig..." : "✉️ Uitnodigen"}
          </button>
        </div>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
          Een groepsbeheerder wordt meteen aan de gekozen groep gekoppeld -- zonder groep kan die nergens een
          beheerpagina laden. Bestaat het e-mailadres al, dan wordt gewoon een nieuwe wachtwoord-instellink verstuurd
          (en, indien gekozen, de rol toegevoegd/aangepast).
        </p>
        {uitnodigenBericht && <div style={{ color: colors.forest, fontFamily: fonts.body, fontSize: 13, fontWeight: 600 }}>✓ {uitnodigenBericht}</div>}
      </form>

      {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginBottom: 16 }}>{fout}</div>}

      {gebruikers === null && !fout && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gebruikers?.map((gebruiker) => (
          <div key={gebruiker.uid} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.ink }}>{gebruiker.email ?? "(geen e-mailadres)"}</span>
                {gebruiker.systeembeheerder && <Badge kleur={colors.stamp}>systeembeheerder</Badge>}
                {gebruiker.disabled && <Badge kleur={colors.inkMuted}>gedeactiveerd</Badge>}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                {gebruiker.aantalGroepen} groep{gebruiker.aantalGroepen === 1 ? "" : "en"}
                {gebruiker.laatsteAanmelding ? ` -- laatst aangemeld: ${new Date(gebruiker.laatsteAanmelding).toLocaleDateString("nl-BE")}` : " -- nog niet aangemeld"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => systeembeheerderWisselen(gebruiker)}
                disabled={actieBezig === gebruiker.uid || (gebruiker.systeembeheerder && gebruiker.uid === eigenUid)}
                title={gebruiker.systeembeheerder && gebruiker.uid === eigenUid ? "Je kan je eigen systeembeheerder-rol niet intrekken." : undefined}
                style={btnOutline}
              >
                {gebruiker.systeembeheerder ? "Systeembeheerder-rol intrekken" : "Systeembeheerder maken"}
              </button>
              <button onClick={() => statusWisselen(gebruiker)} disabled={actieBezig === gebruiker.uid} style={btnOutline}>
                {gebruiker.disabled ? "Activeren" : "Deactiveren"}
              </button>
              {verwijderBevestigingVoor === gebruiker.uid ? (
                <button onClick={() => verwijderen(gebruiker.uid)} disabled={actieBezig === gebruiker.uid} style={btn(colors.stamp)}>
                  Zeker? Klik opnieuw
                </button>
              ) : (
                <button onClick={() => setVerwijderBevestigingVoor(gebruiker.uid)} disabled={actieBezig === gebruiker.uid} style={{ ...btnOutline, color: colors.stamp, borderColor: colors.stamp }}>
                  Verwijderen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {gebruikers !== null && gebruikers.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen gebruikers.</p>}
    </div>
  );
}

function Badge({ children, kleur }: { children: React.ReactNode; kleur: string }) {
  return (
    <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, color: kleur, border: `1px solid ${kleur}`, borderRadius: radius.badge, padding: "1px 8px" }}>
      {children}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
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
  return { padding: "10px 20px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}

const btnOutline: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 999,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  color: colors.ink,
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
