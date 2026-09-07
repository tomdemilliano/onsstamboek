"use client";

import { useEffect, useRef, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { PhotoFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { decenniumLabel } from "@/lib/fotoUtils";
import AdminSubNav from "@/components/AdminSubNav";
import type { Photo, WithId } from "@/types/models";

function alleDecennia(startjaar: number) {
  const eind = Math.floor(new Date().getFullYear() / 10) * 10;
  const lijst: number[] = [];
  for (let d = startjaar; d <= eind; d += 10) lijst.push(d);
  return lijst;
}

export default function SorterenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const startdecennium = Math.floor((groep.oprichtingsjaar ?? new Date().getFullYear() - 20) / 10) * 10;

  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [lijstOpen, setLijstOpen] = useState<WithId<Photo>[]>([]);
  const dragIndexRef = useRef<number | null>(null);

  const tabs = [
    { href: `${basis}/beheer/fotos`, label: "Overzicht", exact: true },
    { href: `${basis}/beheer/fotos/toevoegen`, label: "+ Foto's toevoegen" },
    { href: `${basis}/beheer/fotos/tags`, label: "Tags" },
    { href: `${basis}/beheer/fotos/sorteren`, label: "🗓️ Op decennium sorteren" },
    { href: `${basis}/beheer/fotos/dubbels`, label: "🔍 Dubbels" },
  ];

  async function load() {
    setLoading(true);
    const alle = await PhotoFactory.getAllAdmin(groep.id);
    setFotos(alle.filter((f) => f.status === "published" && !f.verwijderVerzoek));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    PhotoFactory.getAllAdmin(groep.id).then((alle) => {
      if (!actief) return;
      setFotos(alle.filter((f) => f.status === "published" && !f.verwijderVerzoek));
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  // lijstOpen is een lokaal herschikbare kopie van "de foto's in het open
  // decennium" -- opnieuw afgeleid zodra open of fotos wijzigt (via React's
  // "state tijdens het renderen aanpassen"-patroon, i.p.v. een effect, want
  // dit is afgeleide state en geen synchronisatie met iets extern), maar
  // nadien vrij herschikbaar tijdens het slepen (overAndereFoto hieronder).
  const [vorigeSleutel, setVorigeSleutel] = useState<{ open: number | null; fotos: WithId<Photo>[] }>({ open: null, fotos: [] });
  if (vorigeSleutel.open !== open || vorigeSleutel.fotos !== fotos) {
    setVorigeSleutel({ open, fotos });
    setLijstOpen(open == null ? [] : fotos.filter((f) => f.decennium === open).sort((a, b) => (a.decenniumPositie || 0) - (b.decenniumPositie || 0)));
  }

  const nietGesorteerd = fotos.filter((f) => f.decennium == null);

  async function handleDropOpDecennium(decennium: number, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    await PhotoFactory.zetDecennium(groep.id, id, decennium);
    load();
  }

  function startSlepenUitLijst(index: number) {
    dragIndexRef.current = index;
  }

  function overAndereFoto(index: number) {
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    const nieuw = [...lijstOpen];
    const [verplaatst] = nieuw.splice(dragIndexRef.current, 1);
    nieuw.splice(index, 0, verplaatst);
    dragIndexRef.current = index;
    setLijstOpen(nieuw);
  }

  async function eindeSlepen() {
    dragIndexRef.current = null;
    await PhotoFactory.herschikDecennium(lijstOpen.map((f) => f.id));
    load();
  }

  async function verwijderDecennium(id: string) {
    await PhotoFactory.zetDecennium(groep.id, id, null);
    load();
  }

  async function verplaatsNaarDecennium(id: string, decennium: number) {
    await PhotoFactory.zetDecennium(groep.id, id, decennium);
    load();
  }

  async function zetJaar(foto: WithId<Photo>, jaarStr: string) {
    const jaar = jaarStr ? parseInt(jaarStr, 10) : null;
    await PhotoFactory.updateTags(foto.id, {
      jaar,
      locatie: foto.locatie,
      beschrijving: foto.beschrijving,
      ledenTags: foto.ledenTags,
      tagIds: foto.tagIds,
      decennium: foto.decennium,
    });
    load();
  }

  const decennia = alleDecennia(startdecennium);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 100px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Foto&apos;s</h1>

      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Op decennium sorteren</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 24 }}>
        Sleep een foto naar een decennium als je geen exact jaartal weet. Klik op een decennium om het uit te klappen en de foto&apos;s er binnenin te herschikken (vooraan = vroeger in dat decennium) — zo ontstaat toch een soort tijdlijn, ook zonder exact jaartal.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && (
        <>
          <div style={{ marginBottom: 20 }}>
            <SectieTitel>Nog niet gesorteerd ({nietGesorteerd.length})</SectieTitel>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {nietGesorteerd.map((foto) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={foto.id}
                  src={foto.afbeeldingUrl}
                  alt=""
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", foto.id)}
                  style={{ width: 70, height: 70, objectFit: "cover", borderRadius: radius.input, border: `1px solid ${colors.line}`, flexShrink: 0, cursor: "grab" }}
                />
              ))}
              {nietGesorteerd.length === 0 && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Alles is ondertussen aan een decennium toegewezen. 🎉</p>}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {decennia.map((d) => {
              const aantal = fotos.filter((f) => f.decennium === d).length;
              const actief = open === d;
              return (
                <button
                  key={d}
                  onClick={() => setOpen(actief ? null : d)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOpDecennium(d, e)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: radius.card,
                    border: `2px dashed ${actief ? colors.forest : colors.line}`,
                    background: actief ? colors.forest : colors.paperCard,
                    color: actief ? colors.white : colors.ink,
                    fontFamily: fonts.display,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    minWidth: 110,
                  }}
                >
                  {decenniumLabel(d)}
                  <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                    {aantal} foto{aantal === 1 ? "" : "'s"}
                  </div>
                </button>
              );
            })}
          </div>

          {open != null && (
            <div style={{ background: colors.paperCard, border: `1.5px solid ${colors.forest}`, borderRadius: radius.card, padding: "18px 20px" }}>
              <SectieTitel>{decenniumLabel(open)} — sleep om te herschikken</SectieTitel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {lijstOpen.map((foto, index) => (
                  <div
                    key={foto.id}
                    draggable
                    onDragStart={() => startSlepenUitLijst(index)}
                    onDragEnter={() => overAndereFoto(index)}
                    onDragEnd={eindeSlepen}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ width: 110, background: colors.white, border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden", cursor: "grab" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.afbeeldingUrl} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        type="number"
                        placeholder="exact jaar?"
                        defaultValue={foto.jaar || ""}
                        onBlur={(e) => {
                          if (parseInt(e.target.value, 10) !== (foto.jaar || null)) zetJaar(foto, e.target.value);
                        }}
                        style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: `1px solid ${colors.line}`, fontFamily: fonts.body, fontSize: 11, boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                        <button title="Naar vorig decennium" onClick={() => verplaatsNaarDecennium(foto.id, open - 10)} disabled={open <= startdecennium} style={miniBtn()}>
                          ◀
                        </button>
                        <button title="Decennium verwijderen" onClick={() => verwijderDecennium(foto.id)} style={miniBtn(colors.stamp)}>
                          ✕
                        </button>
                        <button title="Naar volgend decennium" onClick={() => verplaatsNaarDecennium(foto.id, open + 10)} style={miniBtn()}>
                          ▶
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {lijstOpen.length === 0 && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Nog geen foto&apos;s in dit decennium — sleep er hierboven eentje naartoe.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}

function miniBtn(kleur?: string): React.CSSProperties {
  return { flex: 1, padding: "4px 0", borderRadius: 4, border: "none", background: kleur || colors.inkMuted, color: colors.white, fontSize: 11, cursor: "pointer" };
}
