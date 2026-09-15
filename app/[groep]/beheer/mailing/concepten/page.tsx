"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { MailCampagneFactory } from "@/lib/dbSchema";
import { colors, fonts } from "@/lib/theme";
import AdminSubNav from "@/components/AdminSubNav";
import MailCampagneKaart from "@/components/MailCampagneKaart";
import type { MailCampagne, WithId } from "@/types/models";

export default function MailingConceptenPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;

  const [concepten, setConcepten] = useState<WithId<MailCampagne>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    MailCampagneFactory.getAll(groep.id).then((c) => {
      if (!actief) return;
      setConcepten(c.filter((campagne) => campagne.status === "concept"));
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  const tabs = [
    { href: `${basis}/beheer/mailing`, label: "Nieuwe mailing", exact: true },
    { href: `${basis}/beheer/mailing/concepten`, label: "Concepten", count: concepten.length },
    { href: `${basis}/beheer/mailing/ontvangers`, label: "Ontvangers" },
    { href: `${basis}/beheer/mailing/geschiedenis`, label: "Geschiedenis" },
  ];

  async function verwijderen(id: string) {
    if (!confirm("Dit concept verwijderen?")) return;
    await MailCampagneFactory.verwijderConcept(id);
    setConcepten((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Mailing</h1>
      <AdminSubNav tabs={tabs} />

      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>Nog niet verzonden mailings, nieuwste eerst.</p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {concepten.map((concept) => (
          <MailCampagneKaart
            key={concept.id}
            campagne={concept}
            footer={
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`${basis}/beheer/mailing?conceptId=${concept.id}`}
                  style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.forest, textDecoration: "underline" }}
                >
                  Bewerken/versturen
                </Link>
                <button type="button" onClick={() => verwijderen(concept.id)} style={{ background: "none", border: "none", color: colors.stamp, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Verwijderen
                </button>
              </div>
            }
          />
        ))}
      </div>

      {!loading && concepten.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen concepten bewaard.</p>}
    </div>
  );
}
