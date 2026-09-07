"use client";

import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";

// Publieke weergave van de groep-info. Bewust ZONDER de persoonlijke
// contactgegevens van de sitebeheerder zelf -- enkel het algemene
// groepscontact (zie beheer/instellingen voor wat daar wel/niet ingevuld
// wordt).
export default function OverDeGroep() {
  const groep = useGroep();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 100px" }}>
      <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "36px 32px" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 700, color: colors.ink, margin: "0 0 12px" }}>Over {groep.naam}</h1>
        {groep.gemeente && <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, margin: "0 0 6px" }}>{groep.gemeente}</p>}
        {groep.oprichtingsjaar && <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, margin: "0 0 6px" }}>Opgericht in {groep.oprichtingsjaar}</p>}
        {groep.contactEmail && (
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.ink, margin: "16px 0 0" }}>
            Contact: <a href={`mailto:${groep.contactEmail}`} style={{ color: colors.forest, fontWeight: 600 }}>{groep.contactEmail}</a>
          </p>
        )}
      </div>
    </div>
  );
}
