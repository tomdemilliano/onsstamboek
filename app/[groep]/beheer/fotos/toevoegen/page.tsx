"use client";

import { useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { PhotoFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { resizeImageFile } from "@/lib/fotoUtils";
import AdminSubNav from "@/components/AdminSubNav";

type BestandStatus = "wachtend" | "verkleinen" | "uploaden" | "klaar" | "fout";

const STATUS_LABEL: Record<BestandStatus, string> = {
  wachtend: "Wachtend...",
  verkleinen: "Bezig met verkleinen...",
  uploaden: "Bezig met opladen...",
  klaar: "Klaar",
  fout: "Mislukt",
};

export default function FotosToevoegenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [bestanden, setBestanden] = useState<{ id: string; file: File; status: BestandStatus }[]>([]);
  const [jaar, setJaar] = useState("");
  const [locatie, setLocatie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const tabs = [
    { href: `${basis}/beheer/fotos`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/fotos/toevoegen`, label: "+ Foto's toevoegen" },
    { href: `${basis}/beheer/fotos/tags`, label: "Tags" },
    { href: `${basis}/beheer/fotos/sorteren`, label: "🗓️ Op decennium sorteren" },
    { href: `${basis}/beheer/fotos/dubbels`, label: "🔍 Dubbels" },
  ];

  function handleBestanden(e: React.ChangeEvent<HTMLInputElement>) {
    const gekozen = Array.from(e.target.files || []);
    setBestanden(gekozen.map((file, i) => ({ id: `${Date.now()}-${i}`, file, status: "wachtend" as BestandStatus })));
    setResultaat(null);
  }

  async function handleToevoegen() {
    setFout(null);
    setResultaat(null);
    if (bestanden.length === 0) {
      setFout("Kies minstens één foto.");
      return;
    }
    setBezig(true);
    try {
      function updateStatus(i: number, status: BestandStatus) {
        setBestanden((prev) => prev.map((b, idx) => (idx === i ? { ...b, status } : b)));
      }

      const verkleind: File[] = [];
      for (let i = 0; i < bestanden.length; i++) {
        updateStatus(i, "verkleinen");
        verkleind.push(await resizeImageFile(bestanden[i].file));
      }

      const aantal = await PhotoFactory.createBulkByAdmin(groep.id, verkleind, { jaar: jaar ? parseInt(jaar, 10) : null, locatie: locatie.trim() }, (i, status) => updateStatus(i, status === "bezig" ? "uploaden" : status));
      setResultaat(aantal);
      setBestanden([]);
    } catch (err) {
      console.error("Bulk-upload van foto's mislukt:", err);
      setFout("Opslaan mislukt, probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Foto&apos;s</h1>

      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Foto&apos;s in bulk toevoegen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Kies zoveel foto&apos;s als je wil — ze worden automatisch verkleind en meteen gepubliceerd. Jaar/locatie hieronder zijn optioneel en gelden dan voor de hele selectie; wie erop staat tag je nadien per foto, door jezelf of door bezoekers.
      </p>

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Foto&apos;s</label>
          <label style={{ display: "block", border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: 24, textAlign: "center", cursor: "pointer", fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
            {bestanden.length === 0 ? "Klik om één of meerdere foto's te kiezen" : `${bestanden.length} foto${bestanden.length === 1 ? "" : "'s"} gekozen`}
            <input type="file" accept="image/*" multiple onChange={handleBestanden} style={{ display: "none" }} />
          </label>

          {bestanden.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 200, overflowY: "auto" }}>
              {bestanden.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: 12 }}>
                  <span style={{ color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.file.name}</span>
                  <span style={{ color: b.status === "fout" ? colors.stamp : b.status === "klaar" ? colors.forest : colors.campfire, fontWeight: 600 }}>{STATUS_LABEL[b.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Jaar (optioneel, voor de hele selectie)</label>
            <input type="number" value={jaar} onChange={(e) => setJaar(e.target.value)} placeholder="bv. 1978" style={{ ...inputStyle, width: 130 }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Locatie (optioneel, voor de hele selectie)</label>
            <input type="text" value={locatie} onChange={(e) => setLocatie(e.target.value)} placeholder="bv. Walzin" style={inputStyle} />
          </div>
        </div>

        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}
        {resultaat != null && (
          <div style={{ color: colors.forest, fontFamily: fonts.body, fontSize: 13, fontWeight: 600 }}>
            ✓ {resultaat} foto{resultaat === 1 ? "" : "'s"} toegevoegd en gepubliceerd.
          </div>
        )}

        <button onClick={handleToevoegen} disabled={bezig} style={btn(colors.forest)}>
          {bezig ? "Bezig..." : "+ Foto's toevoegen"}
        </button>
      </div>
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
  return { alignSelf: "flex-start", padding: "10px 20px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
