"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { auth } from "@/lib/firebase";
import { colors, fonts, radius } from "@/lib/theme";

interface Beheerder {
  userId: string;
  email: string | null;
}

export default function BeheerdersPage() {
  const groep = useGroep();

  const [beheerders, setBeheerders] = useState<Beheerder[] | null>(null);
  const [huidigeUid, setHuidigeUid] = useState<string | null>(null);
  const [nieuweEmail, setNieuweEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestiging, setBevestiging] = useState<string | null>(null);

  // Als raw promise-chain (i.p.v. async/await) geschreven zodat dit vanuit
  // de useEffect hieronder aangeroepen kan worden zonder de "setState
  // direct in een effect"-lintregel te triggeren (zelfde patroon als
  // app/systeembeheer/groepen/[id]/page.tsx : laadBeheerders).
  function laadBeheerders(): Promise<void> {
    if (!auth.currentUser) return Promise.resolve();
    return auth.currentUser
      .getIdToken()
      .then((idToken) =>
        fetch(`/api/beheerders?groepId=${encodeURIComponent(groep.id)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        })
      )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBeheerders(data.beheerders);
          setHuidigeUid(data.huidigeUid);
        }
      });
  }

  useEffect(() => {
    laadBeheerders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- laadBeheerders sluit enkel over `groep.id` (al in de deps) en stabiele setters.
  }, [groep.id]);

  async function beheerderToevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setFout(null);
    setBevestiging(null);
    setBezig(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/beheerders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ groepId: groep.id, email: nieuweEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toevoegen mislukt");
      setBevestiging(data.nieuwAccount ? `Uitnodiging verstuurd naar ${data.email}.` : `${data.email} is toegevoegd als beheerder.`);
      setNieuweEmail("");
      await laadBeheerders();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Toevoegen mislukt");
    } finally {
      setBezig(false);
    }
  }

  async function beheerderVerwijderen(userId: string) {
    if (!auth.currentUser) return;
    setFout(null);
    setBevestiging(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/beheerders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ groepId: groep.id, userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Verwijderen mislukt");
      }
      await laadBeheerders();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen mislukt");
    }
  }

  const laatsteBeheerder = beheerders !== null && beheerders.length <= 1;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Beheerders</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Iedereen hieronder kan {groep.naam} mee beheren.
      </p>

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px" }}>
        {beheerders === null && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Bezig met laden...</p>}

        {beheerders !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {beheerders.map((b) => {
              const isJezelf = b.userId === huidigeUid;
              const uitgeschakeld = isJezelf || laatsteBeheerder;
              const titel = isJezelf
                ? "Je kan jezelf niet verwijderen als beheerder."
                : laatsteBeheerder
                  ? "De laatste beheerder van een groep kan niet verwijderd worden."
                  : undefined;
              return (
                <div
                  key={b.userId}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${colors.line}`, borderRadius: radius.input }}
                >
                  <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, display: "flex", alignItems: "center", gap: 8 }}>
                    {b.email ?? <em style={{ color: colors.inkMuted }}>onbekend account ({b.userId})</em>}
                    {isJezelf && (
                      <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, color: colors.forest, background: colors.campfireLight, padding: "2px 8px", borderRadius: radius.badge }}>
                        Jij
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => beheerderVerwijderen(b.userId)}
                    disabled={uitgeschakeld}
                    title={titel}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: uitgeschakeld ? "default" : "pointer",
                      fontFamily: fonts.body,
                      fontSize: 12,
                      fontWeight: 600,
                      color: uitgeschakeld ? colors.line : colors.stamp,
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={beheerderToevoegen} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <input
            type="email"
            value={nieuweEmail}
            onChange={(e) => setNieuweEmail(e.target.value)}
            placeholder="e-mailadres"
            required
            style={{ ...inputStyle, flex: 1, minWidth: 220 }}
          />
          <button
            type="submit"
            disabled={bezig}
            style={{ padding: "10px 18px", borderRadius: radius.badge, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: bezig ? "default" : "pointer" }}
          >
            {bezig ? "Bezig..." : "Uitnodigen"}
          </button>
        </form>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>
          Heeft deze persoon nog geen account, dan wordt er automatisch een aangemaakt en krijgt die een e-mail om zelf een wachtwoord in te stellen. Bestaat er al een account (bv. bij een andere groep), dan krijgt die persoon meteen een mail dat hij/zij is toegevoegd.
        </p>
        {bevestiging && <div style={{ color: colors.forest, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, marginTop: 8 }}>{bevestiging}</div>}
        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: 8 }}>{fout}</div>}
      </div>
    </div>
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
