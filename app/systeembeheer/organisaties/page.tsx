"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrganisatieFactory, GroepFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Groep, Organisatie, WithId } from "@/types/models";

export default function OrganisatiesPage() {
  const [organisaties, setOrganisaties] = useState<WithId<Organisatie>[]>([]);
  const [groepen, setGroepen] = useState<WithId<Groep>[]>([]);
  const [loading, setLoading] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [orgs, alleGroepen] = await Promise.all([OrganisatieFactory.getAll(), GroepFactory.getAll()]);
    setOrganisaties(orgs);
    setGroepen(alleGroepen);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([OrganisatieFactory.getAll(), GroepFactory.getAll()]).then(([orgs, alleGroepen]) => {
      if (!actief) return;
      setOrganisaties(orgs);
      setGroepen(alleGroepen);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, []);

  async function handleToevoegen() {
    setFout(null);
    if (!nieuweNaam.trim()) {
      setFout("Vul een naam in.");
      return;
    }
    setToevoegBezig(true);
    try {
      await OrganisatieFactory.create(nieuweNaam.trim());
      setNieuweNaam("");
      await load();
    } catch (err) {
      console.error("Aanmaken van organisatie mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setToevoegBezig(false);
    }
  }

  function aantalGroepen(organisatieId: string) {
    return groepen.filter((g) => g.organisatieId === organisatieId).length;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Organisaties</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Een organisatie (bv. een scoutsbeweging) bundelt content die gedeeld wordt door meerdere groepen -- jaarkentekens, scouting-brede mijlpalen op de tijdlijn, en later mogelijk nog andere dingen. Een groep koppelt zich aan een organisatie via zijn eigen instellingen.
      </p>

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Nieuwe organisatie</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={nieuweNaam}
            onChange={(e) => setNieuweNaam(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleToevoegen()}
            placeholder="bv. Scouts en Gidsen Vlaanderen"
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
            {toevoegBezig ? "Bezig..." : "+ Aanmaken"}
          </button>
        </div>
        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {organisaties.map((org) => (
          <Link key={org.id} href={`/systeembeheer/organisaties/${org.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${colors.line}` }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: colors.campfireLight, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧭</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{org.naam}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>
                  {aantalGroepen(org.id)} groep{aantalGroepen(org.id) === 1 ? "" : "en"} gekoppeld
                </div>
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600 }}>Beheren →</span>
            </div>
          </Link>
        ))}
      </div>

      {!loading && organisaties.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen organisaties aangemaakt.</p>}
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

function btn(color: string): React.CSSProperties {
  return { padding: "10px 20px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
