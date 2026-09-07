"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { PhotoFactory, PhotoTagFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { berekenFotoSorteerJaar, decenniumLabel } from "@/lib/fotoUtils";
import TagFilterPicker from "@/components/TagFilterPicker";
import type { Photo, PhotoTag, WithId } from "@/types/models";

export default function FotosPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [alleTags, setAlleTags] = useState<WithId<PhotoTag>[]>([]);
  const [loading, setLoading] = useState(true);
  const [jaarFilter, setJaarFilter] = useState("alle");
  const [locatieFilter, setLocatieFilter] = useState("alle");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [ledenZoek, setLedenZoek] = useState("");
  const [enkelOngetagd, setEnkelOngetagd] = useState(false);

  useEffect(() => {
    Promise.all([PhotoFactory.getPublished(groep.id), PhotoTagFactory.getAll(groep.id)]).then(([f, t]) => {
      // Chronologisch waar mogelijk (exact jaar, of decennium + positie
      // daarbinnen), foto's zonder enig tijdsgegeven helemaal achteraan --
      // in plaats van gewoon op upload-datum.
      const aantalPerDecennium: Record<number, number> = {};
      f.forEach((foto) => {
        if (foto.decennium != null) aantalPerDecennium[foto.decennium] = (aantalPerDecennium[foto.decennium] || 0) + 1;
      });
      f.sort((a, b) => {
        const sa = berekenFotoSorteerJaar(a, aantalPerDecennium[a.decennium ?? -1]);
        const sb = berekenFotoSorteerJaar(b, aantalPerDecennium[b.decennium ?? -1]);
        if (sa == null && sb == null) {
          return ((b as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0) -
            ((a as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds || 0);
        }
        if (sa == null) return 1;
        if (sb == null) return -1;
        return sa - sb;
      });
      setFotos(f);
      setAlleTags(t);
      setLoading(false);
    });
  }, [groep.id]);

  const jaren = useMemo(
    () => [...new Set(fotos.map((f) => f.jaar).filter((j): j is number => Boolean(j)))].sort((a, b) => b - a),
    [fotos]
  );
  const locaties = useMemo(() => [...new Set(fotos.map((f) => f.locatie).filter(Boolean))].sort(), [fotos]);

  function toggleTag(id: string) {
    setTagFilter((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  const gefilterd = useMemo(
    () =>
      fotos.filter((f) => {
        if (jaarFilter !== "alle" && f.jaar !== parseInt(jaarFilter, 10)) return false;
        if (locatieFilter !== "alle" && f.locatie !== locatieFilter) return false;
        if (tagFilter.length > 0 && !tagFilter.every((t) => (f.tagIds || []).includes(t))) return false;
        if (ledenZoek.trim()) {
          const term = ledenZoek.trim().toLowerCase();
          if (!(f.ledenTags || []).some((t) => t.naam.toLowerCase().includes(term))) return false;
        }
        if (enkelOngetagd) {
          const ongetagd = !f.jaar && !f.locatie && (!f.ledenTags || f.ledenTags.length === 0);
          if (!ongetagd) return false;
        }
        return true;
      }),
    [fotos, jaarFilter, locatieFilter, tagFilter, ledenZoek, enkelOngetagd]
  );

  // Onthoud de exacte volgorde die de bezoeker nu ziet (mét filters), zodat
  // vorige/volgende op de detailpagina van een foto diezelfde volgorde en
  // selectie kan volgen i.p.v. een andere, losse sortering.
  useEffect(() => {
    try {
      sessionStorage.setItem(`vb-fotos-volgorde-${groep.id}`, JSON.stringify(gefilterd.map((f) => f.id)));
    } catch {
      // sessionStorage niet beschikbaar (bv. privénavigatie) -- geen probleem.
    }
  }, [gefilterd, groep.id]);

  // Groepeer de (al chronologisch gesorteerde) foto's per decennium, met
  // een aparte groep voor foto's zonder enig tijdsgegeven -- zo ontstaat
  // een echte tijdlijn-indruk i.p.v. één lange, ongestructureerde rij.
  const groepen = useMemo(() => {
    const map = new Map<number | "onbekend", WithId<Photo>[]>();
    gefilterd.forEach((foto) => {
      let sleutel: number | "onbekend";
      if (foto.jaar) sleutel = Math.floor(foto.jaar / 10) * 10;
      else if (foto.decennium != null) sleutel = foto.decennium;
      else sleutel = "onbekend";
      if (!map.has(sleutel)) map.set(sleutel, []);
      map.get(sleutel)!.push(foto);
    });
    return Array.from(map.entries()).map(([sleutel, lijst]) => ({
      sleutel,
      titel: sleutel === "onbekend" ? "🕓 Nog te dateren" : decenniumLabel(sleutel),
      fotos: lijst,
    }));
  }, [gefilterd]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function springNaar(sleutel: number | "onbekend") {
    sectionRefs.current[String(sleutel)]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 16px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 38, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Foto&apos;s</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, margin: 0 }}>
            Help mee sorteren! Klik op een foto om er een jaar, locatie of naam bij te zetten.
          </p>
          <Link href={`${basis}/foto-toevoegen`} style={{ display: "inline-block", marginTop: 10, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "none" }}>
            📷 Heb je zelf foto&apos;s om te delen? Voeg ze toe →
          </Link>
          <br />
          <Link href={`${basis}/fotos/sorteren`} style={{ display: "inline-block", marginTop: 6, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "none" }}>
            🗓️ Help mee foto&apos;s op decennium te sorteren →
          </Link>
        </div>

        {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

        {!loading && (
          <div className="vb-fotos-layout">
            {alleTags.length > 0 && (
              <aside className="vb-tag-sidebar">
                <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>
                  Categorieën
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <SidebarItem actief={tagFilter.length === 0} onClick={() => setTagFilter([])}>
                    Alle foto&apos;s
                  </SidebarItem>
                  {alleTags.map((tag) => (
                    <SidebarItem key={tag.id} actief={tagFilter.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
                      {tag.naam}
                    </SidebarItem>
                  ))}
                </div>
              </aside>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                <select value={jaarFilter} onChange={(e) => setJaarFilter(e.target.value)} style={selectStyle}>
                  <option value="alle">Alle jaren</option>
                  {jaren.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
                <select value={locatieFilter} onChange={(e) => setLocatieFilter(e.target.value)} style={selectStyle}>
                  <option value="alle">Alle locaties</option>
                  {locaties.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                {alleTags.length > 0 && (
                  <div className="vb-tag-mobile-btn">
                    <TagFilterPicker alleTags={alleTags} geselecteerd={tagFilter} onChange={setTagFilter} />
                  </div>
                )}
                <input
                  type="text"
                  value={ledenZoek}
                  onChange={(e) => setLedenZoek(e.target.value)}
                  placeholder="Zoek op naam..."
                  style={{ ...selectStyle, minWidth: 160 }}
                />
                <button
                  onClick={() => setEnkelOngetagd((v) => !v)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: radius.badge,
                    border: `1.5px solid ${enkelOngetagd ? colors.campfire : colors.line}`,
                    background: enkelOngetagd ? colors.campfire : colors.white,
                    color: enkelOngetagd ? colors.white : colors.ink,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🏷️ Nog niet getagd
                </button>
              </div>

              {groepen.length > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                  {groepen.map((groepItem) => (
                    <button
                      key={groepItem.sleutel}
                      onClick={() => springNaar(groepItem.sleutel)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: radius.badge,
                        border: `1px solid ${groepItem.sleutel === "onbekend" ? colors.inkMuted : colors.line}`,
                        background: colors.white,
                        color: groepItem.sleutel === "onbekend" ? colors.inkMuted : colors.ink,
                        fontFamily: fonts.body,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {groepItem.titel}
                      <span style={{ color: colors.inkMuted, fontWeight: 500 }}> ({groepItem.fotos.length})</span>
                    </button>
                  ))}
                </div>
              )}

              {groepen.map((groepItem) => (
                <div
                  key={groepItem.sleutel}
                  ref={(el) => {
                    sectionRefs.current[String(groepItem.sleutel)] = el;
                  }}
                  style={{ marginBottom: 28, scrollMarginTop: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 1, background: colors.line }} />
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: groepItem.sleutel === "onbekend" ? 14 : 18,
                        fontWeight: 700,
                        color: groepItem.sleutel === "onbekend" ? colors.inkMuted : colors.forest,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {groepItem.titel}
                    </div>
                    <div style={{ flex: 1, height: 1, background: colors.line }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                    {groepItem.fotos.map((foto) => (
                      <FotoKaart key={foto.id} foto={foto} alleTags={alleTags} basis={basis} />
                    ))}
                  </div>
                </div>
              ))}

              {gefilterd.length === 0 && (
                <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Geen foto&apos;s die aan deze filters voldoen.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ children, actief, onClick }: { children: React.ReactNode; actief: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "7px 12px",
        borderRadius: radius.input,
        border: "none",
        background: actief ? colors.forest : "transparent",
        color: actief ? colors.white : colors.ink,
        fontFamily: fonts.body,
        fontSize: 13,
        fontWeight: actief ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function FotoKaart({ foto, alleTags, basis }: { foto: WithId<Photo>; alleTags: WithId<PhotoTag>[]; basis: string }) {
  const [fout, setFout] = useState(false);
  const getagd = foto.jaar || foto.decennium != null || foto.locatie || (foto.ledenTags && foto.ledenTags.length > 0);
  const tagNamen = (foto.tagIds || []).map((id) => alleTags.find((t) => t.id === id)?.naam).filter(Boolean);

  return (
    <Link href={`${basis}/fotos/${foto.id}`} style={{ textDecoration: "none" }}>
      <div style={{ border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden", background: colors.paperCard, position: "relative" }}>
        {fout ? (
          <div style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, textAlign: "center" }}>
            <span style={{ fontSize: 22 }}>🖼️</span>
            <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted }}>Kan niet getoond worden — klik om te bekijken</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.afbeeldingUrl} alt="" onError={() => setFout(true)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
        )}
        {!getagd && (
          <span
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              fontFamily: fonts.body,
              fontSize: 10,
              fontWeight: 700,
              color: colors.white,
              background: colors.campfire,
              borderRadius: radius.badge,
              padding: "2px 8px",
            }}
          >
            nog niet getagd
          </span>
        )}
        {(foto.jaar || foto.decennium != null || foto.locatie) && (
          <div style={{ padding: "6px 8px 2px", fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted }}>
            {[foto.jaar || (foto.decennium != null ? decenniumLabel(foto.decennium) : null), foto.locatie].filter(Boolean).join(" · ")}
          </div>
        )}
        {tagNamen.length > 0 && (
          <div style={{ padding: "0 8px 6px", fontFamily: fonts.body, fontSize: 10, color: colors.forest, fontWeight: 600 }}>{tagNamen.join(" · ")}</div>
        )}
      </div>
    </Link>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.ink,
};
