"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { PhotoFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import { decenniumLabel } from "@/lib/fotoUtils";
import type { Photo, WithId } from "@/types/models";

function alleDecennia(startjaar: number) {
  const eind = Math.floor(new Date().getFullYear() / 10) * 10;
  const lijst: number[] = [];
  for (let d = startjaar; d <= eind; d += 10) lijst.push(d);
  return lijst;
}

export default function PubliekSorterenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const startdecennium = Math.floor((groep.oprichtingsjaar ?? new Date().getFullYear() - 20) / 10) * 10;

  const [fotos, setFotos] = useState<WithId<Photo>[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const alle = await PhotoFactory.getPublished(groep.id);
    setFotos(alle);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    PhotoFactory.getPublished(groep.id).then((alle) => {
      if (!actief) return;
      setFotos(alle);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const nietGesorteerd = fotos.filter((f) => f.decennium == null);
  const lijstOpen = fotos.filter((f) => f.decennium === open).sort((a, b) => (a.decenniumPositie || 0) - (b.decenniumPositie || 0));

  function klikOpFoto(id: string) {
    setGeselecteerd((huidig) => (huidig === id ? null : id));
  }

  async function klikOpDecennium(d: number) {
    if (geselecteerd) {
      await PhotoFactory.zetDecennium(groep.id, geselecteerd, d);
      setGeselecteerd(null);
      setOpen(d);
      load();
    } else {
      setOpen((huidig) => (huidig === d ? null : d));
    }
  }

  async function verplaats(foto: WithId<Photo>, richting: number) {
    const lijst = fotos.filter((f) => f.decennium === foto.decennium).sort((a, b) => (a.decenniumPositie || 0) - (b.decenniumPositie || 0));
    const index = lijst.findIndex((f) => f.id === foto.id);
    const andereIndex = index + richting;
    if (andereIndex < 0 || andereIndex >= lijst.length) return;
    const nieuweVolgorde = [...lijst];
    [nieuweVolgorde[index], nieuweVolgorde[andereIndex]] = [nieuweVolgorde[andereIndex], nieuweVolgorde[index]];
    await PhotoFactory.herschikDecennium(nieuweVolgorde.map((f) => f.id));
    load();
  }

  async function verplaatsDecennium(foto: WithId<Photo>, nieuwDecennium: number) {
    await PhotoFactory.zetDecennium(groep.id, foto.id, nieuwDecennium);
    load();
  }

  async function verwijderDecennium(foto: WithId<Photo>) {
    await PhotoFactory.zetDecennium(groep.id, foto.id, null);
    load();
  }

  const decennia = alleDecennia(startdecennium);

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 20px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Help mee sorteren op decennium</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, maxWidth: 520, margin: "0 auto" }}>
            Weet je van een foto niet het exacte jaartal, maar wel ongeveer uit welk decennium ze komt? Tik de foto aan, en tik daarna op het juiste decennium. Zo bouwen we samen een tijdlijn op.
          </p>
          <Link href={`${basis}/fotos`} style={{ display: "inline-block", marginTop: 10, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "none" }}>
            ← Terug naar alle foto&apos;s
          </Link>
        </div>

        {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

        {!loading && (
          <>
            {geselecteerd && (
              <div style={{ position: "sticky", top: 10, zIndex: 30, background: colors.forest, color: colors.white, borderRadius: radius.badge, padding: "10px 16px", textAlign: "center", fontFamily: fonts.body, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                📌 Foto geselecteerd — tik nu op een decennium hieronder om ze daar te plaatsen
                <button onClick={() => setGeselecteerd(null)} style={{ marginLeft: 10, background: "none", border: `1px solid ${colors.white}`, color: colors.white, borderRadius: radius.badge, padding: "2px 10px", fontSize: 12, cursor: "pointer" }}>
                  annuleren
                </button>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <SectieTitel>Nog niet gesorteerd ({nietGesorteerd.length})</SectieTitel>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                {nietGesorteerd.map((foto) => (
                  <Tegel key={foto.id} foto={foto} geselecteerd={geselecteerd === foto.id} onClick={() => klikOpFoto(foto.id)} />
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
                    onClick={() => klikOpDecennium(d)}
                    style={{
                      padding: "14px 18px",
                      borderRadius: radius.card,
                      border: `2px ${geselecteerd ? "solid" : "dashed"} ${actief ? colors.forest : geselecteerd ? colors.campfire : colors.line}`,
                      background: actief ? colors.forest : colors.paperCard,
                      color: actief ? colors.white : colors.ink,
                      fontFamily: fonts.display,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      minWidth: 100,
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
                <SectieTitel>{decenniumLabel(open)} — vroegste eerst</SectieTitel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {lijstOpen.map((foto, index) => (
                    <div key={foto.id} style={{ width: 110, background: colors.white, border: `1px solid ${colors.line}`, borderRadius: radius.card, overflow: "hidden" }}>
                      <Link href={`${basis}/fotos/${foto.id}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={foto.afbeeldingUrl} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                      </Link>
                      <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                          <button title="Vroeger in dit decennium" onClick={() => verplaats(foto, -1)} disabled={index === 0} style={miniBtn(index === 0)}>
                            ↑
                          </button>
                          <button title="Later in dit decennium" onClick={() => verplaats(foto, 1)} disabled={index === lijstOpen.length - 1} style={miniBtn(index === lijstOpen.length - 1)}>
                            ↓
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                          <button title="Naar vorig decennium" onClick={() => verplaatsDecennium(foto, open - 10)} disabled={open <= startdecennium} style={miniBtn(open <= startdecennium)}>
                            ◀
                          </button>
                          <button title="Uit dit decennium halen" onClick={() => verwijderDecennium(foto)} style={{ ...miniBtn(false), background: colors.stamp }}>
                            ✕
                          </button>
                          <button title="Naar volgend decennium" onClick={() => verplaatsDecennium(foto, open + 10)} style={miniBtn(false)}>
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {lijstOpen.length === 0 && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Nog geen foto&apos;s in dit decennium — tik hierboven een foto aan en dan dit vak.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Tegel({ foto, geselecteerd, onClick }: { foto: WithId<Photo>; geselecteerd: boolean; onClick: () => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foto.afbeeldingUrl}
      alt=""
      onClick={onClick}
      style={{
        width: 70,
        height: 70,
        objectFit: "cover",
        borderRadius: radius.input,
        border: geselecteerd ? `3px solid ${colors.forest}` : `1px solid ${colors.line}`,
        flexShrink: 0,
        cursor: "pointer",
        boxShadow: geselecteerd ? `0 0 0 2px ${colors.campfireLight}` : "none",
      }}
    />
  );
}

function SectieTitel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}

function miniBtn(uitgeschakeld: boolean): React.CSSProperties {
  return { flex: 1, padding: "5px 0", borderRadius: 4, border: "none", background: uitgeschakeld ? colors.line : colors.inkMuted, color: colors.white, fontSize: 12, cursor: uitgeschakeld ? "default" : "pointer" };
}
