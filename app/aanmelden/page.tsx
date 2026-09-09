"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { colors, fonts, fontImports, radius } from "@/lib/theme";

export default function Aanmelden() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    try {
      await login(email, wachtwoord);
      router.push("/");
    } catch {
      setFout("Aanmelden mislukt. Controleer je e-mailadres en wachtwoord.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>Aanmelden</h1>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginBottom: 24, lineHeight: 1.5 }}>
          Deze aanmeldpagina is bedoeld voor <strong>groepsbeheerders</strong> -- om het vriendenboekje, de tijdlijn,
          foto&apos;s en andere gegevens van hun groep te beheren. Was je gewoon op zoek naar een groep of foto&apos;s?
          Dat kan zonder aan te melden via de{" "}
          <Link href="/" style={{ color: colors.forest, fontWeight: 600 }}>
            groepenlijst
          </Link>
          .
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "block", fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
            E-mailadres
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </label>
          <label style={{ display: "block", fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
            Wachtwoord
            <input type="password" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} required style={inputStyle} />
          </label>
          {fout && <div style={{ color: colors.stamp, fontFamily: fonts.body, fontSize: 13 }}>{fout}</div>}
          <button
            type="submit"
            disabled={bezig}
            style={{
              padding: "10px 22px",
              borderRadius: radius.badge,
              border: "none",
              background: bezig ? colors.inkMuted : colors.forest,
              color: colors.white,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
              cursor: bezig ? "default" : "pointer",
            }}
          >
            {bezig ? "Bezig..." : "Aanmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: radius.input,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.ink,
  boxSizing: "border-box",
};
