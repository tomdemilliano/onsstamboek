"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { ExtraLocationFactory, ActivityFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { useAntiSpam } from "@/components/useAntiSpam";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

interface NominatimResultaat {
  display_name: string;
  lat: string;
  lon: string;
}

export default function KampplaatsToevoegenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const { isBot, checkSom, HoneypotField, CaptchaField } = useAntiSpam();

  const [naam, setNaam] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [email, setEmail] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [resultaten, setResultaten] = useState<NominatimResultaat[] | null>(null);
  const [zoekend, setZoekend] = useState(false);
  const [kaartOpen, setKaartOpen] = useState(false);
  const [versturen, setVersturen] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);

  async function zoekOpNaam() {
    if (!naam.trim()) return;
    setZoekend(true);
    setKaartOpen(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(naam)}`);
      setResultaten(await res.json());
    } catch {
      setResultaten([]);
    } finally {
      setZoekend(false);
    }
  }

  function kiesResultaat(r: NominatimResultaat) {
    setLat(parseFloat(r.lat));
    setLng(parseFloat(r.lon));
    setResultaten(null);
  }

  async function handleVerstuur() {
    setFoutmelding(null);

    if (!naam.trim()) {
      setFoutmelding("Vul een naam voor de kampplaats in.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFoutmelding("Vul een geldig e-mailadres in.");
      return;
    }
    if (!checkSom()) {
      setFoutmelding("Dat is niet het juiste antwoord op de rekensom — probeer opnieuw.");
      return;
    }
    if (isBot()) {
      setVerzonden(true);
      return;
    }

    setVersturen(true);
    try {
      const nieuwId = await ExtraLocationFactory.createPublic(groep.id, { naam: naam.trim(), beschrijving: beschrijving.trim(), lat, lng, contactEmail: email.trim() });
      await ActivityFactory.log(groep.id, {
        type: "kampplaats",
        actie: "Nieuwe kampplaats voorgesteld",
        itemId: nieuwId,
        omschrijving: `"${naam.trim()}" — wacht op goedkeuring.`,
      });
      setVerzonden(true);
    } catch (err) {
      console.error("Versturen van kampplaats mislukt:", err);
      setFoutmelding("Er ging iets mis bij het versturen. Probeer het straks nog eens.");
    } finally {
      setVersturen(false);
    }
  }

  if (verzonden) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <link rel="stylesheet" href={fontImports} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 100px" }}>
          <div style={{ marginTop: 40, textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <h1 style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Bedankt!</h1>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
              Je kampplaats is verstuurd. De beheerder kijkt &apos;m nog even na voor hij op de pagina verschijnt — dat kan soms wel eventjes duren.
            </p>
            <Link href={`${basis}/kampplaatsen`} style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: radius.badge, background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Terug naar de kampplaatsen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 32px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Stel een kampplaats voor</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, maxWidth: 440, margin: "0 auto" }}>
            Ken je een toffe kampplaats die nog niet op de pagina staat? Vul &apos;m hieronder aan en zet &apos;m meteen op de kaart. De beheerder kijkt alles nog na voor het gepubliceerd wordt.
          </p>
        </div>

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label>Naam van de kampplaats</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                value={naam}
                onChange={(e) => {
                  setNaam(e.target.value);
                  setResultaten(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && zoekOpNaam()}
                placeholder="bv. Provinciaal domein Zilvermeer, Mol"
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <button type="button" onClick={zoekOpNaam} disabled={zoekend || !naam.trim()} style={typeBtn(false)}>
                {zoekend ? "Bezig..." : "🔍 Zoek op kaart"}
              </button>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>De naam die je hierboven intypt, wordt gebruikt om de plek op de kaart op te zoeken.</p>
          </div>

          {resultaten && resultaten.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {resultaten.map((r, i) => (
                <button key={i} type="button" onClick={() => kiesResultaat(r)} style={{ textAlign: "left", padding: "8px 12px", borderRadius: radius.input, border: `1px solid ${colors.line}`, background: colors.white, fontFamily: fonts.body, fontSize: 12, color: colors.ink, cursor: "pointer" }}>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          {resultaten && resultaten.length === 0 && (
            <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>Geen resultaten gevonden — probeer een andere naam, of klik zelf op de kaart hieronder.</p>
          )}

          <div>
            <button type="button" onClick={() => setKaartOpen((v) => !v)} style={typeBtn(kaartOpen)}>
              {kaartOpen ? "Kaart verbergen" : "🗺️ Kaart tonen"}
            </button>
            {lat != null && <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.forest, marginLeft: 8 }}>✓ locatie gekozen</span>}
          </div>

          {kaartOpen && (
            <div style={{ border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden" }}>
              <LocationPicker
                lat={lat}
                lng={lng}
                onPick={(la, ln) => {
                  setLat(la);
                  setLng(ln);
                }}
              />
              <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, margin: "6px 10px" }}>Klik op de kaart om de pin te zetten, of sleep &apos;m naar de juiste plek.</p>
            </div>
          )}

          <div>
            <Label>Beschrijving (optioneel)</Label>
            <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows={3} placeholder="Waarom is dit een toffe plek?" style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div>
            <Label>Je e-mailadres</Label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jouw@email.be" style={inputStyle} />
            <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>Enkel zichtbaar voor de beheerder, voor eventuele vragen — niet publiek.</p>
          </div>

          {HoneypotField}
          {CaptchaField}

          {foutmelding && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{foutmelding}</div>}

          <button
            onClick={handleVerstuur}
            disabled={versturen}
            style={{ alignSelf: "flex-start", padding: "12px 24px", borderRadius: radius.badge, border: "none", background: versturen ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: versturen ? "default" : "pointer" }}
          >
            {versturen ? "Bezig met versturen..." : "Versturen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
      {children}
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

function typeBtn(actief: boolean): React.CSSProperties {
  return { padding: "9px 14px", borderRadius: 999, border: `1.5px solid ${actief ? colors.forest : colors.line}`, background: actief ? colors.forest : colors.white, color: actief ? colors.white : colors.ink, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
