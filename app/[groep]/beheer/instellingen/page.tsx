"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { GroepFactory, OrganisatieFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { Organisatie, WithId } from "@/types/models";

export default function GroepInstellingen() {
  const groep = useGroep();
  const router = useRouter();

  const [naam, setNaam] = useState(groep.naam);
  const [gemeente, setGemeente] = useState(groep.gemeente ?? "");
  const [contactEmail, setContactEmail] = useState(groep.contactEmail ?? "");
  const [oprichtingsjaar, setOprichtingsjaar] = useState(groep.oprichtingsjaar?.toString() ?? "");
  const [organisatieId, setOrganisatieId] = useState(groep.organisatieId ?? "");
  const [organisaties, setOrganisaties] = useState<WithId<Organisatie>[]>([]);
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  const [landingBezig, setLandingBezig] = useState(false);
  const [landingFout, setLandingFout] = useState<string | null>(null);

  useEffect(() => {
    let actief = true;
    OrganisatieFactory.getAll().then((lijst) => {
      if (actief) setOrganisaties(lijst);
    });
    return () => {
      actief = false;
    };
  }, []);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setOpgeslagen(false);
    try {
      await GroepFactory.update(groep.id, {
        naam,
        gemeente,
        contactEmail,
        oprichtingsjaar: oprichtingsjaar ? Number(oprichtingsjaar) : null,
        organisatieId: organisatieId || null,
      });
      setOpgeslagen(true);
      router.refresh();
    } finally {
      setBezig(false);
    }
  }

  async function landingsafbeeldingKiezen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLandingFout(null);
    setLandingBezig(true);
    try {
      await GroepFactory.updateLandingsafbeelding(groep.id, file, groep.landingsafbeeldingPath);
      router.refresh();
    } catch (err) {
      console.error("Opladen van welkomstfoto mislukt:", err);
      setLandingFout("Opladen mislukt, probeer opnieuw.");
    } finally {
      setLandingBezig(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Instellingen</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Basisgegevens van de groep, publiek zichtbaar op &quot;over de groep&quot;.
      </p>

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "20px 22px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ display: "block", fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>
          Welkomstfoto
        </span>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
          Bovenaan de publieke startpagina van de groep, boven de statistieken.
        </p>
        {groep.landingsafbeeldingUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={groep.landingsafbeeldingUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: radius.card, border: `1px solid ${colors.line}` }} />
        )}
        <label style={{ display: "inline-block", cursor: "pointer", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forestDark }}>
          {landingBezig ? "Bezig met opladen..." : groep.landingsafbeeldingUrl ? "Vervangen" : "Foto kiezen"}
          <input type="file" accept="image/*" onChange={landingsafbeeldingKiezen} disabled={landingBezig} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
        </label>
        {landingFout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{landingFout}</div>}
      </div>

      <form onSubmit={opslaan} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Veld label="Naam">
          <input value={naam} onChange={(e) => setNaam(e.target.value)} required style={inputStyle} />
        </Veld>

        <Veld label="Gemeente">
          <input value={gemeente} onChange={(e) => setGemeente(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Algemeen contactadres" hint='Publiek zichtbaar op "over de groep" -- niet het e-mailadres van de sitebeheerder zelf.'>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Oprichtingsjaar" hint="Bepaalt het startjaar van de tijdlijn als er geen eigen kentekens/mijlpalen vanaf een vroeger jaar zijn.">
          <input type="number" value={oprichtingsjaar} onChange={(e) => setOprichtingsjaar(e.target.value)} style={inputStyle} />
        </Veld>

        <Veld label="Organisatie" hint="Koppelt deze groep aan een scoutsbeweging voor gedeelde jaarkentekens en scouting-brede mijlpalen op de tijdlijn.">
          <select value={organisatieId} onChange={(e) => setOrganisatieId(e.target.value)} style={inputStyle}>
            <option value="">— geen organisatie —</option>
            {organisaties.map((org) => (
              <option key={org.id} value={org.id}>
                {org.naam}
              </option>
            ))}
          </select>
        </Veld>

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
