import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { haalDeelkaartData } from "@/lib/deelkaartData";
import { colors, fonts, radius } from "@/lib/theme";
import DeelKnoppen from "@/components/DeelKnoppen";

async function haalOpgevraagdeData(groepSlug: string, id: string) {
  const data = await haalDeelkaartData(id);
  if (!data || data.groep.slug !== groepSlug) return null;
  return data;
}

export async function generateMetadata(props: PageProps<"/[groep]/entry/[id]/kaart">): Promise<Metadata> {
  const { groep: groepSlug, id } = await props.params;
  const data = await haalOpgevraagdeData(groepSlug, id);
  if (!data) return {};

  const titel = `De Stamboek-kaart van ${data.entry.naam} — ${data.groep.naam}`;
  const beschrijving = `Herontdek ${data.entry.naam} se herinneringen bij ${data.groep.naam} op Ons Stamboek.`;
  const kaartUrl = `/api/deelkaart/${id}`;

  return {
    title: titel,
    description: beschrijving,
    openGraph: {
      title: titel,
      description: beschrijving,
      images: [{ url: kaartUrl, width: 1080, height: 1080 }],
    },
    twitter: {
      card: "summary_large_image",
      title: titel,
      description: beschrijving,
      images: [kaartUrl],
    },
  };
}

export default async function DeelkaartPage(props: PageProps<"/[groep]/entry/[id]/kaart">) {
  const { groep: groepSlug, id } = await props.params;
  const data = await haalOpgevraagdeData(groepSlug, id);
  if (!data) notFound();
  const { entry, groep } = data;

  const kaartUrl = `/api/deelkaart/${id}`;
  const basis = `/${groep.slug}`;
  const headerLijst = await headers();
  const host = headerLijst.get("host") || "onsstamboek.be";
  const protocol = host.includes("localhost") ? "http" : "https";
  const paginaUrl = `${protocol}://${host}${basis}/entry/${id}/kaart`;
  const deelTitel = `De Stamboek-kaart van ${entry.naam}`;
  const deelTekst = `Bekijk de Stamboek-kaart van ${entry.naam} bij ${groep.naam}!`;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px", textAlign: "center" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>
        De Stamboek-kaart van {entry.naam}
      </h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 24 }}>
        Download of deel deze kaart -- iedereen die de link opent ziet meteen deze afbeelding.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={kaartUrl}
        alt={`Stamboek-kaart van ${entry.naam}`}
        style={{ width: "100%", maxWidth: 480, aspectRatio: "1 / 1", borderRadius: radius.card, border: `1px solid ${colors.line}`, marginBottom: 24 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <a
          href={kaartUrl}
          download={`stamboek-kaart-${entry.naam}.png`}
          style={{
            padding: "10px 22px",
            borderRadius: radius.badge,
            background: colors.forest,
            color: colors.white,
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          ⬇️ Downloaden
        </a>

        <DeelKnoppen url={paginaUrl} titel={deelTitel} tekst={deelTekst} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${deelTekst} ${paginaUrl}`)}`} target="_blank" rel="noopener noreferrer" style={deelLinkStyle}>
            WhatsApp
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(paginaUrl)}`} target="_blank" rel="noopener noreferrer" style={deelLinkStyle}>
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(deelTekst)}&url=${encodeURIComponent(paginaUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={deelLinkStyle}
          >
            X
          </a>
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 18 }}>
        <Link href={`${basis}/entry/${id}`} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "underline" }}>
          ← Terug naar de fiche
        </Link>
        <Link href={basis} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "underline" }}>
          Naar {groep.naam}
        </Link>
      </div>
    </div>
  );
}

const deelLinkStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: radius.badge,
  border: `1px solid ${colors.line}`,
  background: colors.paperCard,
  color: colors.ink,
  fontFamily: fonts.body,
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "none",
};
