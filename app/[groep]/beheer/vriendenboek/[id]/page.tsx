"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, PhotoFactory, LeidingFactory, TakFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import { useOrganisatieInstellingen } from "@/lib/useOrganisatieInstellingen";
import EntryVeldenEditor, { LEGE_ENTRY_VELDEN, opgeschoond, type EntryVelden } from "@/components/EntryVeldenEditor";
import type { Entry, Photo, WithId } from "@/types/models";

interface LeidingContext {
  takId: string;
  werkingsjaarStart: number;
  takNaam: string;
}

export default function BewerkFichePage(props: PageProps<"/[groep]/beheer/vriendenboek/[id]">) {
  const { id } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const router = useRouter();
  const { takEnkelvoud } = useOrganisatieInstellingen(groep.organisatieId);

  const [entry, setEntry] = useState<WithId<Entry> | null | undefined>(undefined);
  const [fields, setFields] = useState<EntryVelden>(LEGE_ENTRY_VELDEN);
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [leidingJaren, setLeidingJaren] = useState<LeidingContext[]>([]);

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
        setEmail(e.email || "");
      }
    });
    return () => {
      actief = false;
    };
  }, [id]);

  useEffect(() => {
    let actief = true;
    Promise.all([PhotoFactory.getByEntryIdAdmin(groep.id, id), LeidingFactory.getByEntryId(groep.id, id), TakFactory.getAll(groep.id)]).then(([f, leidingData, takken]) => {
      if (!actief) return;
      setFotos(f);
      setLeidingJaren(
        leidingData
          .map((item) => ({
            takId: item.takId,
            werkingsjaarStart: item.werkingsjaarStart,
            takNaam: takken.find((t) => t.id === item.takId)?.naam || `(onbekende ${takEnkelvoud})`,
          }))
          .sort((a, b) => b.werkingsjaarStart - a.werkingsjaarStart)
      );
    });
    return () => {
      actief = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- takEnkelvoud enkel als fallback-label, geen reden om de foto/leiding-fetch opnieuw te doen als de terminologie wijzigt
  }, [id, groep.id]);

  async function opslaan() {
    setBezig(true);
    try {
      const schoon = { ...opgeschoond(fields), email: email.trim() };
      if (entry?.status === "stub") {
        await EntryFactory.upgradeStubMetFormulier(id, schoon);
      } else {
        await EntryFactory.update(id, schoon);
      }
      if (schoon.email) {
        try {
          await fetch("/api/mail/contact-koppelen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groepId: groep.id, entryId: id, naam: schoon.naam, email: schoon.email }),
          });
        } catch (err) {
          // Mag het opslaan van de fiche zelf nooit laten falen.
          console.error("Koppelen van mailcontact mislukt:", err);
        }
      }
      router.push(`${basis}/beheer/vriendenboek`);
    } finally {
      setBezig(false);
    }
  }

  if (entry === undefined) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }
  if (entry === null) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.stamp }}>Formulier niet gevonden.</p>;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>{entry.naam || "(naamloos)"} bewerken</h2>

      {entry.status === "stub" && (
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.campfire, margin: "0 0 16px" }}>
          Deze naam is enkel bekend via een foto- of leidingsploeg-koppeling — nog geen eigen fiche. Opslaan hieronder maakt er een volwaardige fiche van.
        </p>
      )}

      {(fotos.length > 0 || leidingJaren.length > 0) && (
        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 20px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {leidingJaren.length > 0 && (
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.forest, marginBottom: 6 }}>👥 Leiding</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {leidingJaren.map((item, i) => (
                  <a
                    key={i}
                    href={`${basis}/beheer/tijdlijn/leiding?tak=${item.takId}&jaar=${item.werkingsjaarStart}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, textDecoration: "none" }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.takNaam}</span> — {werkingsjaarLabel(item.werkingsjaarStart)} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {fotos.length > 0 && (
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.forest, marginBottom: 8 }}>
                📷 Foto&apos;s met {(entry.naam || "").split(" ")[0]} ({fotos.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                {fotos.map((foto) => (
                  <a key={foto.id} href={`${basis}/beheer/fotos?foto=${foto.id}`} target="_blank" rel="noopener noreferrer" title="Bekijk/bewerk deze foto (opent in nieuw tabblad)" style={{ display: "block" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.afbeeldingUrl} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: radius.input, border: `1px solid ${colors.line}` }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EntryVeldenEditor fields={fields} onChange={setFields} />

      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted }}>
          Contact (enkel zichtbaar voor beheerders)
        </span>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginBottom: 4 }}>E-mailadres</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: radius.input, border: `1px solid ${colors.line}`, background: colors.white, fontFamily: fonts.body, fontSize: 14, color: colors.ink, boxSizing: "border-box" }}
          />
        </label>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, margin: 0 }}>
          Komt na het opslaan ook terecht in het ontvangers-overzicht van de Mailing-module (zonder daar meteen op &quot;mag mailen&quot; te staan).
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={opslaan}
          disabled={bezig}
          style={{ padding: "12px 24px", borderRadius: 999, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: bezig ? "default" : "pointer" }}
        >
          {bezig ? "Bezig met opslaan..." : "Wijzigingen opslaan"}
        </button>
        <Link
          href={`${basis}/beheer/vriendenboek`}
          style={{
            padding: "12px 24px",
            borderRadius: 999,
            border: `1px solid ${colors.line}`,
            color: colors.ink,
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Terug
        </Link>
      </div>
    </div>
  );
}
