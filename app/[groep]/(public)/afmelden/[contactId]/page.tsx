"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, fontImports, radius } from "@/lib/theme";

export default function AfmeldenPage(props: PageProps<"/[groep]/afmelden/[contactId]">) {
  const { contactId } = use(props.params);
  const groep = useGroep();
  const basis = `/${groep.slug}`;
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"wachten" | "bezig" | "klaar" | "ongeldig">(token ? "wachten" : "ongeldig");

  async function bevestig() {
    setStatus("bezig");
    try {
      const res = await fetch("/api/afmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groepId: groep.id, contactId, token }),
      });
      setStatus(res.ok ? "klaar" : "ongeldig");
    } catch {
      setStatus("ongeldig");
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px 100px" }}>
        <div style={{ textAlign: "center", background: colors.paperCard, border: `1px solid ${colors.line}`, borderRadius: radius.card, padding: "40px 32px" }}>
          {status === "wachten" && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Afmelden voor mailings</h1>
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5, margin: "0 0 20px" }}>
                Je ontvangt dan geen nieuws/activiteiten-mails meer van {groep.naam}.
              </p>
              <button
                onClick={bevestig}
                style={{ padding: "12px 24px", borderRadius: radius.badge, border: "none", background: colors.forest, color: colors.white, fontFamily: fonts.body, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Ja, meld me af
              </button>
            </>
          )}
          {status === "bezig" && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig...</p>}
          {status === "klaar" && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Je bent afgemeld</h1>
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>Je ontvangt geen mailings meer van {groep.naam}.</p>
            </>
          )}
          {status === "ongeldig" && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, color: colors.ink, margin: "0 0 10px" }}>Deze link is ongeldig</h1>
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>Probeer de link opnieuw vanuit de mail te openen, of neem contact op met de groep.</p>
            </>
          )}
          <Link
            href={basis}
            style={{ display: "inline-block", marginTop: 20, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.forest }}
          >
            → Naar {groep.naam}
          </Link>
        </div>
      </div>
    </div>
  );
}
