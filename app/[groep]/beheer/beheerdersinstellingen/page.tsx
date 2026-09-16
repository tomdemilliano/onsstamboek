"use client";

import { useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { GroepFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { FEEDBACK_LABELS, bepaalFeedbackTiming } from "@/lib/feedbackMail";
import type { FeedbackCategorie, FeedbackTiming } from "@/types/models";

const FEEDBACK_CATEGORIEËN: FeedbackCategorie[] = ["fiche", "wijziging", "foto", "kampplaats", "mijlpaal", "leidingsploeg"];

export default function BeheerderInstellingenPage() {
  const groep = useGroep();

  const [feedbackTiming, setFeedbackTiming] = useState<Record<FeedbackCategorie, FeedbackTiming>>(() => {
    const result = {} as Record<FeedbackCategorie, FeedbackTiming>;
    FEEDBACK_CATEGORIEËN.forEach((categorie) => {
      result[categorie] = bepaalFeedbackTiming(groep.feedbackTiming, categorie);
    });
    return result;
  });
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setOpgeslagen(false);
    try {
      await GroepFactory.update(groep.id, { feedbackTiming });
      setOpgeslagen(true);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>Beheerder instellingen</h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Instellingen voor jou als groepsbeheerder, niet publiek zichtbaar.
      </p>

      <form onSubmit={opslaan} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Veld
          label="Feedback aan indieners"
          hint={'Wanneer stuur je een mail naar wie iets indiende, na goed-/afkeuring? "Nachtelijk" bundelt alles voor dezelfde persoon in 1 mail per nacht -- handig als er bv. veel foto\'s tegelijk goedgekeurd worden.'}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FEEDBACK_CATEGORIEËN.map((categorie) => (
              <div key={categorie} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, textTransform: "capitalize" }}>{FEEDBACK_LABELS[categorie]}</span>
                <select
                  value={feedbackTiming[categorie]}
                  onChange={(e) => setFeedbackTiming((prev) => ({ ...prev, [categorie]: e.target.value as FeedbackTiming }))}
                  style={{ ...inputStyle, width: 190 }}
                >
                  <option value="onmiddellijk">Onmiddellijk</option>
                  <option value="nachtelijk">Nachtelijk (gebundeld)</option>
                </select>
              </div>
            ))}
          </div>
        </Veld>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={bezig}
            style={{ padding: "10px 22px", borderRadius: radius.badge, border: "none", background: bezig ? colors.inkMuted : colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: bezig ? "default" : "pointer" }}
          >
            {bezig ? "Bezig met opslaan..." : "Opslaan"}
          </button>
          {opgeslagen && <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.forest, fontWeight: 600 }}>✓ Opgeslagen</span>}
        </div>
      </form>
    </div>
  );
}

function Veld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontFamily: fonts.body, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.inkMuted, marginBottom: 5 }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ display: "block", fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};
