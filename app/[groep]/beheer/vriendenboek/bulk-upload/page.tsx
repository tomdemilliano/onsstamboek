"use client";

import { useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, ScanStorageFactory } from "@/lib/dbSchema";
import { auth } from "@/lib/firebase";
import { fileToBase64 } from "@/lib/fileUtils";
import type { ScanExtractResult } from "@/lib/scanExtract";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import AdminSubNav from "@/components/AdminSubNav";

// Meerdere scans in één keer laten herkennen en als concept opslaan --
// overgezet vanuit bulk-upload.js in de oude, single-tenant app.
const CONCURRENCY = 3;

type Status = "wachtend" | "herkennen" | "opslaan" | "klaar" | "fout";

interface Item {
  id: string;
  file: File;
  status: Status;
  error: string | null;
  entryId: string | null;
  naam: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  wachtend: "Wachtend...",
  herkennen: "Bezig met herkennen...",
  opslaan: "Bezig met opslaan...",
  klaar: "Klaar",
  fout: "Mislukt",
};

const STATUS_COLOR: Record<Status, string> = {
  wachtend: colors.inkMuted,
  herkennen: colors.campfire,
  opslaan: colors.campfire,
  klaar: colors.forest,
  fout: colors.stamp,
};

export default function BulkUploadPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const [items, setItems] = useState<Item[]>([]);
  const [bezig, setBezig] = useState(false);

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/bulk-upload`, label: "+ Meerdere scans" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  function kiesBestanden(e: React.ChangeEvent<HTMLInputElement>) {
    const gekozen = Array.from(e.target.files || []);
    setItems(
      gekozen.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        status: "wachtend",
        error: null,
        entryId: null,
        naam: null,
      }))
    );
  }

  async function verwerkItem(item: Item) {
    const update = (patch: Partial<Item>) => setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));

    try {
      if (!auth.currentUser) throw new Error("Niet aangemeld");
      update({ status: "herkennen", error: null });
      const base64Data = await fileToBase64(item.file);
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/extract-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ groepId: groep.id, base64Data, mimeType: item.file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Herkenning mislukt");
      const herkend = data as ScanExtractResult;

      update({ status: "opslaan" });
      const entryId = await EntryFactory.create(groep.id, {
        ...herkend,
        leuksteActiviteit: toTextArray(herkend.leuksteActiviteit).filter(Boolean),
        besteKampplaats: toTextArray(herkend.besteKampplaats).filter(Boolean),
        lekkersteEten: toTextArray(herkend.lekkersteEten).filter(Boolean),
      });
      const { url, path } = await ScanStorageFactory.upload(groep.id, item.file, entryId);
      await EntryFactory.update(entryId, { scanUrl: url, scanPath: path });

      update({ status: "klaar", entryId, naam: herkend.naam || item.file.name });
    } catch (err) {
      update({ status: "fout", error: err instanceof Error ? err.message : "Onbekende fout" });
    }
  }

  async function startVerwerking() {
    setBezig(true);
    const wachtrij = items.filter((it) => it.status === "wachtend" || it.status === "fout");
    let index = 0;
    const werkers = Array.from({ length: CONCURRENCY }, async () => {
      while (index < wachtrij.length) {
        const item = wachtrij[index];
        index += 1;
        await verwerkItem(item);
      }
    });
    await Promise.all(werkers);
    setBezig(false);
  }

  function verwijderItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function retryItem(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "wachtend", error: null } : it)));
  }

  const klaarCount = items.filter((it) => it.status === "klaar").length;
  const foutCount = items.filter((it) => it.status === "fout").length;
  const alleGedaan = items.length > 0 && items.every((it) => it.status === "klaar" || it.status === "fout");

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Vriendenboek</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Meerdere scans uploaden</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 28 }}>
        Kies al je scans in één keer. Elke scan wordt herkend en als concept opgeslagen -- nakijken en publiceren doe je nadien per formulier via het overzicht.
      </p>

      {items.length === 0 && (
        <label
          style={{
            display: "block",
            border: `1.5px dashed ${colors.line}`,
            borderRadius: radius.card,
            padding: 32,
            textAlign: "center",
            background: colors.paperCard,
            cursor: "pointer",
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.inkMuted,
          }}
        >
          Klik om meerdere scans te kiezen (foto&apos;s of pdf&apos;s)
          <input type="file" accept="image/*,application/pdf" multiple onChange={kiesBestanden} style={{ display: "none" }} />
        </label>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>
              {items.length} scans gekozen
              {(klaarCount > 0 || foutCount > 0) && ` · ${klaarCount} klaar${foutCount ? `, ${foutCount} mislukt` : ""}`}
            </div>
            {!alleGedaan && (
              <button onClick={startVerwerking} disabled={bezig} style={mainBtn(bezig)}>
                {bezig ? "Bezig met verwerken..." : "Start verwerking"}
              </button>
            )}
            {alleGedaan && (
              <Link href={`${basis}/beheer/vriendenboek`} style={{ ...mainBtn(false), textDecoration: "none", display: "inline-block" }}>
                Naar overzicht →
              </Link>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: colors.paperCard,
                  border: `1px solid ${colors.line}`,
                  borderRadius: radius.card,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.naam || item.file.name}
                  </div>
                  {item.error && <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.stamp, marginTop: 2 }}>{item.error}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: STATUS_COLOR[item.status] }}>{STATUS_LABEL[item.status]}</span>
                  {item.status === "klaar" && item.entryId && (
                    <Link href={`${basis}/beheer/vriendenboek/${item.entryId}`} style={smallLink}>
                      Bekijken
                    </Link>
                  )}
                  {item.status === "fout" && (
                    <button onClick={() => retryItem(item.id)} style={smallBtn(colors.forest)}>
                      Opnieuw
                    </button>
                  )}
                  {item.status === "wachtend" && (
                    <button onClick={() => verwijderItem(item.id)} style={smallBtn(colors.stamp)}>
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function mainBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 999,
    border: "none",
    background: disabled ? colors.inkMuted : colors.forest,
    color: colors.white,
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
  };
}

const smallLink: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  fontWeight: 600,
  color: colors.forest,
  textDecoration: "none",
};

function smallBtn(color: string): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 999,
    border: "none",
    background: color,
    color: "#FFF",
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
