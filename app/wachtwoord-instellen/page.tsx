"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { stelWachtwoordIn } from "@/lib/auth";
import { colors, fonts, fontImports, radius } from "@/lib/theme";

// Landt hier via de link in de uitnodigingsmail (zie
// app/api/systeembeheer/gebruikers/route.ts) -- Firebase voegt de
// `oobCode` toe als query-param. useSearchParams vereist een
// Suspense-grens, anders bailt Next.js de hele pagina naar CSR uit.
export default function WachtwoordInstellenPage() {
  return (
    <Suspense fallback={null}>
      <WachtwoordInstellenForm />
    </Suspense>
  );
}

function WachtwoordInstellenForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!oobCode) return;
    setFout(null);
    if (wachtwoord.length < 8) {
      setFout("Kies een wachtwoord van minstens 8 tekens.");
      return;
    }
    if (wachtwoord !== bevestiging) {
      setFout("De wachtwoorden komen niet overeen.");
      return;
    }
    setBezig(true);
    try {
      await stelWachtwoordIn(oobCode, wachtwoord);
      setKlaar(true);
      setTimeout(() => router.push("/aanmelden"), 2000);
    } catch {
      setFout("Deze link is ongeldig of verlopen. Vraag een nieuwe uitnodiging aan bij de systeembeheerder.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <link rel="stylesheet" href={fontImports} />
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: 700, color: colors.ink, marginBottom: 8 }}>
          Wachtwoord instellen
        </h1>

        {!oobCode && (
          <p style={{ fontFamily: fonts.body, color: colors.stamp }}>
            Ongeldige link. Vraag een nieuwe uitnodiging aan bij de systeembeheerder.
          </p>
        )}

        {oobCode && klaar && (
          <p style={{ fontFamily: fonts.body, color: colors.forest }}>
            ✓ Wachtwoord ingesteld. Je wordt doorgestuurd naar de aanmeldpagina...
          </p>
        )}

        {oobCode && !klaar && (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "block", fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
              Nieuw wachtwoord
              <input type="password" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} required style={inputStyle} />
            </label>
            <label style={{ display: "block", fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
              Bevestig wachtwoord
              <input type="password" value={bevestiging} onChange={(e) => setBevestiging(e.target.value)} required style={inputStyle} />
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
              {bezig ? "Bezig..." : "Wachtwoord instellen"}
            </button>
          </form>
        )}
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
