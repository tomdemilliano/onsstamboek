"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, PhotoFactory, LeidingFactory, TakFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { toDisplayArray } from "@/lib/textUtils";
import { decenniumLabel } from "@/lib/fotoUtils";
import { werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import type { Entry, Photo, WithId } from "@/types/models";

interface LeidingJaar {
  werkingsjaarStart: number;
  takNaam: string;
}

export default function EntryDetailPage(props: PageProps<"/[groep]/entry/[id]">) {
  const { id } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [entry, setEntry] = useState<WithId<Entry> | null | undefined>(undefined);
  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [leidingJaren, setLeidingJaren] = useState<LeidingJaar[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toonScan, setToonScan] = useState(false);
  const [ledenVolgorde, setLedenVolgorde] = useState<{ id: string; naam: string }[]>([]);

  // De volgorde die de bezoeker op /vriendenboekje zag (met eventuele
  // zoekfilter), zodat vorige/volgende hier diezelfde volgorde volgt. Via
  // Promise.resolve().then() i.p.v. rechtstreeks, ook al is de
  // sessionStorage-lezing zelf synchroon (geen synchrone setState in een
  // effect-body toegestaan).
  useEffect(() => {
    let actief = true;
    Promise.resolve().then(() => {
      if (!actief) return;
      try {
        const raw = sessionStorage.getItem(`vb-leden-volgorde-${groep.id}`);
        setLedenVolgorde(raw ? JSON.parse(raw) : []);
      } catch {
        setLedenVolgorde([]);
      }
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  useEffect(() => {
    let actief = true;
    EntryFactory.getById(id).then((e) => {
      if (!actief) return;
      setToonScan(false);
      const geldig = e && (e.status === "published" || e.status === "stub") && e.groepId === groep.id;
      setEntry(geldig ? e : null);
      if (geldig) {
        PhotoFactory.getByEntryId(groep.id, id).then((f) => actief && setFotos(f));
        Promise.all([LeidingFactory.getByEntryId(groep.id, id), TakFactory.getAll(groep.id)]).then(([leidingData, takken]) => {
          if (!actief) return;
          const lijst = leidingData
            .map((item) => ({
              werkingsjaarStart: item.werkingsjaarStart,
              takNaam: takken.find((t) => t.id === item.takId)?.naam || "(onbekende tak)",
            }))
            .sort((a, b) => b.werkingsjaarStart - a.werkingsjaarStart);
          setLeidingJaren(lijst);
        });
      }
    });
    return () => {
      actief = false;
    };
  }, [id, groep.id]);

  const huidigeIndex = ledenVolgorde.findIndex((e) => e.id === id);
  const vorigeLid = huidigeIndex > 0 ? ledenVolgorde[huidigeIndex - 1] : null;
  const volgendeLid = huidigeIndex >= 0 && huidigeIndex < ledenVolgorde.length - 1 ? ledenVolgorde[huidigeIndex + 1] : null;

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null && i < fotos.length - 1 ? i + 1 : i));
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, fotos.length]);

  if (entry === undefined) {
    return <p style={{ padding: 48, fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>;
  }

  if (entry === null) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ fontFamily: fonts.body, color: colors.stamp, marginBottom: 12 }}>
          Dit formulier bestaat niet (meer) of is nog niet gepubliceerd.
        </p>
        <Link href={`${basis}/vriendenboekje`} style={{ fontFamily: fonts.body, color: colors.forest }}>
          ← Terug naar het vriendenboekje
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 100px" }}>
        <Link href={`${basis}/vriendenboekje`} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "none" }}>
          ← Terug naar het vriendenboekje
        </Link>

        {(vorigeLid || volgendeLid) && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
            {vorigeLid ? (
              <Link
                href={`${basis}/entry/${vorigeLid.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: colors.paperCard, color: colors.ink, fontFamily: fonts.body, fontSize: 13, textDecoration: "none", maxWidth: "48%" }}
              >
                <span style={{ flexShrink: 0 }}>‹</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vorigeLid.naam}</span>
              </Link>
            ) : (
              <span />
            )}
            {volgendeLid ? (
              <Link
                href={`${basis}/entry/${volgendeLid.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: colors.paperCard, color: colors.ink, fontFamily: fonts.body, fontSize: 13, textDecoration: "none", maxWidth: "48%", marginLeft: "auto" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{volgendeLid.naam}</span>
                <span style={{ flexShrink: 0 }}>›</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

        <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "36px 32px", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: 0 }}>{entry.naam}</h1>
              {(entry.geboortejaar || entry.periode) && (
                <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, margin: "6px 0 0" }}>
                  {entry.geboortejaar && `°${entry.geboortejaar} · `}
                  {entry.periode && `Lid van ${entry.periode}`}
                </p>
              )}
              {entry.status === "stub" && (
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.campfire, margin: "6px 0 0" }}>
                  Nog geen eigen vriendenboekje-fiche —{" "}
                  <Link href={`${basis}/toevoegen`} style={{ color: colors.campfire, fontWeight: 600 }}>
                    ben jij dit, of ken je deze persoon? Vul &apos;m zelf aan
                  </Link>
                  .
                </p>
              )}
              {entry.status === "published" && entry.goedgekeurd === false && (
                <p
                  style={{
                    display: "inline-block",
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.campfire,
                    background: colors.campfireLight,
                    border: `1px solid ${colors.campfire}`,
                    borderRadius: radius.badge,
                    padding: "4px 12px",
                    margin: "8px 0 0",
                  }}
                >
                  ⏳ Wacht op goedkeuring van de beheerder
                </p>
              )}
            </div>
            {entry.status === "published" && (
              <Link
                href={`${basis}/entry/${id}/wijzigen`}
                style={{
                  flexShrink: 0,
                  padding: "7px 14px",
                  borderRadius: radius.badge,
                  border: `1px solid ${colors.line}`,
                  background: colors.paperCard,
                  color: colors.ink,
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                ✏️ Wijziging voorstellen
              </Link>
            )}
            {entry.totemnaam && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: colors.stamp,
                  border: `1.5px solid ${colors.stamp}`,
                  borderRadius: radius.badge,
                  padding: "5px 14px",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.totemnaam}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: colors.line, margin: "26px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <VeldRij titel="Het plezantste spel of de strafste activiteit" waarden={toDisplayArray(entry.leuksteActiviteit)} />
            <VeldRij titel="De beste kampplaats ooit" waarden={toDisplayArray(entry.besteKampplaats)} />
            <VeldRij titel="Het lekkerste kamp-eten" waarden={toDisplayArray(entry.lekkersteEten)} achtergrond={colors.campfireLight} zonderRand />

            {leidingJaren.length > 0 && (
              <div>
                <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.forest, marginBottom: 6 }}>👥 Leiding</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {leidingJaren.map((item, i) => (
                    <div key={i} style={{ fontFamily: fonts.body, fontSize: 15, color: colors.ink }}>
                      <span style={{ fontWeight: 600 }}>{item.takNaam}</span>
                      {" — "}
                      {werkingsjaarLabel(item.werkingsjaarStart)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {entry.scanUrl && (
            <div style={{ marginTop: 30 }}>
              <button
                onClick={() => setToonScan((v) => !v)}
                style={{ padding: "8px 16px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: "transparent", color: colors.inkMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {toonScan ? "Verberg origineel formulier" : "Bekijk origineel formulier"}
              </button>
              {toonScan && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.scanUrl}
                  alt={`Origineel formulier van ${entry.naam}`}
                  style={{ display: "block", maxWidth: "100%", marginTop: 14, borderRadius: radius.card, border: `1px solid ${colors.line}` }}
                />
              )}
            </div>
          )}

          {fotos.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.forest, marginBottom: 10 }}>
                📷 Foto&apos;s met {entry.naam.split(" ")[0]} ({fotos.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {fotos.map((foto, i) => (
                  <button key={foto.id} onClick={() => setLightboxIndex(i)} style={{ display: "block", padding: 0, border: "none", background: "none", cursor: "pointer" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.afbeeldingUrl} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: radius.input, border: `1px solid ${colors.line}` }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && fotos[lightboxIndex] && (
        <FotoLightbox
          foto={fotos[lightboxIndex]}
          basis={basis}
          heeftVorige={lightboxIndex > 0}
          heeftVolgende={lightboxIndex < fotos.length - 1}
          onVorige={() => setLightboxIndex((i) => (i !== null ? i - 1 : i))}
          onVolgende={() => setLightboxIndex((i) => (i !== null ? i + 1 : i))}
          onSluiten={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function FotoLightbox({
  foto,
  basis,
  heeftVorige,
  heeftVolgende,
  onVorige,
  onVolgende,
  onSluiten,
}: {
  foto: WithId<Photo>;
  basis: string;
  heeftVorige: boolean;
  heeftVolgende: boolean;
  onVorige: () => void;
  onVolgende: () => void;
  onSluiten: () => void;
}) {
  const [fout, setFout] = useState(false);
  const jaarTekst = foto.jaar ? String(foto.jaar) : foto.decennium != null ? decenniumLabel(foto.decennium) : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20, 16, 10, 0.96)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSluiten();
      }}
    >
      {fout ? (
        <div style={{ textAlign: "center", color: colors.white, fontFamily: fonts.body }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
          <p>Deze afbeelding kan hier niet getoond worden.</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto.afbeeldingUrl} alt="" onError={() => setFout(true)} style={{ maxWidth: "94vw", maxHeight: "90vh", objectFit: "contain", display: "block" }} />
      )}

      {(jaarTekst || foto.locatie) && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0, 0, 0, 0.5)", borderRadius: radius.badge, padding: "6px 14px", fontFamily: fonts.body, fontSize: 12, color: colors.white }}>
          {[jaarTekst, foto.locatie].filter(Boolean).join(" · ")}
        </div>
      )}

      <div style={{ position: "fixed", top: 16, right: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href={`${basis}/fotos/${foto.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Bewerken (opent in nieuw tabblad)"
          aria-label="Bewerken (opent in nieuw tabblad)"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, background: "rgba(0, 0, 0, 0.5)", color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
        >
          ✏️ Bewerken ↗
        </a>
        <button onClick={onSluiten} aria-label="Sluiten" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: colors.white, fontSize: 16, cursor: "pointer", flexShrink: 0 }}>
          ✕
        </button>
      </div>

      {heeftVorige && (
        <button onClick={onVorige} aria-label="Vorige foto" style={lightboxPijlStyle("left")}>
          ‹
        </button>
      )}
      {heeftVolgende && (
        <button onClick={onVolgende} aria-label="Volgende foto" style={lightboxPijlStyle("right")}>
          ›
        </button>
      )}
    </div>
  );
}

function lightboxPijlStyle(kant: "left" | "right"): React.CSSProperties {
  return { position: "fixed", top: "50%", [kant]: 16, transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: colors.white, fontSize: 28, lineHeight: "48px", textAlign: "center", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700 };
}

function VeldRij({
  titel,
  waarden,
  achtergrond,
  zonderRand,
}: {
  titel: string;
  waarden: string[];
  achtergrond?: string;
  zonderRand?: boolean;
}) {
  if (waarden.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: colors.forest,
          marginBottom: 6,
        }}
      >
        {titel}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {waarden.map((waarde, i) => (
          <span
            key={i}
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 600,
              color: colors.ink,
              background: achtergrond ?? colors.white,
              border: zonderRand ? undefined : `1px solid ${colors.line}`,
              borderRadius: radius.badge,
              padding: "5px 14px",
            }}
          >
            {waarde}
          </span>
        ))}
      </div>
    </div>
  );
}
