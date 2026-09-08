"use client";

import { useEffect, useState } from "react";
import { useGroep } from "@/lib/groepContext";
import { ContactFactory } from "@/lib/dbSchema";
import { colors, fonts, radius } from "@/lib/theme";
import type { ContactBericht, WithId } from "@/types/models";

export default function ContactBeheerPage() {
  const groep = useGroep();

  const [berichten, setBerichten] = useState<WithId<ContactBericht>[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setBerichten(await ContactFactory.getAll(groep.id));
    setLoading(false);
  }

  useEffect(() => {
    let actief = true;
    ContactFactory.getAll(groep.id).then((b) => {
      if (!actief) return;
      setBerichten(b);
      setLoading(false);
    });
    return () => {
      actief = false;
    };
  }, [groep.id]);

  async function handleGelezen(id: string) {
    await ContactFactory.markeerGelezen(id);
    load();
  }

  async function handleVerwijderen(id: string) {
    if (!confirm("Dit bericht verwijderen?")) return;
    await ContactFactory.remove(id);
    load();
  }

  const ongelezen = berichten.filter((b) => !b.gelezen);
  const gelezen = berichten.filter((b) => b.gelezen);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 20px" }}>Contactberichten</h1>

      {loading && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Bezig met laden...</p>}

      {!loading && ongelezen.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectieTitel kleur={colors.campfire}>Nieuw ({ongelezen.length})</SectieTitel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ongelezen.map((b) => (
              <Bericht key={b.id} bericht={b} onGelezen={() => handleGelezen(b.id)} onVerwijderen={() => handleVerwijderen(b.id)} nieuw />
            ))}
          </div>
        </div>
      )}

      <SectieTitel>Eerder gelezen ({gelezen.length})</SectieTitel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gelezen.map((b) => (
          <Bericht key={b.id} bericht={b} onVerwijderen={() => handleVerwijderen(b.id)} />
        ))}
      </div>

      {!loading && berichten.length === 0 && <p style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Nog geen contactberichten.</p>}
    </div>
  );
}

function Bericht({
  bericht,
  onGelezen,
  onVerwijderen,
  nieuw,
}: {
  bericht: WithId<ContactBericht>;
  onGelezen?: () => void;
  onVerwijderen: () => void;
  nieuw?: boolean;
}) {
  return (
    <div style={{ background: nieuw ? colors.campfireLight : colors.paperCard, border: `1.5px ${nieuw ? "dashed" : "solid"} ${nieuw ? colors.campfire : colors.line}`, borderRadius: radius.card, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.ink }}>{bericht.naam}</div>
        <a href={`mailto:${bericht.email}`} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.forest, fontWeight: 600 }}>
          {bericht.email}
        </a>
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, margin: "8px 0" }}>{bericht.bericht}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {nieuw && (
          <button onClick={onGelezen} style={btn(colors.forest)}>
            Markeer als gelezen
          </button>
        )}
        <button onClick={onVerwijderen} style={btn(colors.stamp)}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}

function SectieTitel({ children, kleur }: { children: React.ReactNode; kleur?: string }) {
  return <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: kleur || colors.inkMuted, marginBottom: 10 }}>{children}</div>;
}

function btn(color: string): React.CSSProperties {
  return { padding: "7px 14px", borderRadius: 999, border: "none", background: color, color: "#FFF", fontFamily: fonts.body, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
