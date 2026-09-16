"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { OrganisatieFactory, GroepFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import type { Groep, Organisatie, WithId } from "@/types/models";

export default function OrganisatieDetail(props: PageProps<"/systeembeheer/organisaties/[id]">) {
  const { id } = use(props.params);

  const [organisatie, setOrganisatie] = useState<WithId<Organisatie> | null | undefined>(undefined);
  const [groepen, setGroepen] = useState<WithId<Groep>[]>([]);
  const [naam, setNaam] = useState("");
  const [bestand, setBestand] = useState<File | null>(null);
  const [takBenamingEnkelvoud, setTakBenamingEnkelvoud] = useState("");
  const [takBenamingMeervoud, setTakBenamingMeervoud] = useState("");
  const [gebruiktDas, setGebruiktDas] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  function vulFormulierIn(org: WithId<Organisatie>) {
    setNaam(org.naam);
    setTakBenamingEnkelvoud(org.takBenamingEnkelvoud || "");
    setTakBenamingMeervoud(org.takBenamingMeervoud || "");
    setGebruiktDas(org.gebruiktDas ?? true);
  }

  async function load() {
    const [org, alleGroepen] = await Promise.all([OrganisatieFactory.getById(id), GroepFactory.getAll()]);
    setOrganisatie(org);
    if (org) vulFormulierIn(org);
    setGroepen(alleGroepen.filter((g) => g.organisatieId === id));
  }

  useEffect(() => {
    let actief = true;
    Promise.all([OrganisatieFactory.getById(id), GroepFactory.getAll()]).then(([org, alleGroepen]) => {
      if (!actief) return;
      setOrganisatie(org);
      if (org) vulFormulierIn(org);
      setGroepen(alleGroepen.filter((g) => g.organisatieId === id));
    });
    return () => {
      actief = false;
    };
  }, [id]);

  const tabs = [
    { href: `/systeembeheer/organisaties/${id}`, label: "Overzicht", exact: true },
    { href: `/systeembeheer/organisaties/${id}/kentekens`, label: "🧭 Kentekens" },
    { href: `/systeembeheer/organisaties/${id}/mijlpalen`, label: "⚜️ Mijlpalen" },
    { href: `/systeembeheer/organisaties/${id}/standaardgroepen`, label: "🏕️ Standaardgroepen" },
  ];

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setOpgeslagen(false);
    try {
      await OrganisatieFactory.update(id, {
        naam,
        file: bestand,
        bestaandePath: organisatie?.logoPath,
        takBenamingEnkelvoud: takBenamingEnkelvoud.trim(),
        takBenamingMeervoud: takBenamingMeervoud.trim(),
        gebruiktDas,
      });
      setBestand(null);
      setOpgeslagen(true);
      await load();
    } finally {
      setBezig(false);
    }
  }

  if (organisatie === undefined) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (organisatie === null) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.stamp }}>Organisatie niet gevonden.</p>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/systeembeheer/organisaties" style={{ display: "inline-block", marginBottom: 14, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
        ← Alle organisaties
      </Link>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>{organisatie.naam}</h1>

      <AdminSubNav tabs={tabs} />

      <form onSubmit={opslaan}>
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Naam &amp; logo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {organisatie.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organisatie.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `1px solid ${colors.line}`, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: colors.campfireLight, flexShrink: 0 }} />
            )}
            <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} required style={{ ...inputStyle, flex: 1 }} />
          </div>
          <label style={{ ...labelStyle, cursor: "pointer" }}>
            Nieuw logo (optioneel -- laat leeg om het bestaande te behouden)
            <input type="file" accept="image/*" onChange={(e) => setBestand(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
          </label>
        </div>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Instellingen</div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              Tak-benaming (enkelvoud)
              <input
                type="text"
                value={takBenamingEnkelvoud}
                onChange={(e) => setTakBenamingEnkelvoud(e.target.value)}
                placeholder="tak"
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              Tak-benaming (meervoud)
              <input
                type="text"
                value={takBenamingMeervoud}
                onChange={(e) => setTakBenamingMeervoud(e.target.value)}
                placeholder="takken"
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          </div>
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
            Niet elke organisatie noemt dit &quot;takken&quot; -- bv. ook &quot;groepen&quot; of &quot;afdelingen&quot; is mogelijk. Leeg = standaard &quot;tak&quot;/&quot;takken&quot;. Wordt overal in het groepsbeheer en op de publieke site van elke gekoppelde groep gebruikt.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={gebruiktDas} onChange={(e) => setGebruiktDas(e.target.checked)} />
            Das gebruiken
          </label>
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
            Staat dit uit, dan verdwijnt het dasonderdeel uit de groepsinstellingen en uit de publieke header van elke groep binnen deze organisatie.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <button type="submit" disabled={bezig} style={btn(colors.forest)}>
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
          {opgeslagen && <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600 }}>✓ Opgeslagen</span>}
        </div>
      </form>

      <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>
        Gekoppelde groepen ({groepen.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groepen.map((groep) => (
          <Link key={groep.id} href={`/${groep.slug}/beheer`} style={{ textDecoration: "none" }}>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.ink }}>{groep.naam}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.forest, fontWeight: 600 }}>Beheer bekijken →</span>
            </div>
          </Link>
        ))}
      </div>
      {groepen.length === 0 && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Nog geen groep aan deze organisatie gekoppeld.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 3,
};

function btn(color: string): React.CSSProperties {
  return { alignSelf: "flex-start", padding: "9px 20px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
