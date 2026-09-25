// Genereert de deelbare "Mijn Stamboek-kaart" (1080x1080 PNG) voor een
// vriendenboekje-fiche -- gebruikt zowel als og:image (zie
// app/[groep]/(public)/entry/[id]/kaart/page.tsx) als voor de "Downloaden"-
// knop op diezelfde pagina. Publiek, geen auth: alle getoonde data is al
// onvoorwaardelijk publiek leesbaar op de bestaande fiche-pagina (zie
// lib/deelkaartData.ts). De eigenlijke JSX-boom staat in lib/deelkaartKaart.tsx
// (Route Handlers moeten .ts/.js heten en kunnen dus zelf geen JSX bevatten).
//
// ImageResponse aanvaardt geen Google Fonts-stylesheet-link (zoals
// lib/theme.ts se fontImports), enkel binaire fontdata -- vandaar de lokaal
// gebundelde .ttf-bestanden onder assets/fonts/ (eenmalig geïnstantieerd uit
// de variabele Fraunces/Work Sans-lettertypen van Google Fonts, want satori
// ondersteunt geen variabele fonts).

import { readFile } from "fs/promises";
import path from "path";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { haalDeelkaartData } from "@/lib/deelkaartData";
import { DeelkaartElement, KAART_MAAT } from "@/lib/deelkaartKaart";

export const runtime = "nodejs";

const fontsPromise = Promise.all([
  readFile(path.join(process.cwd(), "assets/fonts/Fraunces-Bold.ttf")),
  readFile(path.join(process.cwd(), "assets/fonts/WorkSans-Regular.ttf")),
  readFile(path.join(process.cwd(), "assets/fonts/WorkSans-SemiBold.ttf")),
]);

const brandingAfbeeldingPromise = readFile(path.join(process.cwd(), "public/onsstamboek_logo_no_text.png")).then(
  (buf) => `data:image/png;base64,${buf.toString("base64")}`
);

export async function GET(_request: Request, ctx: RouteContext<"/api/deelkaart/[entryId]">) {
  const { entryId } = await ctx.params;
  const data = await haalDeelkaartData(entryId);
  if (!data) {
    return new Response("Kaart niet gevonden.", { status: 404 });
  }

  const [[fraunces, workSansRegular, workSansSemiBold], brandingAfbeelding] = await Promise.all([fontsPromise, brandingAfbeeldingPromise]);

  return new ImageResponse(createElement(DeelkaartElement, { data, brandingAfbeelding }), {
    width: KAART_MAAT,
    height: KAART_MAAT,
    fonts: [
      { name: "Fraunces", data: fraunces, weight: 700, style: "normal" },
      { name: "Work Sans", data: workSansRegular, weight: 400, style: "normal" },
      { name: "Work Sans", data: workSansSemiBold, weight: 600, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
