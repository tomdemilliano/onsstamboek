"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GroepFactory, OrganisatieFactory } from "@/lib/dbSchema";
import { auth } from "@/lib/firebase";
import { colors, fonts, radius } from "@/lib/theme";
import { naarWebadres } from "@/lib/textUtils";
import type { Groep, GroepStatus, Organisatie, WithId } from "@/types/models";

export default function GroepDetail(props: PageProps<"/systeembeheer/groepen/[id]">) {
  const { id } = use(props.params);
  const router = useRouter();

  const [groep, setGroep] = useState<WithId<Groep> | null | undefined>(undefined);
  const [organisaties, setOrganisaties] = useState<WithId<Organisatie>[]>([]);

  const [naam, setNaam] = useState("");
  const [webadres, setWebadres] = useState("");
  const [gemeente, setGemeente] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [oprichtingsjaar, setOprichtingsjaar] = useState("");
  const [organisatieId, setOrganisatieId] = useState("");
  const [status, setStatus] = useState<GroepStatus>("actief");

  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const [statusWisselBezig, setStatusWisselBezig] = useState(false);
  const [verwijderBevestiging, setVerwijderBevestiging] = useState("");
  const [verwijderBezig, setVerwijderBezig] = useState(false);
  const [verwijderFout, setVerwijderFout] = useState<string | null>(null);

  function vulFormulierIn(g: WithId<Groep>) {
    setNaam(g.naam);
    setWebadres(g.slug);
    setGemeente(g.gemeente ?? "");
    setContactEmail(g.contactEmail ?? "");
    setOprichtingsjaar(g.oprichtingsjaar?.toString() ?? "");
    setOrganisatieId(g.organisatieId ?? "");
    setStatus(g.status);
  }

  async function load() {
    const [g, orgs] = await Promise.all([GroepFactory.getById(id), OrganisatieFactory.getAll()]);
    setGroep(g);
    setOrganisaties(orgs);
    if (g) vulFormulierIn(g);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([GroepFactory.getById(id), OrganisatieFactory.getAll()]).then(([g, orgs]) => {
      if (!actief) return;
      setGroep(g);
      setOrganisaties(orgs);
      if (g) vulFormulierIn(g);
    });
    return () => {
      actief = false;
    };
  }, [id]);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    const veiligWebadres = naarWebadres(webadres);
    if (!veiligWebadres) {
      setFout("Vul een geldig webadres in (enkel letters, cijfers en koppeltekens).");
      return;
    }
    setBezig(true);
    setOpgeslagen(false);
    try {
      if (veiligWebadres !== groep?.slug) {
        const bestaande = await GroepFactory.getBySlug(veiligWebadres);
        if (bestaande && bestaande.id !== id) {
          setFout(`Het webadres "${veiligWebadres}" is al in gebruik door "${bestaande.naam}".`);
          setBezig(false);
          return;
        }
      }
      await GroepFactory.update(id, {
        naam,
        slug: veiligWebadres,
        gemeente,
        contactEmail,
        oprichtingsjaar: oprichtingsjaar ? Number(oprichtingsjaar) : null,
        organisatieId: organisatieId || null,
        status,
      });
      setOpgeslagen(true);
      await load();
    } catch (err) {
      console.error("Opslaan van groep mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function statusWisselen() {
    if (!groep) return;
    const nieuweStatus: GroepStatus = groep.status === "actief" ? "gepauzeerd" : "actief";
    setStatusWisselBezig(true);
    try {
      await GroepFactory.update(id, { status: nieuweStatus });
      await load();
    } finally {
      setStatusWisselBezig(false);
    }
  }

  async function volledigVerwijderen() {
    if (!groep || !auth.currentUser) return;
    setVerwijderFout(null);
    setVerwijderBezig(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/systeembeheer/verwijder-groep", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ groepId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      router.push("/systeembeheer/groepen");
    } catch (err) {
      setVerwijderFout(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setVerwijderBezig(false);
    }
  }

  if (groep === undefined) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (groep === null) {
    return <p style={{ padding: "32px 20px", fontFamily: fonts.body, color: colors.stamp }}>Groep niet gevonden.</p>;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/systeembeheer/groepen" style={{ display: "inline-block", marginBottom: 14, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
        ← Alle groepen
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: 0 }}>{groep.naam}</h1>
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 700,
            color: groep.status === "actief" ? colors.forest : colors.inkMuted,
            background: groep.status === "actief" ? colors.campfireLight : "transparent",
            border: `1px solid ${groep.status === "actief" ? colors.forest : colors.line}`,
            borderRadius: radius.badge,
            padding: "2px 10px",
          }}
        >
          {groep.status === "actief" ? "actief" : "gepauzeerd"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/${groep.slug}`} target="_blank" style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600, textDecoration: "none" }}>
          🔗 Publieke site
        </Link>
        <Link href={`/${groep.slug}/beheer`} target="_blank" style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600, textDecoration: "none" }}>
          ⚙️ Groepenbeheer
        </Link>
        <button
          onClick={statusWisselen}
          disabled={statusWisselBezig}
          style={{
            padding: "5px 14px",
            borderRadius: radius.badge,
            border: `1px solid ${colors.line}`,
            background: colors.white,
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 600,
            cursor: statusWisselBezig ? "default" : "pointer",
          }}
        >
          {statusWisselBezig ? "Bezig..." : groep.status === "actief" ? "⏸ Pauzeren" : "▶ Activeren"}
        </button>
      </div>

      <form onSubmit={opslaan} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Veld label="Naam">
          <input value={naam} onChange={(e) => setNaam(e.target.value)} required style={inputStyle} />
        </Veld>

        <Veld label="Webadres" hint={`Bepaalt de publieke URL: onsstamboek.be/${webadres || "..."}/... -- wijzigen breekt bestaande gedeelde links naar deze groep.`}>
          <input value={webadres} onChange={(e) => setWebadres(e.target.value)} required style={inputStyle} />
        </Veld>

        <Veld label="Gemeente">
          <input value={gemeente} onChange={(e) => setGemeente(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Algemeen contactadres">
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Oprichtingsjaar">
          <input type="number" value={oprichtingsjaar} onChange={(e) => setOprichtingsjaar(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Organisatie" hint="Koppelt deze groep aan een scoutsbeweging voor gedeelde jaarkentekens en scouting-brede mijlpalen.">
          <select value={organisatieId} onChange={(e) => setOrganisatieId(e.target.value)} style={inputStyle}>
            <option value="">— geen organisatie —</option>
            {organisaties.map((org) => (
              <option key={org.id} value={org.id}>
                {org.naam}
              </option>
            ))}
          </select>
        </Veld>

        <Veld label="Status" hint="Een gepauzeerde groep blijft bestaan maar is niet meer publiek bereikbaar (404).">
          <select value={status} onChange={(e) => setStatus(e.target.value as GroepStatus)} style={inputStyle}>
            <option value="actief">Actief</option>
            <option value="gepauzeerd">Gepauzeerd</option>
          </select>
        </Veld>

        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={bezig}
            style={{ padding: "10px 22px", borderRadius: radius.badge, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: bezig ? "default" : "pointer" }}
          >
            {bezig ? "Bezig met opslaan..." : "Opslaan"}
          </button>
          {opgeslagen && <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600 }}>✓ Opgeslagen</span>}
        </div>
      </form>

      <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 16 }}>
        ID: <code style={{ background: colors.paperCard, padding: "1px 6px", borderRadius: radius.input }}>{groep.id}</code>{" "}
        -- nodig als GROEP_ID bij het migreren van oude data.
      </p>

      <div style={{ marginTop: 40, background: colors.campfireLight, border: `1.5px dashed ${colors.stamp}`, borderRadius: radius.card, padding: "20px 22px" }}>
        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.stamp, marginBottom: 10 }}>
          Gevaarlijke zone
        </div>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginBottom: 14 }}>
          Verwijdert <strong>alles</strong> van deze groep onomkeerbaar: alle vriendenboek-fiches, foto&apos;s, tijdlijn-content, links, berichten en overige gegevens, alle bestanden in de storage-bucket, en de lidmaatschappen. Een gebruiker die daardoor nergens anders meer beheerder van is, wordt ook volledig verwijderd (Firebase Auth-account inbegrepen).
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 10 }}>
          Typ <strong>{groep.naam}</strong> om te bevestigen:
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={verwijderBevestiging}
            onChange={(e) => setVerwijderBevestiging(e.target.value)}
            style={{ ...inputStyle, width: 260 }}
          />
          <button
            onClick={volledigVerwijderen}
            disabled={verwijderBevestiging !== groep.naam || verwijderBezig}
            style={{
              padding: "10px 20px",
              borderRadius: radius.badge,
              border: "none",
              background: verwijderBevestiging === groep.naam && !verwijderBezig ? colors.stamp : colors.inkMuted,
              color: colors.white,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 13,
              cursor: verwijderBevestiging === groep.naam && !verwijderBezig ? "pointer" : "default",
            }}
          >
            {verwijderBezig ? "Bezig met verwijderen..." : "Definitief verwijderen"}
          </button>
        </div>
        {verwijderFout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: 10 }}>{verwijderFout}</div>}
      </div>
    </div>
  );
}

function Veld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 5 }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ display: "block", fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
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
