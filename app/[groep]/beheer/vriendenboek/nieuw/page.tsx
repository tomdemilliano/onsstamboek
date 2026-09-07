"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory } from "@/lib/dbSchema";
import { colors, fonts } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, type EntryVelden } from "@/components/EntryVeldenEditor";

// Handmatig een nieuwe fiche aanmaken (concept), zonder scan/OCR -- dat komt
// in een latere fase samen met het overzetten van de Anthropic-scanherkenning
// (pages/api/extract in de oude app). Tot dan is dit de manier voor een
// beheerder om zelf een fiche te starten, naast de publieke /toevoegen.
export default function NieuweFichePage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const router = useRouter();
  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [bezig, setBezig] = useState(false);

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  async function opslaan() {
    setBezig(true);
    try {
      await EntryFactory.create(groep.id, opgeschoond(fields));
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
