"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

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
    <div style={{ padding: "3rem 1.5rem", maxWidth: 360, margin: "0 auto" }}>
      <h1>Aanmelden</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          E-mailadres
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Wachtwoord
          <input
            type="password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={bezig}>
          {bezig ? "Bezig..." : "Aanmelden"}
        </button>
        {fout && <p style={{ color: "crimson" }}>{fout}</p>}
      </form>
    </div>
  );
}
