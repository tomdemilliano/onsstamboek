"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, type EntryVelden } from "@/components/EntryVeldenEditor";
import type { Entry, WithId } from "@/types/models";

// Foto's/leidingsploeg-koppelingen (en de bijhorende "bevestig koppeling"-
// stap voor een geüpgradede stub) komen hier bij zodra Foto's/Tijdlijn
// gebouwd zijn -- nu nog niet, want die collecties/schermen bestaan nog niet.
export default function BewerkFichePage(props: PageProps<"/[groep]/beheer/vriendenboek/[id]">) {
  const { id } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const router = useRouter();

  const [entry, setEntry] = useState<WithId<Entry> | null | undefined>(undefined);
  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    let actief = true;
    EntryFactory.getById(id).then((e) => {
      if (!actief) return;
      setEntry(e);
      if (e) {
        setFields({
          naam: e.naam || "",
          geboortejaar: e.geboortejaar || "",
          totemnaam: e.totemnaam || "",
          periode: e.periode || "",
          leuksteActiviteit: e.leuksteActiviteit?.length ? e.leuksteActiviteit : [""],
          besteKampplaats: e.besteKampplaats?.length ? e.besteKampplaats : [""],
          lekkersteEten: e.lekkersteEten?.length ? e.lekkersteEten : [""],
        });
      }
    });
    return () => {
      actief = false;
    };
  }, [id]);

  const tabs = [
    { href: `${basis}/beheer/vriendenboek`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/vriendenboek/nieuw`, label: "+ Fiche toevoegen" },
    { href: `${basis}/beheer/vriendenboek/bulk-upload`, label: "+ Meerdere scans" },
    { href: `${basis}/beheer/vriendenboek/wijzigingen`, label: "✏️ Wijzigingsvoorstellen" },
  ];

  async function opslaan() {
    setBezig(true);
    try {
      await EntryFactory.update(id, opgeschoond(fields));
      router.push(`${basis}/beheer/vriendenboek`);
    } finally {
      setBezig(false);
    }
  }

  async function publiceren() {
    await EntryFactory.publish(id);
    router.push(`${basis}/beheer/vriendenboek`);
  }

  async function keurGoed() {
    await EntryFactory.keurGoed(id);
    router.push(`${basis}/beheer/vriendenboek`);
  }

  if (entry === undefined) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (entry === null) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.stamp }}>Formulier niet gevonden.</p>;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Vriendenboek</h1>
      <AdminSubNav tabs={tabs} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0 0 20px", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: 0 }}>{entry.naam || "(naamloos)"} bewerken</h2>
        {entry.status === "draft" && (
          <button onClick={publiceren} style={{ padding: "9px 18px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Publiceren
          </button>
        )}
        {entry.status === "published" && entry.goedgekeurd === false && (
          <button onClick={keurGoed} style={{ padding: "9px 18px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            ✓ Goedkeuren
          </button>
        )}
      </div>

      <EntryVeldenEditor fields={fields} onChange={setFields} />

      <button
        onClick={opslaan}
        disabled={bezig}
        style={{ marginTop: 20, padding: "12px 24px", borderRadius: 999, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: bezig ? "default" : "pointer" }}
      >
        {bezig ? "Bezig met opslaan..." : "Wijzigingen opslaan"}
      </button>
    </div>
  );
}
