import { colors, fonts, radius } from "@/lib/theme";
import type { MailCampagne, WithId } from "@/types/models";

export function tijdstip(campagne: WithId<MailCampagne>): string {
  const seconds = (campagne as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds;
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleString("nl-BE");
}

export function badgeStijl(kleur: string, achtergrond: string): React.CSSProperties {
  return {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: kleur,
    background: achtergrond,
    borderRadius: radius.badge,
    padding: "2px 8px",
  };
}

/** Gedeelde kaartweergave van een mailing, gebruikt door zowel de Concepten- als de Geschiedenis-pagina -- enkel de `footer` (acties resp. verzendstatistieken) verschilt. */
export default function MailCampagneKaart({ campagne, footer }: { campagne: WithId<MailCampagne>; footer?: React.ReactNode }) {
  return (
    <div style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: colors.ink }}>{campagne.onderwerp || <em>(geen onderwerp)</em>}</div>
        <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{tijdstip(campagne)}</span>
      </div>

      <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, margin: "0 0 10px" }} dangerouslySetInnerHTML={{ __html: campagne.inhoud }} />

      {footer}
    </div>
  );
}
