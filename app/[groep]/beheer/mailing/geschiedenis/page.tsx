"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { MailCampagneFactory } from "@/lib/dbSchema";
import { colors, fonts } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import MailCampagneKaart, { badgeStijl } from "@/components/MailCampagneKaart";
import type { MailCampagne, WithId } from "@/types/models";

export default function MailingGeschiedenisPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [verzonden, setVerzonden] = useState<WithId<MailCampagne>[]>([]);
  const [aantalConcepten, setAantalConcepten] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    MailCampagneFactory.getAll(groep.id).then((campagnes) => {
      if (!actief) return;
      setVerzonden(campagnes.filter((c) => c.status === "verzonden"));
      setAantalConcepten(campagnes.filter((c) => c.status === "concept").length);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/concepten`, label: "Concepten", count: aantalConcepten },
    { href: `${basis}/beheer/mailing/ontvangers`, label: "Ontvangers" },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Mailing</h1>
      <AdminSubNav tabs={tabs} />

      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>Eerder verstuurde ledenmailings, nieuwste eerst.</p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {verzonden.map((campagne) => (
          <MailCampagneKaart
            key={campagne.id}
            campagne={campagne}
            footer={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={badgeStijl(colors.forestDark, colors.paper)}>{campagne.aantalVerzonden} verzonden</span>
                {campagne.aantalMislukt > 0 && <span style={badgeStijl(colors.stamp, colors.campfireLight)}>{campagne.aantalMislukt} mislukt</span>}
                <span style={badgeStijl(colors.inkMuted, colors.paper)}>{campagne.doelgroep === "selectie" ? "Selectie" : "Iedereen"}</span>
              </div>
            }
          />
        ))}
      </div>

      {!loading && verzonden.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen mailings verstuurd.</p>}
    </div>
  );
}
