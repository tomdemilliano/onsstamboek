"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { useSearchParams } from "next/navigation";
import { PhotoFactory, PhotoTagFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { rotateImageFile, decenniumLabel } from "@/lib/fotoUtils";
import AdminSubNav from "@/components/AdminSubNav";
import MemberTagPicker from "@/components/MemberTagPicker";
import PhotoTagSelector from "@/components/PhotoTagSelector";
import TagFilterPicker from "@/components/TagFilterPicker";
import type { LedenTag, Photo, PhotoTag, WithId } from "@/types/models";

export default function FotosBeheerPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [alleTags, setAlleTags] = useState<WithId<PhotoTag>[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bewerkId, setBewerkId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [f, t] = await Promise.all([PhotoFactory.getAllAdmin(groep.id), PhotoTagFactory.getAll(groep.id)]);
    setFotos(f);
    setAlleTags(t);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([PhotoFactory.getAllAdmin(groep.id), PhotoTagFactory.getAll(groep.id)]).then(([f, t]) => {
      if (!actief) return;
      setFotos(f);
      setAlleTags(t);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  // Vanuit het activiteitenlog rechtstreeks naar de betrokken foto springen.
  const gemarkeerdeFotoId = searchParams.get("foto");
  useEffect(() => {
    if (loading || !gemarkeerdeFotoId) return;
    const timer = setTimeout(() => {
      document.getElementById(`foto-${gemarkeerdeFotoId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, gemarkeerdeFotoId]);

  const tabs = [
    { href: `${basis}/beheer/fotos`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/fotos/toevoegen`, label: "+ Foto's toevoegen" },
    { href: `${basis}/beheer/fotos/tags`, label: "Tags" },
    { href: `${basis}/beheer/fotos/sorteren`, label: "🗓️ Op decennium sorteren" },
    { href: `${basis}/beheer/fotos/dubbels`, label: "🔍 Dubbels" },
  ];

  async function handleGoedkeuren(foto: WithId<Photo>) {
    await PhotoFactory.approve(foto.id);
    load();
  }

  async function handleVerwijderen(foto: WithId<Photo>) {
    if (!confirm("Deze foto definitief verwijderen?")) return;
    await PhotoFactory.remove(foto.id, foto.afbeeldingPath);
    load();
  }

  async function handleAnnuleerVerwijderverzoek(foto: WithId<Photo>) {
    await PhotoFactory.cancelDeleteRequest(foto.id);
    load();
  }

  const pending = fotos.filter((f) => f.status === "pending");
  const verwijderVerzoeken = fotos.filter((f) => f.status === "published" && f.verwijderVerzoek);
  const gepubliceerdAlles = fotos.filter((f) => f.status === "published" && !f.verwijderVerzoek);
  const gepubliceerd = gepubliceerdAlles.filter((f) => tagFilter.length === 0 || tagFilter.every((t) => (f.tagIds || []).includes(t)));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Foto&apos;s</h1>

      <AdminSubNav tabs={tabs} />

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectieTitel kleur={colors.campfire}>Nog goed te keuren ({pending.length})</SectieTitel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {pending.map((foto) => (
              <div key={foto.id} id={`foto-${foto.id}`} style={{ border: `1.5px dashed ${colors.campfire}`, borderRadius: radius.card, overflow: "hidden", background: colors.campfireLight, outline: gemarkeerdeFotoId === foto.id ? `3px solid ${colors.forest}` : "none" }}>
                <ThumbOfFout url={foto.afbeeldingUrl} />
                {foto.contactEmail && <div style={{ padding: "6px 8px", fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted }}>{foto.contactEmail}</div>}
                <div style={{ display: "flex", gap: 4, padding: "0 8px 8px" }}>
                  <button onClick={() => handleGoedkeuren(foto)} style={smallBtn(colors.forest)}>
                    Goedkeuren
                  </button>
                  <button onClick={() => handleVerwijderen(foto)} style={smallBtn(colors.stamp)}>
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {verwijderVerzoeken.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectieTitel kleur={colors.stamp}>Verwijderverzoeken ({verwijderVerzoeken.length})</SectieTitel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {verwijderVerzoeken.map((foto) => (
              <div key={foto.id} id={`foto-${foto.id}`} style={{ display: "flex", gap: 12, alignItems: "center", border: `1.5px dashed ${colors.stamp}`, borderRadius: radius.card, padding: 10, background: colors.paperCard, outline: gemarkeerdeFotoId === foto.id ? `3px solid ${colors.forest}` : "none" }}>
                <div style={{ width: 60, height: 60, flexShrink: 0 }}>
                  <ThumbOfFout url={foto.afbeeldingUrl} klein />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {foto.verwijderReden && <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.ink }}>&quot;{foto.verwijderReden}&quot;</div>}
                </div>
                <button onClick={() => handleVerwijderen(foto)} style={smallBtn(colors.stamp)}>
                  Verwijderen
                </button>
                <button onClick={() => handleAnnuleerVerwijderverzoek(foto)} style={smallBtn(colors.inkMuted)}>
                  Behouden
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <SectieTitel>
          Gepubliceerd ({gepubliceerd.length}
          {tagFilter.length > 0 ? ` van ${gepubliceerdAlles.length}` : ""})
        </SectieTitel>
        <TagFilterPicker alleTags={alleTags} geselecteerd={tagFilter} onChange={setTagFilter} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {gepubliceerd.map((foto) =>
          bewerkId === foto.id ? (
            <FotoBewerkKaart
              key={foto.id}
              groepId={groep.id}
              foto={foto}
              onKlaar={() => {
                setBewerkId(null);
                load();
              }}
            />
          ) : (
            <div key={foto.id} id={`foto-${foto.id}`} style={{ border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden", background: colors.paperCard, outline: gemarkeerdeFotoId === foto.id ? `3px solid ${colors.forest}` : "none" }}>
              <ThumbOfFout url={foto.afbeeldingUrl} />
              <div style={{ padding: "6px 8px", fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, minHeight: 16 }}>
                {[foto.jaar || (foto.decennium != null ? decenniumLabel(foto.decennium) : null), foto.locatie].filter(Boolean).join(" · ")}
                {(foto.ledenTags?.length ?? 0) > 0 && <div style={{ marginTop: 2 }}>{foto.ledenTags!.map((t) => t.naam).join(", ")}</div>}
                {(foto.tagIds?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 2, color: colors.forest, fontWeight: 600 }}>
                    {foto.tagIds!.map((id) => alleTags.find((t) => t.id === id)?.naam).filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, padding: "0 8px 8px" }}>
                <button onClick={() => setBewerkId(foto.id)} style={smallBtn(colors.inkMuted)}>
                  Bewerken
                </button>
                <button onClick={() => handleVerwijderen(foto)} style={smallBtn(colors.stamp)}>
                  Verwijderen
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {!loading && gepubliceerd.length === 0 && gepubliceerdAlles.length > 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Geen foto&apos;s die aan deze tag-filter voldoen.</p>}
      {!loading && gepubliceerdAlles.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen foto&apos;s gepubliceerd.</p>}
    </div>
  );
}

function ThumbOfFout({ url, klein, vierkant = true }: { url: string; klein?: boolean; vierkant?: boolean }) {
  const [fout, setFout] = useState(false);
  if (fout) {
    return (
      <div style={{ aspectRatio: vierkant ? "1" : undefined, minHeight: vierkant ? undefined : 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: klein ? 16 : 22 }}>🖼️</div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" onError={() => setFout(true)} style={vierkant ? { width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" } : { width: "100%", borderRadius: radius.input, display: "block" }} />
  );
}

function FotoBewerkKaart({ groepId, foto, onKlaar }: { groepId: string; foto: WithId<Photo>; onKlaar: () => void }) {
  const [jaar, setJaar] = useState(foto.jaar ? String(foto.jaar) : "");
  const [decennium, setDecennium] = useState(foto.decennium != null ? String(foto.decennium) : "");
  const [locatie, setLocatie] = useState(foto.locatie || "");
  const [beschrijving, setBeschrijving] = useState(foto.beschrijving || "");
  const [ledenTags, setLedenTags] = useState<LedenTag[]>(foto.ledenTags || []);
  const [tagIds, setTagIds] = useState<string[]>(foto.tagIds || []);
  const [afbeeldingUrl, setAfbeeldingUrl] = useState(foto.afbeeldingUrl);
  const [afbeeldingPath, setAfbeeldingPath] = useState(foto.afbeeldingPath);
  const [roterenBezig, setRoterenBezig] = useState(false);
  const [bezig, setBezig] = useState(false);

  async function draaien() {
    setRoterenBezig(true);
    try {
      const bestand = await rotateImageFile(afbeeldingUrl, 90);
      const upload = await PhotoFactory.replaceImage(groepId, foto.id, bestand, afbeeldingPath);
      setAfbeeldingUrl(upload.url);
      setAfbeeldingPath(upload.path);
    } catch (err) {
      alert("Draaien is mislukt, probeer opnieuw.");
      console.error("Fout bij het draaien van de foto:", err);
    } finally {
      setRoterenBezig(false);
    }
  }

  async function opslaan() {
    setBezig(true);
    try {
      await PhotoFactory.updateTags(foto.id, {
        jaar: jaar ? parseInt(jaar, 10) : null,
        decennium: decennium ? parseInt(decennium, 10) : null,
        locatie: locatie.trim(),
        beschrijving: beschrijving.trim(),
        ledenTags,
        tagIds,
      });
      onKlaar();
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ gridColumn: "1 / -1", border: `1.5px solid ${colors.forest}`, borderRadius: radius.card, padding: 16, background: colors.paperCard, display: "flex", gap: 18, flexWrap: "wrap" }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <ThumbOfFout url={afbeeldingUrl} vierkant={false} />
        <button onClick={draaien} disabled={roterenBezig} style={{ ...smallBtn(colors.inkMuted), flex: "none", width: "100%", marginTop: 6, padding: "6px 0" }}>
          {roterenBezig ? "Bezig met draaien..." : "↻ 90° draaien"}
        </button>
      </div>
      <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" value={jaar} onChange={(e) => setJaar(e.target.value)} placeholder="Jaar" style={{ ...inputStyle, width: 90 }} />
          <select value={decennium} onChange={(e) => setDecennium(e.target.value)} style={{ ...inputStyle, width: 120 }}>
            <option value="">Decennium</option>
            {[1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((d) => (
              <option key={d} value={d}>
                {decenniumLabel(d)}
              </option>
            ))}
          </select>
          <input type="text" value={locatie} onChange={(e) => setLocatie(e.target.value)} placeholder="Locatie" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Extra info (optioneel)" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        <MemberTagPicker groepId={groepId} value={ledenTags} onChange={setLedenTags} />
        <PhotoTagSelector groepId={groepId} value={tagIds} onChange={setTagIds} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={opslaan} disabled={bezig} style={{ ...smallBtn(colors.forest), flex: "none", padding: "8px 18px" }}>
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
          <button onClick={onKlaar} style={{ ...smallBtn(colors.inkMuted), flex: "none", padding: "8px 18px" }}>
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}

function SectieTitel({ children, kleur }: { children: React.ReactNode; kleur?: string }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: kleur || colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.ink,
  boxSizing: "border-box",
};

function smallBtn(color: string): React.CSSProperties {
  return { padding: "5px 10px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 11, fontWeight: 600, cursor: "pointer", flex: 1 };
}
