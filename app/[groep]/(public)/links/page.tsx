"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { LinkFactory } from "@/lib/dbSchema";
import { colors, fonts, fontImports, radius } from "@/lib/theme";
import type { Link as GroepLink, WithId } from "@/types/models";

export default function LinksPage() {
  const groep = useGroep();

  const [links, setLinks] = useState<WithId<GroepLink>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    LinkFactory.getAll(groep.id).then((l) => {
      if (!actief) return;
      setLinks(l);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 100px" }}>
        <div style={{ textAlign: "center", margin: "28px 0 32px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 38, fontWeight: 700, color: colors.ink, margin: "0 0 8px" }}>Handige links</h1>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted }}>Nog wat plekjes die het bezoeken waard zijn</p>
        </div>

        {loading && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "18px 20px" }}>
                <div style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.forest }}>{link.naam} ↗</div>
                {link.omschrijving && <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginTop: 4 }}>{link.omschrijving}</div>}
              </div>
            </a>
          ))}
        </div>

        {!loading && links.length === 0 && <p style={{ textAlign: "center", fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen links toegevoegd.</p>}
      </div>
    </div>
  );
}
