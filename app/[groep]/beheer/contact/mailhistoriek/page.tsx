"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { VerzondenMailFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import { FEEDBACK_LABELS } from "@/lib/feedbackMail";
import AdminSubNav from "@/components/AdminSubNav";
import type { VerzondenMail, WithId } from "@/types/models";

function tijdstip(mail: WithId<VerzondenMail>): string {
  const seconds = (mail as unknown as { createdAt?: { seconds: number } }).createdAt?.seconds;
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleString("nl-BE");
}

export default function MailhistoriekPage() {
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const tabs = [
    { href: `${basis}/beheer/contact`, label: "Contactberichten", exact: true },
    { href: `${basis}/beheer/contact/mailhistoriek`, label: "Mailhistoriek" },
  ];

  const [mails, setMails] = useState<WithId<VerzondenMail>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actief = true;
    VerzondenMailFactory.getAll(groep.id).then((m) => {
      if (!actief) return;
      setMails(m);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Contact</h1>
      <AdminSubNav tabs={tabs} />

      <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 20 }}>
        Alle automatisch verstuurde feedback- en notificatiemails, telkens 3 maanden bewaard.
      </p>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mails.map((mail) => (
          <div key={mail.id} style={{ background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: mail.soort === "feedback" ? colors.forestDark : colors.campfire,
                    background: mail.soort === "feedback" ? colors.paper : colors.campfireLight,
                    borderRadius: radius.badge,
                    padding: "2px 8px",
                  }}
                >
                  {mail.soort === "feedback" ? "Feedback aan indiener" : "Notificatie aan beheerder"}
                </span>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: colors.inkMuted,
                  }}
                >
                  {mail.type === "onmiddellijk" ? "Onmiddellijk" : "Nachtelijk"}
                </span>
              </div>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted }}>{tijdstip(mail)}</span>
            </div>

            <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: colors.ink, marginBottom: 2 }}>{mail.onderwerp}</div>
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.forest, marginBottom: 8 }}>Naar: {mail.ontvanger}</div>
            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, whiteSpace: "pre-line", margin: 0 }}>{mail.inhoud}</p>

            {mail.categorieën.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {mail.categorieën.map((categorie) => (
                  <span
                    key={categorie}
                    style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, border: `1px solid ${colors.line}`, borderRadius: radius.badge, padding: "2px 9px" }}
                  >
                    {FEEDBACK_LABELS[categorie]}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && mails.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen mails verstuurd.</p>}
    </div>
  );
}
