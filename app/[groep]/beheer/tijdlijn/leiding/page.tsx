"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { TakFactory, LeidingFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { huidigWerkingsjaarStart, werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import AdminSubNav from "@/components/AdminSubNav";
import MemberTagPicker from "@/components/MemberTagPicker";
import type { Leidingsploeg, LidLeidingsploeg, ScoutTak, WithId } from "@/types/models";

export default function LeidingPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();

  const [takken, setTakken] = useState<WithId<ScoutTak>[]>([]);
  const [leidingLijst, setLeidingLijst] = useState<WithId<Leidingsploeg>[]>([]);
  const [loading, setLoading] = useState(true);

  const [takId, setTakId] = useState("");
  const [werkingsjaar, setWerkingsjaar] = useState(String(huidigWerkingsjaarStart()));
  const [leden, setLeden] = useState<LidLeidingsploeg[]>([]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [t, l] = await Promise.all([TakFactory.getAll(groep.id), LeidingFactory.getAll(groep.id)]);
    setTakken(t);
    setLeidingLijst(l);
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    Promise.all([TakFactory.getAll(groep.id), LeidingFactory.getAll(groep.id)]).then(([t, l]) => {
      if (!actief) return;
      setTakken(t);
      setLeidingLijst(l);
      setTakId((prev) => prev || (t.length > 0 ? t[0].id : ""));
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const tabs = [
    { href: `${basis}/beheer/tijdlijn`, label: "🚩 Mijlpalen", exact: true },
    { href: `${basis}/beheer/tijdlijn/takken`, label: "👥 Takken" },
    { href: `${basis}/beheer/tijdlijn/leiding`, label: "Leidingsploegen" },
  ];

  // Vanuit het activiteitenlog rechtstreeks naar de betrokken leidingsploeg
  // springen: laadt 'm meteen in het bewerkformulier.
  const takParam = searchParams.get("tak");
  const jaarParam = searchParams.get("jaar");
  useEffect(() => {
    if (loading || !takParam || !jaarParam) return;
    const jaarNum = parseInt(jaarParam, 10);
    const item = leidingLijst.find((l) => l.takId === takParam && l.werkingsjaarStart === jaarNum);
    if (!item) return;
    const timer = setTimeout(() => bewerken(item), 0);
    return () => clearTimeout(timer);
  }, [loading, takParam, jaarParam, leidingLijst]);

  async function handleOpslaan() {
    setFout(null);
    const jaarNum = parseInt(werkingsjaar, 10);
    if (!takId) {
      setFout('Kies eerst een tak (maak er eventueel eerst één aan via het tabblad "Takken").');
      return;
    }
    if (!jaarNum || jaarNum < 1900) {
      setFout("Vul een geldig startjaar in.");
      return;
    }
    setBezig(true);
    try {
      await LeidingFactory.set(groep.id, takId, jaarNum, leden);
      setLeden([]);
      await load();
    } finally {
      setBezig(false);
    }
  }

  function bewerken(item: WithId<Leidingsploeg>) {
    setTakId(item.takId);
    setWerkingsjaar(String(item.werkingsjaarStart));
    setLeden(item.leden || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function verwijderen(item: WithId<Leidingsploeg>) {
    const takNaam = takken.find((t) => t.id === item.takId)?.naam || item.takId;
    if (!confirm(`Leidingsploeg ${takNaam} ${werkingsjaarLabel(item.werkingsjaarStart)} verwijderen?`)) return;
    await LeidingFactory.remove(groep.id, item.takId, item.werkingsjaarStart);
    load();
  }

  async function goedkeuren(item: WithId<Leidingsploeg>) {
    await LeidingFactory.keurGoed(groep.id, item.takId, item.werkingsjaarStart);
    load();
  }

  const goedTeKeuren = leidingLijst.filter((item) => item.goedgekeurd === false);

  const perJaar: Record<number, WithId<Leidingsploeg>[]> = {};
  leidingLijst.forEach((item) => {
    if (!perJaar[item.werkingsjaarStart]) perJaar[item.werkingsjaarStart] = [];
    perJaar[item.werkingsjaarStart].push(item);
  });
  const jaren = Object.keys(perJaar)
    .map((j) => parseInt(j, 10))
    .sort((a, b) => b - a);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Tijdlijn</h1>
      <AdminSubNav tabs={tabs} />

      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Leidingsploegen</h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>De leidingsploeg per tak, per werkingsjaar. Vul een bestaande combinatie opnieuw in om ze te overschrijven/bewerken.</p>

      {goedTeKeuren.length > 0 && (
        <p style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.campfire, marginTop: -12, marginBottom: 20 }}>
          ⏳ {goedTeKeuren.length} leidingsploeg{goedTeKeuren.length === 1 ? "" : "en"} wacht{goedTeKeuren.length === 1 ? "" : "en"} op goedkeuring -- door een bezoeker aangevuld/gecorrigeerd.
        </p>
      )}

      {takken.length === 0 && !loading && <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.stamp, marginBottom: 16 }}>Er zijn nog geen takken aangemaakt — ga eerst naar het tabblad &quot;Takken&quot;.</p>}

      <div style={{ background: colors.paperCard, border: `1.5px dashed ${colors.line}`, borderRadius: radius.card, padding: "18px 20px", marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Tak</label>
            <select value={takId} onChange={(e) => setTakId(e.target.value)} style={inputStyle}>
              {takken.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.naam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Startjaar werkingsjaar</label>
            <input type="number" value={werkingsjaar} onChange={(e) => setWerkingsjaar(e.target.value)} style={{ ...inputStyle, width: 120 }} />
            {werkingsjaar && !isNaN(parseInt(werkingsjaar, 10)) && <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 3 }}>= {werkingsjaarLabel(parseInt(werkingsjaar, 10))}</div>}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Leiding</label>
          <MemberTagPicker groepId={groep.id} value={leden} onChange={setLeden} />
        </div>

        {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}

        <button onClick={handleOpslaan} disabled={bezig} style={{ ...btn(colors.forest), alignSelf: "flex-start" }}>
          {bezig ? "Bezig..." : "Opslaan"}
        </button>
      </div>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {jaren.map((jaar) => (
        <div key={jaar} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.forestDark, marginBottom: 8 }}>{werkingsjaarLabel(jaar)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {perJaar[jaar].map((item) => {
              const takNaam = takken.find((t) => t.id === item.takId)?.naam || "(onbekende tak)";
              const wachtOpGoedkeuring = item.goedgekeurd === false;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: wachtOpGoedkeuring ? colors.campfireLight : colors.paperCard,
                    border: `1.5px ${wachtOpGoedkeuring ? "dashed" : "solid"} ${wachtOpGoedkeuring ? colors.campfire : colors.line}`,
                    borderRadius: radius.card,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: colors.ink, minWidth: 100 }}>{takNaam}</span>
                  <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted }}>{(item.leden || []).map((l) => l.naam).join(", ") || <em>geen leiding ingevuld</em>}</span>
                  {wachtOpGoedkeuring && (
                    <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: colors.campfire }}>⏳ Wacht op goedkeuring</span>
                  )}
                  {wachtOpGoedkeuring && (
                    <button onClick={() => goedkeuren(item)} style={btn(colors.forest)}>
                      Goedkeuren
                    </button>
                  )}
                  <button onClick={() => bewerken(item)} style={btn(colors.inkMuted)}>
                    Bewerken
                  </button>
                  <button onClick={() => verwijderen(item)} style={btn(colors.stamp)}>
                    Verwijderen
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!loading && jaren.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen leidingsploegen ingevuld.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 600,
  color: colors.inkMuted,
  marginBottom: 3,
};

function btn(color: string): React.CSSProperties {
  return { padding: "8px 16px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}
