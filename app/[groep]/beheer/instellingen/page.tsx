"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { GroepFactory, OrganisatieFactory, PhotoFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { LANDING_ASPECT_RATIO, landingsafbeeldingStyle, normaliseerPositie } from "@/lib/landingsafbeelding";
import DasIcon from "@/components/DasIcon";
import type { Groep, Organisatie, Photo, WithId } from "@/types/models";

const STANDAARD_DASKLEUR_1 = "#3E5B45";
const STANDAARD_DASKLEUR_2 = "#F4B860";
const STANDAARD_DAS2KLEUR_1 = "#8C3B2E";
const STANDAARD_DAS2KLEUR_2 = "#FBF7EC";

export default function GroepInstellingen() {
  const groep = useGroep();
  const router = useRouter();

  const [naam, setNaam] = useState(groep.naam);
  const [gemeente, setGemeente] = useState(groep.gemeente ?? "");
  const [contactEmail, setContactEmail] = useState(groep.contactEmail ?? "");
  const [oprichtingsjaar, setOprichtingsjaar] = useState(groep.oprichtingsjaar?.toString() ?? "");
  const [organisatieId, setOrganisatieId] = useState(groep.organisatieId ?? "");
  const [organisaties, setOrganisaties] = useState<WithId<Organisatie>[]>([]);
  const [toonDas, setToonDas] = useState(Boolean(groep.dasKleur1 && groep.dasKleur2));
  const [dasKleur1, setDasKleur1] = useState(groep.dasKleur1 || STANDAARD_DASKLEUR_1);
  const [dasKleur2, setDasKleur2] = useState(groep.dasKleur2 || STANDAARD_DASKLEUR_2);
  const [toonDas2, setToonDas2] = useState(Boolean(groep.das2Kleur1 && groep.das2Kleur2));
  const [das2Kleur1, setDas2Kleur1] = useState(groep.das2Kleur1 || STANDAARD_DAS2KLEUR_1);
  const [das2Kleur2, setDas2Kleur2] = useState(groep.das2Kleur2 || STANDAARD_DAS2KLEUR_2);
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  const [landingBezig, setLandingBezig] = useState(false);
  const [landingFout, setLandingFout] = useState<string | null>(null);
  const [fotoKiezerOpen, setFotoKiezerOpen] = useState(false);
  const [fotos, setFotos] = useState<WithId<Photo>[] | null>(null);
  const [kadreerModalOpen, setKadreerModalOpen] = useState(false);

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
        dasKleur1: toonDas ? dasKleur1 : null,
        dasKleur2: toonDas ? dasKleur2 : null,
        das2Kleur1: toonDas && toonDas2 ? das2Kleur1 : null,
        das2Kleur2: toonDas && toonDas2 ? das2Kleur2 : null,
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

  async function openFotoKiezer() {
    setLandingFout(null);
    setFotoKiezerOpen(true);
    if (fotos === null) {
      setFotos(await PhotoFactory.getPublished(groep.id));
    }
  }

  async function fotoKiezen(foto: WithId<Photo>) {
    setLandingFout(null);
    setLandingBezig(true);
    try {
      await GroepFactory.setLandingsafbeeldingVanFoto(groep.id, foto, groep.landingsafbeeldingPath);
      setFotoKiezerOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Instellen van welkomstfoto mislukt:", err);
      setLandingFout("Instellen mislukt, probeer opnieuw.");
    } finally {
      setLandingBezig(false);
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
          <div style={{ position: "relative", width: "100%", aspectRatio: LANDING_ASPECT_RATIO, borderRadius: radius.card, overflow: "hidden", border: `1px solid ${colors.line}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={groep.landingsafbeeldingUrl} alt="" style={landingsafbeeldingStyle(groep.landingsafbeeldingPositie)} />
            <button
              type="button"
              onClick={() => setKadreerModalOpen(true)}
              style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                padding: "6px 14px",
                borderRadius: radius.badge,
                border: "none",
                background: "rgba(44, 36, 25, 0.75)",
                color: colors.white,
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✥ Kadreren
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-block", cursor: "pointer", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forestDark }}>
            {landingBezig ? "Bezig..." : groep.landingsafbeeldingUrl ? "Nieuw bestand opladen" : "Bestand opladen"}
            <input type="file" accept="image/*" onChange={landingsafbeeldingKiezen} disabled={landingBezig} style={{ display: "block", marginTop: 6, fontFamily: fonts.body, fontSize: 13 }} />
          </label>
          <button
            type="button"
            onClick={openFotoKiezer}
            disabled={landingBezig}
            style={{ background: "none", border: "none", cursor: landingBezig ? "default" : "pointer", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "underline", padding: 0 }}
          >
            Kiezen uit foto&apos;s
          </button>
        </div>

        {fotoKiezerOpen && (
          <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 12 }}>
            {fotos === null && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Bezig met laden...</p>}
            {fotos !== null && fotos.length === 0 && (
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Nog geen gepubliceerde foto&apos;s om uit te kiezen.</p>
            )}
            {fotos !== null && fotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {fotos.map((foto) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => fotoKiezen(foto)}
                    disabled={landingBezig}
                    style={{
                      padding: 0,
                      border: `2px solid ${foto.afbeeldingPath === groep.landingsafbeeldingPath ? colors.forest : "transparent"}`,
                      borderRadius: radius.input,
                      overflow: "hidden",
                      cursor: landingBezig ? "default" : "pointer",
                      aspectRatio: "1 / 1",
                      background: colors.line,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.afbeeldingUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

        <Veld label="Das" hint="Bv. bij Scouts en Gidsen Vlaanderen heeft elke groep een das in 2 kleuren -- te zien naast de groepsnaam op de publieke site, links en rechts van de naam.">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 14, color: colors.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={toonDas} onChange={(e) => setToonDas(e.target.checked)} />
            Toon een das in de kleuren van de groep
          </label>
          {toonDas && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
                  Kleur 1
                  <input type="color" value={dasKleur1} onChange={(e) => setDasKleur1(e.target.value)} style={kleurInputStyle} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
                  Kleur 2
                  <input type="color" value={dasKleur2} onChange={(e) => setDasKleur2(e.target.value)} style={kleurInputStyle} />
                </label>
                <DasIcon kleur1={dasKleur1} kleur2={dasKleur2} maat={44} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.ink, cursor: "pointer", marginTop: 16 }}>
                <input type="checkbox" checked={toonDas2} onChange={(e) => setToonDas2(e.target.checked)} />
                Groep had een andere das doorheen de jaren -- toon een 2de das aan de andere kant van de naam
              </label>
              {toonDas2 && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
                    Kleur 1
                    <input type="color" value={das2Kleur1} onChange={(e) => setDas2Kleur1(e.target.value)} style={kleurInputStyle} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
                    Kleur 2
                    <input type="color" value={das2Kleur2} onChange={(e) => setDas2Kleur2(e.target.value)} style={kleurInputStyle} />
                  </label>
                  <DasIcon kleur1={das2Kleur1} kleur2={das2Kleur2} maat={44} />
                </div>
              )}
              {!toonDas2 && (
                <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: "6px 0 0" }}>
                  Zonder 2de das verschijnt de das hierboven aan beide kanten van de groepsnaam.
                </p>
              )}
            </>
          )}
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

      {kadreerModalOpen && groep.landingsafbeeldingUrl && (
        <KadreerModal
          groep={groep}
          url={groep.landingsafbeeldingUrl}
          huidigePositie={normaliseerPositie(groep.landingsafbeeldingPositie)}
          onSluiten={() => setKadreerModalOpen(false)}
          onOpgeslagen={() => {
            setKadreerModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function KadreerModal({
  groep,
  url,
  huidigePositie,
  onSluiten,
  onOpgeslagen,
}: {
  groep: WithId<Groep>;
  url: string;
  huidigePositie: { x: number; y: number; zoom: number };
  onSluiten: () => void;
  onOpgeslagen: () => void;
}) {
  const [positie, setPositie] = useState(huidigePositie);
  const [slepen, setSlepen] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSluiten();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSluiten]);

  function bijwerken(clientX: number, clientY: number, rect: DOMRect) {
    setPositie((huidig) => ({
      ...huidig,
      x: Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))),
      y: Math.round(Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))),
    }));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSlepen(true);
    bijwerken(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!slepen) return;
    bijwerken(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  }

  function onPointerUp() {
    setSlepen(false);
  }

  async function bewaren() {
    setBezig(true);
    try {
      await GroepFactory.updateLandingsafbeeldingPositie(groep.id, positie);
      onOpgeslagen();
    } catch (err) {
      console.error("Opslaan van kadrering mislukt:", err);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div
      onClick={onSluiten}
      style={{ position: "fixed", inset: 0, background: "rgba(44, 36, 25, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: colors.paperCard, borderRadius: radius.card, padding: 22, maxWidth: 620, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.ink }}>Welkomstfoto kadreren</div>
            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, margin: "4px 0 0" }}>
              Sleep de foto tot het belangrijkste deel goed zichtbaar staat.
            </p>
          </div>
          <button onClick={onSluiten} aria-label="Sluiten" style={{ background: "none", border: "none", fontSize: 20, color: colors.inkMuted, cursor: "pointer", lineHeight: 1 }}>
            ✕
          </button>
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: LANDING_ASPECT_RATIO,
            borderRadius: radius.input,
            overflow: "hidden",
            border: `1px solid ${colors.line}`,
            cursor: slepen ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" draggable={false} style={{ ...landingsafbeeldingStyle(positie), pointerEvents: "none" }} />
          <div
            style={{
              position: "absolute",
              left: `${positie.x}%`,
              top: `${positie.y}%`,
              transform: "translate(-50%, -50%)",
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "3px solid white",
              background: colors.campfire,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.3)",
              pointerEvents: "none",
              transition: slepen ? "none" : "left 0.08s, top 0.08s",
            }}
          />
        </div>

        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
          Dit kader komt overeen met wat bezoekers te zien krijgen. Sleep om te verschuiven, gebruik de schuifbalk om in of uit te zoomen.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={positie.zoom}
            onChange={(e) => setPositie((huidig) => ({ ...huidig, zoom: Number(e.target.value) }))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onSluiten}
            style={{ padding: "9px 18px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: "transparent", color: colors.inkMuted, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Annuleren
          </button>
          <button
            onClick={bewaren}
            disabled={bezig}
            style={{ padding: "9px 20px", borderRadius: radius.badge, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: bezig ? "default" : "pointer" }}
          >
            {bezig ? "Bezig met bewaren..." : "Bewaren"}
          </button>
        </div>
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

const kleurInputStyle: React.CSSProperties = {
  width: 44,
  height: 32,
  padding: 2,
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  cursor: "pointer",
};
