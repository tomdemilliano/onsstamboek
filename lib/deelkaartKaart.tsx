// JSX-boom voor de "Mijn Stamboek-kaart"-afbeelding (zie
// app/api/deelkaart/[entryId]/route.ts) -- in een apart .tsx-bestand,
// want Next.js Route Handlers moeten .ts/.js heten en kunnen dus zelf
// geen JSX-syntax bevatten.
//
// Belangrijke beperking van ImageResponse/satori (de renderer achter
// next/og): geen React-hooks en geen SVG <pattern>/<defs>-fills in de
// gerenderde boom. De bestaande components/DasIcon.tsx gebruikt beide en
// kan hier dus niet hergebruikt worden -- de das hieronder wordt daarom
// als 2 effen kleurvlakken getekend, niet als het gestreepte icoon.

import { colors } from "@/lib/theme";
import { werkingsjaarLabel } from "@/lib/tijdlijnUtils";
import { toDisplayArray } from "@/lib/textUtils";
import { isDagVanDeJeugdbewegingActief } from "@/lib/campagne";
import type { DeelkaartData } from "@/lib/deelkaartData";

export const KAART_MAAT = 1080;

function LeidingLijst({ leiding }: { leiding: DeelkaartData["leiding"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {leiding.slice(0, 3).map((l, i) => (
        <div key={i} style={{ display: "flex", fontFamily: "Work Sans", fontSize: 24, fontWeight: 600, color: colors.forestDark }}>
          👥 Leiding: {l.takNaam} ({werkingsjaarLabel(l.werkingsjaarStart)})
        </div>
      ))}
    </div>
  );
}

function Polaroid({ url, rotatie }: { url: string; rotatie: number }) {
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          display: "flex",
          background: colors.white,
          paddingTop: 12,
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 40,
          borderRadius: 4,
          boxShadow: "0 8px 18px rgba(44, 36, 25, 0.28)",
          transform: `rotate(${rotatie}deg)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" width={190} height={190} style={{ objectFit: "cover", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function FunFactChip({ icon, label, waarde }: { icon: string; label: string; waarde: string }) {
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: colors.paperCard,
          border: `1.5px solid ${colors.line}`,
          borderRadius: 999,
          padding: "10px 18px",
          fontFamily: "Work Sans",
          fontSize: 20,
          color: colors.ink,
        }}
      >
        <span>{icon}</span>
        <span style={{ color: colors.inkMuted }}>{label}:</span>
        <span style={{ fontWeight: 600 }}>{waarde}</span>
      </div>
    </div>
  );
}

export function DeelkaartElement({ data, brandingAfbeelding }: { data: DeelkaartData; brandingAfbeelding: string }) {
  const { entry, groep, gebruiktDas, leiding, fotoUrls, fotoAantal, fotoVroegsteJaar, fotoLaatsteJaar } = data;

  const funFacts: { icon: string; label: string; waarde: string }[] = [];
  const leukste = toDisplayArray(entry.leuksteActiviteit)[0];
  if (leukste) funFacts.push({ icon: "🎉", label: "Leukste activiteit", waarde: leukste });
  const kampplaats = toDisplayArray(entry.besteKampplaats)[0];
  if (kampplaats) funFacts.push({ icon: "🏕️", label: "Beste kampplaats", waarde: kampplaats });
  const eten = toDisplayArray(entry.lekkersteEten)[0];
  if (eten) funFacts.push({ icon: "🍽️", label: "Lekkerste eten", waarde: eten });

  const periodeRegel = entry.periode?.trim() || (entry.geboortejaar ? `geboren in ${entry.geboortejaar}` : null);

  return (
    <div
      style={{
        width: KAART_MAAT,
        height: KAART_MAAT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: colors.paper,
        fontFamily: "Work Sans",
      }}
    >
      {/* Decoratief Ons Stamboek-beeldmerk als achtergrond-watermerk -- zelfde
          gevoel als op de platform-landingspagina (app/page.tsx). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brandingAfbeelding} alt="" width={620} height={620} style={{ position: "absolute", right: -80, bottom: -80, opacity: 0.14 }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 56, gap: 22 }}>
        {/* Header: groepslogo + groepsnaam + das-strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {groep.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={groep.logoUrl} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} />
          )}
          <span style={{ fontFamily: "Work Sans", fontSize: 28, fontWeight: 600, color: colors.forestDark, textTransform: "uppercase", letterSpacing: 1 }}>
            {groep.naam}
          </span>
          {gebruiktDas && groep.dasKleur1 && groep.dasKleur2 && (
            <div style={{ display: "flex", marginLeft: "auto", borderRadius: 6, overflow: "hidden", boxShadow: `0 0 0 2px ${colors.ink}` }}>
              <div style={{ display: "flex", width: 22, height: 34, background: groep.dasKleur1 }} />
              <div style={{ display: "flex", width: 22, height: 34, background: groep.dasKleur2 }} />
            </div>
          )}
        </div>

        {/* Naam */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "Fraunces", fontSize: 64, fontWeight: 700, color: colors.ink, lineHeight: 1.05 }}>{entry.naam}</span>
          {entry.totemnaam && (
            <span style={{ fontFamily: "Work Sans", fontSize: 30, fontWeight: 600, color: colors.campfire }}>&quot;{entry.totemnaam}&quot;</span>
          )}
          {periodeRegel && <span style={{ fontFamily: "Work Sans", fontSize: 26, color: colors.inkMuted }}>{periodeRegel}</span>}
        </div>

        {/* Leiding-geschiedenis (indien aanwezig) */}
        {leiding.length > 0 && <LeidingLijst leiding={leiding} />}

        {/* Foto's in polaroidstijl + nostalgiestat */}
        {fotoUrls.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 4 }}>
            <div style={{ display: "flex", gap: 22 }}>
              {fotoUrls.map((url, i) => (
                <Polaroid key={url} url={url} rotatie={i % 2 === 0 ? -4 : 3} />
              ))}
            </div>
            <span style={{ fontFamily: "Work Sans", fontSize: 22, color: colors.inkMuted, display: "flex" }}>
              📷 Te zien op {fotoAantal} foto{fotoAantal === 1 ? "" : "'s"}
              {fotoVroegsteJaar && fotoLaatsteJaar ? `, van ${fotoVroegsteJaar} tot ${fotoLaatsteJaar}` : ""}
            </span>
          </div>
        )}

        {/* Fun facts */}
        {funFacts.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            {funFacts.map((f) => (
              <FunFactChip key={f.label} icon={f.icon} label={f.label} waarde={f.waarde} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 6 }}>
          {isDagVanDeJeugdbewegingActief() && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: colors.stamp,
                color: colors.white,
                fontFamily: "Work Sans",
                fontSize: 18,
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: 999,
                marginBottom: 4,
              }}
            >
              🎉 Dag van de Jeugdbeweging
            </div>
          )}
          <span style={{ fontFamily: "Work Sans", fontSize: 24, fontWeight: 600, color: colors.forestDark, display: "flex" }}>
            Ons Stamboek · onsstamboek.be
          </span>
        </div>
      </div>
    </div>
  );
}
