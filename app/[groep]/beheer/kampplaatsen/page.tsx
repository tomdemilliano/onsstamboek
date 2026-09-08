"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, LocationFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { groupByArrayField, type VeldGroep } from "@/lib/textUtils";
import AdminSubNav from "@/components/AdminSubNav";
import type { Entry, Location, WithId } from "@/types/models";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

interface NominatimResultaat {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocatiesPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [groepen, setGroepen] = useState<VeldGroep<WithId<Entry>>[]>([]);
  const [locaties, setLocaties] = useState<Record<string, WithId<Location>>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"alle" | "niet-gekoppeld">("alle");

  const tabs = [
    { href: `${basis}/beheer/kampplaatsen`, label: "❤️ Uit vriendenboekjes", exact: true },
    { href: `${basis}/beheer/kampplaatsen/extra`, label: "📍 Extra kampplaatsen" },
  ];

  async function load() {
    setLoading(true);
    const [entries, locs] = await Promise.all([EntryFactory.getAll(groep.id), LocationFactory.getAll(groep.id)]);
    setGroepen(groupByArrayField(entries, "besteKampplaats"));
    const byNaam: Record<string, WithId<Location>> = {};
    locs.forEach((l) => (byNaam[l.naam.trim().toLowerCase()] = l));
    setLocaties(byNaam);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([EntryFactory.getAll(groep.id), LocationFactory.getAll(groep.id)]).then(([entries, locs]) => {
      if (!actief) return;
      setGroepen(groupByArrayField(entries, "besteKampplaats"));
      const byNaam: Record<string, WithId<Location>> = {};
      locs.forEach((l) => (byNaam[l.naam.trim().toLowerCase()] = l));
      setLocaties(byNaam);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  function isGekoppeld(groepItem: VeldGroep<WithId<Entry>>) {
    const loc = locaties[groepItem.label.trim().toLowerCase()];
    return Boolean(loc) && !loc.genegeerd;
  }
  function isGenegeerd(groepItem: VeldGroep<WithId<Entry>>) {
    return Boolean(locaties[groepItem.label.trim().toLowerCase()]?.genegeerd);
  }
  const gefilterd = filter === "niet-gekoppeld" ? groepen.filter((g) => !isGekoppeld(g) && !isGenegeerd(g)) : groepen;
  const aantalNietGekoppeld = groepen.filter((g) => !isGekoppeld(g) && !isGenegeerd(g)).length;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Kampplaatsen</h1>

      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Kampplaatsen op de kaart (uit de vriendenboekjes)</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Zoek elke kampplaats op, kies &quot;Kies op kaart&quot; om de locatie zelf aan te klikken of te verslepen, of vul de coördinaten manueel in (bv. via rechtsklik op Google Maps → coördinaten kopiëren) als de automatische zoekfunctie de juiste plek niet vindt. Plaatsen zonder coördinaten verschijnen gewoon niet op de kaart. Is een naam geen echte plaats (bv. &quot;Allemaal&quot; of &quot;overal&quot;), markeer ze dan als &quot;geen koppeling nodig&quot; — die telt dan niet meer mee als &quot;nog te koppelen&quot;.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
        <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginRight: 2 }}>Filter</span>
        <FilterButton active={filter === "alle"} onClick={() => setFilter("alle")}>
          Alle ({groepen.length})
        </FilterButton>
        <FilterButton active={filter === "niet-gekoppeld"} onClick={() => setFilter("niet-gekoppeld")}>
          Nog te koppelen {aantalNietGekoppeld > 0 && `(${aantalNietGekoppeld})`}
        </FilterButton>
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {gefilterd.map((groepItem) => (
          <LocationCard key={groepItem.label} groepId={groep.id} groepItem={groepItem} gekoppeld={locaties[groepItem.label.trim().toLowerCase()]} genegeerd={isGenegeerd(groepItem)} onChanged={load} />
        ))}
      </div>

      {!loading && gefilterd.length === 0 && groepen.length > 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Alle kampplaatsen zijn gekoppeld. 🎉</p>}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${active ? colors.forest : colors.line}`, background: active ? colors.forest : "transparent", color: active ? colors.white : colors.inkMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function LocationCard({
  groepId,
  groepItem,
  gekoppeld,
  genegeerd,
  onChanged,
}: {
  groepId: string;
  groepItem: VeldGroep<WithId<Entry>>;
  gekoppeld?: WithId<Location>;
  genegeerd: boolean;
  onChanged: () => void;
}) {
  const [zoekterm, setZoekterm] = useState(groepItem.label);
  const [resultaten, setResultaten] = useState<NominatimResultaat[] | null>(null);
  const [zoekend, setZoekend] = useState(false);
  const [lat, setLat] = useState(gekoppeld && !genegeerd ? String(gekoppeld.lat) : "");
  const [lng, setLng] = useState(gekoppeld && !genegeerd ? String(gekoppeld.lng) : "");
  const [opslaanBezig, setOpslaanBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [kaartOpen, setKaartOpen] = useState(false);
  const [negeerBezig, setNegeerBezig] = useState(false);

  async function negeer() {
    setNegeerBezig(true);
    try {
      await LocationFactory.markeerGenegeerd(groepId, groepItem.label);
      onChanged();
    } finally {
      setNegeerBezig(false);
    }
  }

  async function maakOngedaan() {
    await LocationFactory.remove(groepId, groepItem.label);
    onChanged();
  }

  async function zoekLocatie() {
    setZoekend(true);
    setFoutmelding(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(zoekterm)}`);
      setResultaten(await res.json());
    } catch {
      setResultaten([]);
    } finally {
      setZoekend(false);
    }
  }

  function kiesResultaat(r: NominatimResultaat) {
    setLat(r.lat);
    setLng(r.lon);
    setResultaten(null);
  }

  async function opslaan() {
    const latNum = parseFloat(lat.replace(",", "."));
    const lngNum = parseFloat(lng.replace(",", "."));
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setFoutmelding("Vul geldige coördinaten in (bv. 50.1234 en 5.1234).");
      return;
    }
    setOpslaanBezig(true);
    setFoutmelding(null);
    try {
      await LocationFactory.set(groepId, groepItem.label, latNum, lngNum);
      onChanged();
    } finally {
      setOpslaanBezig(false);
    }
  }

  async function verwijderen() {
    await LocationFactory.remove(groepId, groepItem.label);
    setLat("");
    setLng("");
    onChanged();
  }

  return (
    <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{groepItem.label}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>
          {groepItem.entries.length}× vermeld
          {genegeerd && <span style={{ color: colors.inkMuted, fontWeight: 600 }}> · geen koppeling nodig</span>}
          {!genegeerd && gekoppeld && (
            <span style={{ color: colors.forest, fontWeight: 600 }}>
              {" "}
              · op de kaart ({gekoppeld.lat!.toFixed(3)}, {gekoppeld.lng!.toFixed(3)})
            </span>
          )}
        </div>
      </div>

      {genegeerd ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: "0 0 8px" }}>
            Deze naam is gemarkeerd als &quot;geen koppeling nodig&quot; (bv. omdat het geen echte plaatsnaam is) en telt niet meer mee als &quot;nog te koppelen&quot;.
          </p>
          <button onClick={maakOngedaan} style={btn(colors.inkMuted)}>
            Ongedaan maken
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input type="text" value={zoekterm} onChange={(e) => setZoekterm(e.target.value)} placeholder="Zoekterm (plaatsnaam, gemeente, land...)" style={inputStyle} />
            <button onClick={zoekLocatie} disabled={zoekend} style={btn(colors.forest)}>
              {zoekend ? "Bezig..." : "Zoeken"}
            </button>
            <button onClick={() => setKaartOpen((v) => !v)} style={btn(kaartOpen ? colors.inkMuted : colors.campfire)}>
              {kaartOpen ? "Kaart verbergen" : "Kies op kaart"}
            </button>
          </div>

          {kaartOpen && (
            <div style={{ marginTop: 10, border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden" }}>
              <LocationPicker
                lat={lat ? parseFloat(lat.replace(",", ".")) : null}
                lng={lng ? parseFloat(lng.replace(",", ".")) : null}
                onPick={(la, ln) => {
                  setLat(la.toFixed(5));
                  setLng(ln.toFixed(5));
                }}
              />
              <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, margin: "6px 10px" }}>Klik op de kaart om de pin te zetten, of sleep de bestaande pin naar de juiste plek.</p>
            </div>
          )}

          {resultaten && resultaten.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {resultaten.map((r, i) => (
                <button key={i} onClick={() => kiesResultaat(r)} style={{ textAlign: "left", padding: "8px 12px", borderRadius: radius.input, border: `1px solid ${colors.line}`, background: colors.white, fontFamily: fonts.body, fontSize: 12, color: colors.ink, cursor: "pointer" }}>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          {resultaten && resultaten.length === 0 && (
            <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>Geen resultaten gevonden — probeer een andere zoekterm of vul de coördinaten hieronder manueel in.</p>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
            <div>
              <label style={labelStyle}>Breedtegraad (lat)</label>
              <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="50.1234" style={{ ...inputStyle, width: 140 }} />
            </div>
            <div>
              <label style={labelStyle}>Lengtegraad (lng)</label>
              <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="5.1234" style={{ ...inputStyle, width: 140 }} />
            </div>
            <button onClick={opslaan} disabled={opslaanBezig} style={btn(colors.campfire)}>
              {opslaanBezig ? "Bezig..." : gekoppeld ? "Corrigeren" : "Opslaan"}
            </button>
            {gekoppeld && (
              <button onClick={verwijderen} style={btn(colors.stamp)}>
                Ontkoppelen
              </button>
            )}
            {!gekoppeld && (
              <button onClick={negeer} disabled={negeerBezig} style={btn(colors.inkMuted)}>
                {negeerBezig ? "Bezig..." : "Geen koppeling nodig"}
              </button>
            )}
          </div>
          {foutmelding && <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.stamp, marginTop: 6 }}>{foutmelding}</p>}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 13,
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
  return { padding: "8px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
