"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GroepFactory, OrganisatieFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Groep, Organisatie, WithId } from "@/types/models";

function slugify(naam: string): string {
  return naam
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function GroepenPage() {
  const [groepen, setGroepen] = useState<WithId<Groep>[]>([]);
  const [organisaties, setOrganisaties] = useState<WithId<Organisatie>[]>([]);
  const [loading, setLoading] = useState(true);

  const [naam, setNaam] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAangepast, setSlugAangepast] = useState(false);
  const [toevoegBezig, setToevoegBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [alleGroepen, orgs] = await Promise.all([GroepFactory.getAll(), OrganisatieFactory.getAll()]);
    setGroepen(alleGroepen);
    setOrganisaties(orgs);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([GroepFactory.getAll(), OrganisatieFactory.getAll()]).then(([alleGroepen, orgs]) => {
      if (!actief) return;
      setGroepen(alleGroepen);
      setOrganisaties(orgs);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, []);

  function handleNaamChange(v: string) {
    setNaam(v);
    if (!slugAangepast) setSlug(slugify(v));
  }

  async function handleToevoegen() {
    setFout(null);
    const veiligeSlug = slugify(slug);
    if (!naam.trim()) {
      setFout("Vul een naam in.");
      return;
    }
    if (!veiligeSlug) {
      setFout("Vul een geldige slug in (enkel letters, cijfers en koppeltekens).");
      return;
    }
    setToevoegBezig(true);
    try {
      const bestaande = await GroepFactory.getBySlug(veiligeSlug);
      if (bestaande) {
        setFout(`De slug "${veiligeSlug}" is al in gebruik door "${bestaande.naam}".`);
        return;
      }
      await GroepFactory.create({ naam: naam.trim(), slug: veiligeSlug });
      setNaam("");
      setSlug("");
      setSlugAangepast(false);
      await load();
    } catch (err) {
      console.error("Aanmaken van groep mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setToevoegBezig(false);
    }
  }

  function organisatieNaam(organisatieId?: string | null) {
    if (!organisatieId) return null;
    return organisaties.find((o) => o.id === organisatieId)?.naam || null;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Groepen</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Alle scoutsgroepen op dit platform. Elke groep krijgt een eigen padsegment (<code>onsstamboek.be/&lt;slug&gt;/...</code>) en beheert zichzelf verder via zijn eigen <code>/beheer</code>.
      </p>

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>Nieuwe groep</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={naam}
            onChange={(e) => handleNaamChange(e.target.value)}
            placeholder="bv. Sint-Eduardusscouts"
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugAangepast(true);
            }}
            placeholder="slug (bv. sinteduardus)"
            style={{ ...inputStyle, width: 220 }}
          />
          <button onClick={handleToevoegen} disabled={toevoegBezig} style={btn(colors.forest)}>
            {toevoegBezig ? "Bezig..." : "+ Aanmaken"}
          </button>
        </div>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
          Overige velden (gemeente, contact, organisatie, oprichtingsjaar, status) vul je aan via de detailpagina na het aanmaken.
        </p>
        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groepen.map((groep) => (
          <Link key={groep.id} href={`/systeembeheer/groepen/${groep.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{groep.naam}</span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 11,
                      fontWeight: 700,
                      color: groep.status === "actief" ? colors.forest : colors.inkMuted,
                      background: groep.status === "actief" ? colors.campfireLight : "transparent",
                      border: `1px solid ${groep.status === "actief" ? colors.forest : colors.line}`,
                      borderRadius: radius.badge,
                      padding: "1px 8px",
                    }}
                  >
                    {groep.status === "actief" ? "actief" : "gepauzeerd"}
                  </span>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                  /{groep.slug}
                  {groep.gemeente ? ` -- ${groep.gemeente}` : ""}
                  {organisatieNaam(groep.organisatieId) ? ` -- ${organisatieNaam(groep.organisatieId)}` : ""}
                </div>
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600 }}>Beheren →</span>
            </div>
          </Link>
        ))}
      </div>

      {!loading && groepen.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen groepen aangemaakt.</p>}
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
