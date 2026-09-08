"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, ScanStorageFactory } from "@/lib/dbSchema";
import { auth } from "@/lib/firebase";
import { fileToBase64 } from "@/lib/fileUtils";
import type { ScanExtractResult } from "@/lib/scanExtract";
import { colors, fonts, radius } from "@/lib/theme";
import { toTextArray } from "@/lib/textUtils";
import AdminSubNav from "@/components/AdminSubNav";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, type EntryVelden } from "@/components/EntryVeldenEditor";

// Handmatig een nieuwe fiche aanmaken (concept), met optioneel een ingescand
// formulier waarvan de velden automatisch herkend worden (Anthropic-vision
// via app/api/extract-scan) -- overgezet vanuit upload.js/EntryForm.js in
// de oude, single-tenant app.
export default function NieuweFichePage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const router = useRouter();
  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [herkennen, setHerkennen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/bulk-upload`, label: "+ Meerdere scans" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function herken() {
    if (!file || !auth.currentUser) return;
    setHerkennen(true);
    setError(null);
    try {
      const base64Data = await fileToBase64(file);
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/extract-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ groepId: groep.id, base64Data, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Herkenning mislukt");
      const herkend = data as ScanExtractResult;
      setFields((prev) => ({
        ...prev,
        ...herkend,
        leuksteActiviteit: toTextArray(herkend.leuksteActiviteit),
        besteKampplaats: toTextArray(herkend.besteKampplaats),
        lekkersteEten: toTextArray(herkend.lekkersteEten),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Herkenning mislukt");
    } finally {
      setHerkennen(false);
    }
  }

  async function opslaan() {
    setBezig(true);
    try {
      const entryId = await EntryFactory.create(groep.id, opgeschoond(fields));
      if (file) {
        const { url, path } = await ScanStorageFactory.upload(groep.id, file, entryId);
        await EntryFactory.update(entryId, { scanUrl: url, scanPath: path });
      }
      router.push(`${basis}/beheer/vriendenboek`);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Vriendenboek</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Nieuwe fiche</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Wordt aangemaakt als concept -- publiceer &apos;m nadien vanuit het overzicht.
      </p>

      <div style={{ border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: 20, background: colors.paperCard, marginBottom: 24 }}>
        <label
          style={{
            display: "inline-block",
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 600,
            color: colors.forestDark,
            marginBottom: 10,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Scan kiezen (foto of pdf)
          <input type="file" accept="image/*,application/pdf" onChange={kiesBestand} style={{ display: "block", marginTop: 8, fontFamily: fonts.body, fontSize: 14 }} />
        </label>

        {previewUrl && (
          <div style={{ marginTop: 12 }}>
            {!file || file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- lokale blob-preview, geen next/image-optimalisatie nodig
              <img src={previewUrl} alt="scan preview" style={{ maxWidth: "100%", maxHeight: 320, borderRadius: radius.card, display: "block", border: `1px solid ${colors.line}` }} />
            ) : (
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, margin: 0 }}>📄 {file.name}</p>
            )}
          </div>
        )}

        {file && (
          <button
            onClick={herken}
            disabled={herkennen}
            style={{
              marginTop: 14,
              padding: "10px 18px",
              borderRadius: radius.badge,
              border: "none",
              background: herkennen ? colors.inkMuted : colors.campfire,
              color: colors.white,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 13,
              cursor: herkennen ? "default" : "pointer",
            }}
          >
            {herkennen ? "Bezig met herkennen..." : "Tekst herkennen"}
          </button>
        )}
      </div>

      {error && <p style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13, marginTop: -12, marginBottom: 20 }}>{error}</p>}

      <EntryVeldenEditor fields={fields} onChange={setFields} />

      <button
        onClick={opslaan}
        disabled={bezig}
        style={{ marginTop: 20, padding: "12px 24px", borderRadius: 999, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: bezig ? "default" : "pointer" }}
      >
        {bezig ? "Bezig met opslaan..." : "Opslaan als concept"}
      </button>
    </div>
  );
}
