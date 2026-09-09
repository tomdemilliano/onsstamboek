"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { EntryFactory, PhotoFactory, LeidingFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import type { Entry, WithId } from "@/types/models";

export default function VriendenboekjePage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [entries, setEntries] = useState<WithId<Entry>[]>([]);
  const [stubs, setStubs] = useState<WithId<Entry>[]>([]);
  const [fotoAantallen, setFotoAantallen] = useState<Record<string, number>>({});
  const [leidingAantallen, setLeidingAantallen] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [zoek, setZoek] = useState("");
  const [tab, setTab] = useState<"leden" | "getagd">("leden");

  useEffect(() => {
    let actief = true;
    Promise.all([
      EntryFactory.getPublished(groep.id),
      EntryFactory.getStubs(groep.id),
      PhotoFactory.getPublished(groep.id),
      LeidingFactory.getAll(groep.id),
    ]).then(([e, s, fotos, leiding]) => {
      if (!actief) return;
      setEntries(e);
      setStubs(s);

      const fotoTellingen: Record<string, number> = {};
      fotos.forEach((foto) => {
        (foto.taggedEntryIds || []).forEach((entryId) => {
          fotoTellingen[entryId] = (fotoTellingen[entryId] || 0) + 1;
        });
      });
      setFotoAantallen(fotoTellingen);

      const leidingTellingen: Record<string, number> = {};
      leiding.forEach((item) => {
        (item.leden || []).forEach((lid) => {
          if (lid.entryId) leidingTellingen[lid.entryId] = (leidingTellingen[lid.entryId] || 0) + 1;
        });
      });
      setLeidingAantallen(leidingTellingen);

      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const gefilterd = entries.filter((e) => `${e.naam} ${e.totemnaam ?? ""}`.toLowerCase().includes(zoek.toLowerCase()));
  const stubsGefilterd = stubs.filter((e) => e.naam.toLowerCase().includes(zoek.toLowerCase()));

  // Onthoud de zichtbare volgorde (id + naam, zodat de detailpagina de naam
  // van vorige/volgende meteen kan tonen zonder extra op te vragen), zodat
  // de profielpagina van een lid ermee kan navigeren.
  useEffect(() => {
    try {
      sessionStorage.setItem(`vb-leden-volgorde-${groep.id}`, JSON.stringify(gefilterd.map((e) => ({ id: e.id, naam: e.naam }))));
    } catch {
      // sessionStorage niet beschikbaar (bv. privénavigatie) -- geen probleem,
      // de detailpagina toont dan gewoon geen vorige/volgende-navigatie.
    }
  }, [gefilterd, groep.id]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 24, marginTop: 28 }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 38, fontWeight: 700, color: colors.ink, margin: 0 }}>
            Het Vriendenboekje
          </h1>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          <TabKnop actief={tab === "leden"} onClick={() => setTab("leden")}>
            Leden ({entries.length})
          </TabKnop>
          <TabKnop actief={tab === "getagd"} onClick={() => setTab("getagd")}>
            Getagd, geen eigen fiche ({stubs.length})
          </TabKnop>
          <input
            type="text"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam of totemnaam..."
            style={{
              width: 240,
              padding: "8px 14px",
              borderRadius: radius.badge,
              border: `1px solid ${colors.line}`,
              background: colors.white,
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.ink,
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

        {!loading && tab === "leden" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
              <Link href={`${basis}/toevoegen`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: colors.campfireLight,
                    border: `1.5px dashed ${colors.campfire}`,
                    borderRadius: radius.card,
                    padding: "22px 20px",
                    height: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>✍️</div>
                  <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.campfire, lineHeight: 1.3 }}>
                    Was jij lid maar sta hier nog niet tussen?
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginTop: 6, lineHeight: 1.4 }}>
                    Klik dan hier om jouw ervaringen toe te voegen.
                  </div>
                </div>
              </Link>

              {gefilterd.map((entry) => (
                <Link key={entry.id} href={`${basis}/entry/${entry.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      position: "relative",
                      background: colors.paperCard,
                      border: `1px solid ${colors.line}`,
                      borderRadius: radius.card,
                      padding: "22px 20px",
                      height: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {entry.geboortejaar && (
                      <div
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          fontFamily: fonts.body,
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.inkMuted,
                          border: `1px solid ${colors.line}`,
                          borderRadius: radius.badge,
                          padding: "3px 8px",
                        }}
                      >
                        °{entry.geboortejaar}
                      </div>
                    )}
                    <div style={{ fontFamily: fonts.display, fontSize: 21, fontWeight: 600, color: colors.ink, marginBottom: 6, paddingRight: 40 }}>
                      {entry.naam}
                    </div>
                    {entry.totemnaam && (
                      <div
                        style={{
                          display: "inline-block",
                          fontFamily: fonts.body,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: colors.stamp,
                          border: `1.5px solid ${colors.stamp}`,
                          borderRadius: radius.badge,
                          padding: "3px 10px",
                          marginBottom: 10,
                        }}
                      >
                        {entry.totemnaam}
                      </div>
                    )}
                    <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{entry.periode}</div>
                    {entry.goedgekeurd === false && (
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          fontFamily: fonts.body,
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.campfire,
                          background: colors.campfireLight,
                          border: `1px solid ${colors.campfire}`,
                          borderRadius: radius.badge,
                          padding: "2px 9px",
                        }}
                      >
                        ⏳ Wacht op goedkeuring
                      </div>
                    )}
                    {fotoAantallen[entry.id] > 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.forest }}>
                        📷 {fotoAantallen[entry.id]}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {!loading && gefilterd.length === 0 && (
              <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Geen resultaten gevonden.</p>
            )}
          </>
        )}

        {!loading && tab === "getagd" && (
          <>
            <p
              style={{
                textAlign: "center",
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.inkMuted,
                marginBottom: 20,
                maxWidth: 480,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Deze mensen zijn herkend op een foto of stonden in een leidingsploeg, maar vulden nog geen eigen vriendenboekje-formulier in.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, margin: "0 auto" }}>
              {stubsGefilterd.map((entry) => (
                <Link key={entry.id} href={`${basis}/entry/${entry.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 16px",
                      background: colors.paperCard,
                      border: `1px solid ${colors.line}`,
                      borderRadius: radius.card,
                    }}
                  >
                    <span style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{entry.naam}</span>
                    <span style={{ display: "flex", gap: 10, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.forest }}>
                      {fotoAantallen[entry.id] > 0 && <span>📷 {fotoAantallen[entry.id]}</span>}
                      {leidingAantallen[entry.id] > 0 && <span>👥 {leidingAantallen[entry.id]}</span>}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {stubsGefilterd.length === 0 && (
              <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>
                {zoek ? "Geen resultaten gevonden." : "Niemand hier op dit moment."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabKnop({ children, actief, onClick }: { children: React.ReactNode; actief: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: radius.badge,
        border: `1.5px solid ${actief ? colors.forest : colors.line}`,
        background: actief ? colors.forest : colors.white,
        color: actief ? colors.white : colors.ink,
        fontFamily: fonts.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
