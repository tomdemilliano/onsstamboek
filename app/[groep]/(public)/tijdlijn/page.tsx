"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import {
  EntryFactory,
  OrganisatieKentekenFactory,
  OrganisatieMijlpaalFactory,
  GroepMijlpaalFactory,
  TakFactory,
  LeidingFactory,
  ActivityFactory,
} from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { parsePeriodRange, werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import MemberTagPicker from "@/components/MemberTagPicker";
import type {
  Entry,
  OrganisatieKenteken,
  Leidingsploeg,
  LidLeidingsploeg,
  ScoutTak,
  WithId,
} from "@/types/models";

const NAAM_KOLOM = 130;
const PX_PER_JAAR = 22;

type Mijlpaal = {
  id: string;
  jaar: number;
  titel: string;
  beschrijving?: string;
  afbeeldingUrl?: string | null;
  type: "scouting" | "groep";
};

type EntryMetPeriode = WithId<Entry> & { start: number; end: number | null };

export default function TijdlijnPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  // Bij voorkeur het oprichtingsjaar van de groep (instellingen); zonder dat
  // ingevuld nemen we een redelijk venster van de laatste 20 jaar.
  const eindJaar = new Date().getFullYear();
  const STARTJAAR = groep.oprichtingsjaar ?? eindJaar - 20;

  const [rijen, setRijen] = useState<EntryMetPeriode[]>([]);
  const [zonderJaar, setZonderJaar] = useState<WithId<Entry>[]>([]);
  const [kentekens, setKentekens] = useState<WithId<OrganisatieKenteken>[]>([]);
  const [mijlpalen, setMijlpalen] = useState<Mijlpaal[]>([]);
  const [takken, setTakken] = useState<WithId<ScoutTak>[]>([]);
  const [leidingLijst, setLeidingLijst] = useState<WithId<Leidingsploeg>[]>([]);
  const [geselecteerdeMijlpaal, setGeselecteerdeMijlpaal] = useState<Mijlpaal | null>(null);
  const [geselecteerdKenteken, setGeselecteerdKenteken] = useState<WithId<OrganisatieKenteken> | null>(null);
  const [geselecteerdeLeiding, setGeselecteerdeLeiding] = useState<{ takId: string; werkingsjaarStart: number } | null>(null);
  const [leidingBewerkModus, setLeidingBewerkModus] = useState(false);
  const [leidingBewerkLeden, setLeidingBewerkLeden] = useState<LidLeidingsploeg[]>([]);
  const [leidingOpslaanBezig, setLeidingOpslaanBezig] = useState(false);
  const [toevoegFormOpen, setToevoegFormOpen] = useState(false);
  const [nieuwTakId, setNieuwTakId] = useState("");
  const [nieuwJaar, setNieuwJaar] = useState(String(eindJaar));
  const [nieuwLeden, setNieuwLeden] = useState<LidLeidingsploeg[]>([]);
  const [nieuwOpslaanBezig, setNieuwOpslaanBezig] = useState(false);
  const [loading, setLoading] = useState(true);

  const totaalJaren = eindJaar - STARTJAAR + 1;
  const breedteJaren = totaalJaren * PX_PER_JAAR;
  const totaleBreedte = NAAM_KOLOM + breedteJaren;

  const scrollTopRef = useRef<HTMLDivElement | null>(null);
  const scrollLeidingRef = useRef<HTMLDivElement | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const syncBezig = useRef(false);
  const [sliderPercent, setSliderPercent] = useState(0);

  async function haalOp() {
    const [entries, kentekenLijst, mijlpalenScoutingLijst, mijlpalenGroepLijst, takLijst, leidingData] = await Promise.all([
      EntryFactory.getPublished(groep.id),
      groep.organisatieId ? OrganisatieKentekenFactory.getAll(groep.organisatieId) : Promise.resolve([]),
      groep.organisatieId ? OrganisatieMijlpaalFactory.getPublished(groep.organisatieId) : Promise.resolve([]),
      GroepMijlpaalFactory.getPublished(groep.id),
      TakFactory.getAll(groep.id),
      LeidingFactory.getAll(groep.id),
    ]);

    const metJaar: EntryMetPeriode[] = [];
    const geen: WithId<Entry>[] = [];
    entries.forEach((e) => {
      const { start, end } = parsePeriodRange(e.periode);
      if (start) metJaar.push({ ...e, start, end });
      else geen.push(e);
    });
    metJaar.sort((a, b) => a.start - b.start || a.naam.localeCompare(b.naam));

    const mijlpalenSamen: Mijlpaal[] = [
      ...mijlpalenScoutingLijst.map((m) => ({ id: m.id, jaar: m.jaar, titel: m.titel, beschrijving: m.beschrijving, afbeeldingUrl: m.afbeeldingUrl, type: "scouting" as const })),
      ...mijlpalenGroepLijst.map((m) => ({ id: m.id, jaar: m.jaar, titel: m.titel, beschrijving: m.beschrijving, afbeeldingUrl: m.afbeeldingUrl, type: "groep" as const })),
    ];

    return {
      rijen: metJaar,
      zonderJaar: geen,
      kentekens: kentekenLijst.filter((k) => k.afbeeldingUrl || k.jaarleuze),
      mijlpalen: mijlpalenSamen,
      takken: takLijst,
      leidingLijst: leidingData.filter((l) => (l.leden || []).length > 0),
    };
  }

  async function load() {
    setLoading(true);
    const data = await haalOp();
    setRijen(data.rijen);
    setZonderJaar(data.zonderJaar);
    setKentekens(data.kentekens);
    setMijlpalen(data.mijlpalen);
    setTakken(data.takken);
    setLeidingLijst(data.leidingLijst);
    if (!nieuwTakId && data.takken.length > 0) setNieuwTakId(data.takken[0].id);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    haalOp().then((data) => {
      if (!actief) return;
      setRijen(data.rijen);
      setZonderJaar(data.zonderJaar);
      setKentekens(data.kentekens);
      setMijlpalen(data.mijlpalen);
      setTakken(data.takken);
      setLeidingLijst(data.leidingLijst);
      if (data.takken.length > 0) setNieuwTakId((prev) => prev || data.takken[0].id);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groep.id, groep.organisatieId]);

  const pixelFor = (jaar: number) => NAAM_KOLOM + (jaar - STARTJAAR) * PX_PER_JAAR;
  const zichtbaarJaar = Math.round(STARTJAAR + (sliderPercent / 100) * (eindJaar - STARTJAAR));
  const mijlpalenScouting = mijlpalen.filter((m) => m.type === "scouting");
  const mijlpalenGroep = mijlpalen.filter((m) => m.type !== "scouting");

  function tickJaren() {
    const ticks: number[] = [];
    for (let j = STARTJAAR; j <= eindJaar; j += 5) ticks.push(j);
    if (ticks[ticks.length - 1] !== eindJaar) ticks.push(eindJaar);
    return ticks;
  }

  function syncNaar(bron: HTMLDivElement | null, doelen: (HTMLDivElement | null)[]) {
    if (!bron) return;
    const max = bron.scrollWidth - bron.clientWidth;
    doelen.forEach((doel) => {
      if (doel) doel.scrollLeft = bron.scrollLeft;
    });
    setSliderPercent(max > 0 ? (bron.scrollLeft / max) * 100 : 0);
  }

  // Bewust drie losse functies i.p.v. één generieke factory die refs als
  // parameter doorgeeft: refs mogen enkel gelezen worden binnen een
  // event handler/effect, niet als functie-argument tijdens het renderen.
  function handleScrollTop() {
    if (syncBezig.current) return;
    syncBezig.current = true;
    syncNaar(scrollTopRef.current, [scrollLeidingRef.current, scrollBottomRef.current]);
    syncBezig.current = false;
  }
  function handleScrollLeiding() {
    if (syncBezig.current) return;
    syncBezig.current = true;
    syncNaar(scrollLeidingRef.current, [scrollTopRef.current, scrollBottomRef.current]);
    syncBezig.current = false;
  }
  function handleScrollBottom() {
    if (syncBezig.current) return;
    syncBezig.current = true;
    syncNaar(scrollBottomRef.current, [scrollTopRef.current, scrollLeidingRef.current]);
    syncBezig.current = false;
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const percent = Number(e.target.value);
    setSliderPercent(percent);
    [scrollTopRef.current, scrollLeidingRef.current, scrollBottomRef.current].forEach((el) => {
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft = (percent / 100) * max;
    });
  }

  function openLeidingDetail(takId: string, werkingsjaarStart: number) {
    setGeselecteerdeLeiding({ takId, werkingsjaarStart });
    setLeidingBewerkModus(false);
  }

  // Rechtstreeks naar een specifieke leidingsploeg linken, bv. vanaf het
  // activiteitenlog: /tijdlijn?leidingTak=xxx&leidingJaar=1978. De
  // setState-aanroepen gebeuren bewust binnen de setTimeout hieronder (dus
  // niet synchroon in het effect zelf), zodat React's set-state-in-effect
  // check hier niet op slaat.
  const deepLinkAfgehandeld = useRef(false);
  const leidingTakParam = searchParams.get("leidingTak");
  const leidingJaarParam = searchParams.get("leidingJaar");
  useEffect(() => {
    if (deepLinkAfgehandeld.current || loading || !leidingTakParam || !leidingJaarParam) return;
    const jaarNum = parseInt(leidingJaarParam, 10);
    if (!leidingLijst.some((l) => l.takId === leidingTakParam && l.werkingsjaarStart === jaarNum)) return;
    deepLinkAfgehandeld.current = true;
    const timer = setTimeout(() => {
      openLeidingDetail(leidingTakParam, jaarNum);
      document.getElementById("vb-leidingsploegen-vak")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, leidingTakParam, leidingJaarParam, leidingLijst]);

  function startLeidingBewerken() {
    if (!geselecteerdeLeiding) return;
    const item = leidingLijst.find((l) => l.takId === geselecteerdeLeiding.takId && l.werkingsjaarStart === geselecteerdeLeiding.werkingsjaarStart);
    setLeidingBewerkLeden(item?.leden || []);
    setLeidingBewerkModus(true);
  }

  async function leidingOpslaan() {
    if (!geselecteerdeLeiding) return;
    setLeidingOpslaanBezig(true);
    try {
      await LeidingFactory.setPublic(groep.id, geselecteerdeLeiding.takId, geselecteerdeLeiding.werkingsjaarStart, leidingBewerkLeden);
      const takNaam = takken.find((t) => t.id === geselecteerdeLeiding.takId)?.naam || "(onbekende tak)";
      await ActivityFactory.log(groep.id, {
        type: "leiding",
        actie: "Leidingsploeg bijgewerkt",
        itemId: `${geselecteerdeLeiding.takId}_${geselecteerdeLeiding.werkingsjaarStart}`,
        omschrijving: `${takNaam} ${werkingsjaarLabel(geselecteerdeLeiding.werkingsjaarStart)}`,
      });
      await load();
      setLeidingBewerkModus(false);
    } finally {
      setLeidingOpslaanBezig(false);
    }
  }

  async function nieuweLeidingOpslaan() {
    const jaarNum = parseInt(nieuwJaar, 10);
    if (!nieuwTakId || !jaarNum) return;
    setNieuwOpslaanBezig(true);
    try {
      await LeidingFactory.setPublic(groep.id, nieuwTakId, jaarNum, nieuwLeden);
      const takNaam = takken.find((t) => t.id === nieuwTakId)?.naam || "(onbekende tak)";
      await ActivityFactory.log(groep.id, {
        type: "leiding",
        actie: "Nieuwe leidingsploeg toegevoegd",
        itemId: `${nieuwTakId}_${jaarNum}`,
        omschrijving: `${takNaam} ${werkingsjaarLabel(jaarNum)}`,
      });
      await load();
      setNieuwLeden([]);
      setToevoegFormOpen(false);
    } finally {
      setNieuwOpslaanBezig(false);
    }
  }

  const geselecteerdeLeidingItem = geselecteerdeLeiding
    ? leidingLijst.find((l) => l.takId === geselecteerdeLeiding.takId && l.werkingsjaarStart === geselecteerdeLeiding.werkingsjaarStart)
    : null;
  const geselecteerdeLeidingTakNaam = geselecteerdeLeiding ? takken.find((t) => t.id === geselecteerdeLeiding.takId)?.naam || "(onbekende tak)" : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 100px" }}>
      <div style={{ textAlign: "center", margin: "28px 0 16px" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 38, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Doorheen de jaren</h1>
        <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, margin: 0 }}>
          Leden, jaarkentekens, leidingsploegen en mijlpalen sinds {STARTJAAR}
        </p>
        <Link href={`${basis}/mijlpaal-toevoegen`} style={{ display: "inline-block", marginTop: 10, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest, textDecoration: "none" }}>
          🚩 Ken jij nog een belangrijke mijlpaal? Stel ze voor →
        </Link>
      </div>

      {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && (
        <>
          <div style={{ padding: "0 4px", marginBottom: 12 }}>
            <input type="range" min="0" max="100" step="0.1" value={sliderPercent} onChange={handleSliderChange} className="vb-jaarslider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 4 }}>
              <span>{STARTJAAR}</span>
              <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.campfire }}>{zichtbaarJaar}</span>
              <span>{eindJaar}</span>
            </div>
          </div>

          <div ref={scrollTopRef} onScroll={handleScrollTop} style={{ overflowX: "auto", overflowY: "hidden", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "16px 0" }}>
            <div style={{ width: totaleBreedte, position: "relative" }}>
              <div style={{ position: "relative", height: 20, marginBottom: 10 }}>
                {tickJaren().map((jaar) => (
                  <div key={jaar} style={{ position: "absolute", left: pixelFor(jaar), transform: "translateX(-50%)", fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: colors.inkMuted, whiteSpace: "nowrap" }}>
                    {jaar}
                  </div>
                ))}
              </div>

              {kentekens.length > 0 && (
                <div style={{ position: "relative", height: 56, marginBottom: 8 }}>
                  <RijLabel>🧭 Kentekens</RijLabel>
                  {kentekens.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setGeselecteerdKenteken(k)}
                      title={`${werkingsjaarLabel(k.startJaar)}${k.jaarleuze ? ": " + k.jaarleuze : ""}`}
                      style={{ position: "absolute", left: pixelFor(k.startJaar), top: 4, width: 34, height: 34, borderRadius: "50%", overflow: "hidden", border: `2px solid ${colors.campfire}`, background: colors.white, padding: 0, cursor: "pointer" }}
                    >
                      {k.afbeeldingUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={k.afbeeldingUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {mijlpalenScouting.length > 0 && (
                <div style={{ position: "relative", height: 34 }}>
                  <RijLabel>⚜️ Scouting</RijLabel>
                  {mijlpalenScouting.map((m) => (
                    <button key={m.id} onClick={() => setGeselecteerdeMijlpaal(m)} title={m.titel} style={{ position: "absolute", left: pixelFor(m.jaar), top: 0, transform: "translateX(-50%)", background: "none", border: "none", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 2 }}>
                      ⚜️
                    </button>
                  ))}
                </div>
              )}

              {mijlpalenGroep.length > 0 && (
                <div style={{ position: "relative", height: 34 }}>
                  <RijLabel>🚩 Onze groep</RijLabel>
                  {mijlpalenGroep.map((m) => (
                    <button key={m.id} onClick={() => setGeselecteerdeMijlpaal(m)} title={m.titel} style={{ position: "absolute", left: pixelFor(m.jaar), top: 0, transform: "translateX(-50%)", background: "none", border: "none", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 2 }}>
                      🚩
                    </button>
                  ))}
                </div>
              )}

              <Jaarlijn jaar={zichtbaarJaar} startjaar={STARTJAAR} />
            </div>
          </div>

          {geselecteerdKenteken && (
            <div style={{ marginTop: 12, background: colors.paperCard, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "20px 22px", display: "flex", gap: 18, alignItems: "center" }}>
              {geselecteerdKenteken.afbeeldingUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={geselecteerdKenteken.afbeeldingUrl} alt="" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: `3px solid ${colors.campfire}`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.ink }}>{werkingsjaarLabel(geselecteerdKenteken.startJaar)}</div>
                {geselecteerdKenteken.jaarleuze && <p style={{ fontFamily: fonts.display, fontSize: 17, fontStyle: "italic", color: colors.forest, marginTop: 6 }}>&quot;{geselecteerdKenteken.jaarleuze}&quot;</p>}
              </div>
              <button onClick={() => setGeselecteerdKenteken(null)} style={{ background: "none", border: "none", fontSize: 18, color: colors.inkMuted, cursor: "pointer" }} aria-label="Sluiten">
                ✕
              </button>
            </div>
          )}

          {geselecteerdeMijlpaal && (
            <div style={{ marginTop: 12, background: colors.paperCard, border: `1.5px solid ${colors.campfire}`, borderRadius: radius.card, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              {geselecteerdeMijlpaal.afbeeldingUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={geselecteerdeMijlpaal.afbeeldingUrl} alt="" style={{ width: 80, height: 80, borderRadius: radius.card, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "inline-block",
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 700,
                    color: geselecteerdeMijlpaal.type === "scouting" ? colors.forestDark : colors.campfire,
                    background: geselecteerdeMijlpaal.type === "scouting" ? colors.campfireLight : "transparent",
                    border: geselecteerdeMijlpaal.type === "scouting" ? "none" : `1px solid ${colors.campfire}`,
                    borderRadius: radius.badge,
                    padding: "2px 10px",
                    marginBottom: 6,
                  }}
                >
                  {geselecteerdeMijlpaal.type === "scouting" ? "⚜️ Scouting-mijlpaal" : "🚩 Mijlpaal van onze groep"}
                </div>
                <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.ink }}>
                  {geselecteerdeMijlpaal.jaar} — {geselecteerdeMijlpaal.titel}
                </div>
                {geselecteerdeMijlpaal.beschrijving && <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 1.5 }}>{geselecteerdeMijlpaal.beschrijving}</p>}
              </div>
              <button onClick={() => setGeselecteerdeMijlpaal(null)} style={{ background: "none", border: "none", fontSize: 18, color: colors.inkMuted, cursor: "pointer" }} aria-label="Sluiten">
                ✕
              </button>
            </div>
          )}

          {takken.length > 0 && (
            <div id="vb-leidingsploegen-vak" style={{ marginTop: 12, background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "0 16px 12px" }}>
                <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.ink }}>Leidingsploegen per tak</div>
                <button onClick={() => setToevoegFormOpen((v) => !v)} style={{ padding: "6px 14px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {toevoegFormOpen ? "Sluiten" : "+ Leidingsploeg toevoegen"}
                </button>
              </div>

              {toevoegFormOpen && (
                <div style={{ margin: "0 16px 14px", padding: "14px 16px", background: colors.campfireLight, border: `1.5px dashed ${colors.campfire}`, borderRadius: radius.card, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={miniLabelStyle}>Tak</label>
                      <select value={nieuwTakId} onChange={(e) => setNieuwTakId(e.target.value)} style={inputStyle}>
                        {takken.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.naam}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={miniLabelStyle}>Startjaar werkingsjaar</label>
                      <input type="number" min={STARTJAAR} value={nieuwJaar} onChange={(e) => setNieuwJaar(e.target.value)} style={{ ...inputStyle, width: 120 }} />
                    </div>
                  </div>
                  <div>
                    <label style={miniLabelStyle}>Leiding</label>
                    <MemberTagPicker groepId={groep.id} value={nieuwLeden} onChange={setNieuwLeden} />
                  </div>
                  <button onClick={nieuweLeidingOpslaan} disabled={nieuwOpslaanBezig} style={{ alignSelf: "flex-start", padding: "8px 18px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    {nieuwOpslaanBezig ? "Bezig..." : "Opslaan"}
                  </button>
                </div>
              )}

              <div ref={scrollLeidingRef} onScroll={handleScrollLeiding} style={{ overflowX: "auto", overflowY: "hidden" }}>
                <div style={{ width: totaleBreedte, position: "relative" }}>
                  {takken.map((tak) => {
                    const items = leidingLijst.filter((l) => l.takId === tak.id);
                    return (
                      <div key={tak.id} style={{ position: "relative", height: 30 }}>
                        <RijLabel>{tak.naam}</RijLabel>
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => openLeidingDetail(tak.id, item.werkingsjaarStart)}
                            title={`${tak.naam} ${werkingsjaarLabel(item.werkingsjaarStart)}${item.goedgekeurd === false ? " (wacht op goedkeuring)" : ""}`}
                            style={{ position: "absolute", left: pixelFor(item.werkingsjaarStart), top: 7, transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: item.goedgekeurd === false ? colors.campfire : colors.forest, border: `2px solid ${colors.paperCard}`, cursor: "pointer", padding: 0 }}
                          />
                        ))}
                      </div>
                    );
                  })}
                  <Jaarlijn jaar={zichtbaarJaar} startjaar={STARTJAAR} />
                </div>
              </div>
            </div>
          )}

          {geselecteerdeLeiding && (
            <div style={{ marginTop: 12, background: colors.paperCard, border: `1.5px solid ${colors.forest}`, borderRadius: radius.card, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.ink }}>{geselecteerdeLeidingTakNaam}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{werkingsjaarLabel(geselecteerdeLeiding.werkingsjaarStart)}</div>
                  {geselecteerdeLeidingItem?.goedgekeurd === false && (
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
                </div>
                <button onClick={() => setGeselecteerdeLeiding(null)} style={{ background: "none", border: "none", fontSize: 18, color: colors.inkMuted, cursor: "pointer" }} aria-label="Sluiten">
                  ✕
                </button>
              </div>

              {!leidingBewerkModus ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {(geselecteerdeLeidingItem?.leden || []).length > 0 ? (
                      geselecteerdeLeidingItem!.leden.map((lid, i) => (
                        <span key={i} style={{ fontFamily: fonts.display, fontSize: 14, fontWeight: 600, color: colors.ink, background: colors.white, border: `1px solid ${colors.line}`, borderRadius: radius.badge, padding: "4px 12px" }}>
                          {lid.naam}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>Nog niemand ingevuld.</span>
                    )}
                  </div>
                  <button onClick={startLeidingBewerken} style={{ padding: "8px 18px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    ✏️ Bewerken
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <MemberTagPicker groepId={groep.id} value={leidingBewerkLeden} onChange={setLeidingBewerkLeden} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={leidingOpslaan} disabled={leidingOpslaanBezig} style={{ padding: "9px 20px", borderRadius: radius.badge, border: "none", background: leidingOpslaanBezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: leidingOpslaanBezig ? "default" : "pointer" }}>
                      {leidingOpslaanBezig ? "Bezig..." : "Opslaan"}
                    </button>
                    <button onClick={() => setLeidingBewerkModus(false)} style={{ padding: "9px 20px", borderRadius: radius.badge, border: `1px solid ${colors.line}`, background: "transparent", color: colors.inkMuted, fontFamily: fonts.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      Annuleren
                    </button>
                  </div>
                  <p style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, margin: 0 }}>Iedereen kan dit aanvullen of corrigeren — help mee de geschiedenis reconstrueren.</p>
                </div>
              )}
            </div>
          )}

          <div ref={scrollBottomRef} onScroll={handleScrollBottom} style={{ overflowX: "auto", overflowY: "hidden", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 0", marginTop: 12 }}>
            <div style={{ width: totaleBreedte, position: "relative", display: "flex", flexDirection: "column", gap: 6 }}>
              {rijen.map((entry) => {
                const linksPx = pixelFor(entry.start);
                const heeftEind = entry.end != null;
                const breedtePx = heeftEind ? Math.max(pixelFor(entry.end!) - linksPx, 8) : null;

                return (
                  <Link key={entry.id} href={`${basis}/entry/${entry.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ position: "relative", height: 24 }}>
                      <div
                        style={{ position: "sticky", left: 0, zIndex: 2, width: NAAM_KOLOM, paddingLeft: 12, boxSizing: "border-box", background: colors.paperCard, fontFamily: fonts.display, fontSize: 13, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", height: 24, display: "flex", alignItems: "center" }}
                        title={entry.naam}
                      >
                        {entry.naam}
                      </div>

                      {heeftEind ? (
                        <div style={{ position: "absolute", left: linksPx, width: breedtePx ?? undefined, top: 3, height: 18, background: colors.forest, borderRadius: radius.input }} />
                      ) : (
                        <div style={{ position: "absolute", left: linksPx, top: 2, height: 20, minWidth: 36, padding: "0 6px", background: colors.campfireLight, border: `1.5px dashed ${colors.campfire}`, borderRadius: radius.input, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, color: colors.campfire }}>⋯?</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
              <Jaarlijn jaar={zichtbaarJaar} startjaar={STARTJAAR} />
            </div>
          </div>
        </>
      )}

      {zonderJaar.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.inkMuted, marginBottom: 10 }}>Periode niet gekend</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {zonderJaar.map((entry) => (
              <Link key={entry.id} href={`${basis}/entry/${entry.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "12px 16px", fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.ink }}>{entry.naam}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Jaarlijn({ jaar, startjaar }: { jaar: number; startjaar: number }) {
  const left = NAAM_KOLOM + (jaar - startjaar) * PX_PER_JAAR;
  return <div style={{ position: "absolute", left, top: 0, bottom: 0, width: 1, background: colors.campfire, opacity: 0.45, pointerEvents: "none" }} />;
}

function RijLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "sticky", left: 0, zIndex: 2, width: NAAM_KOLOM, paddingLeft: 12, boxSizing: "border-box", background: colors.paperCard, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: colors.inkMuted, height: "100%", display: "flex", alignItems: "center" }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.ink,
  boxSizing: "border-box",
};

const miniLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 3,
};
