// Ontvangt een base64-gecodeerde scan (afbeelding of pdf) van een
// ingescand vriendenboekje-formulier en laat Claude de handgeschreven
// velden herkennen. Vervangt pages/api/extract.js uit de oude,
// single-tenant app -- overgezet naar de Anthropic SDK (i.p.v. een losse
// fetch) met structured outputs, zodat er geen markdown/JSON-opkuis meer
// nodig is.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { ScanExtractSchema } from "@/lib/scanExtract";

const SYSTEM_PROMPT = `Dit is een ingescand, handgeschreven formulier van een oud-scoutslid dat meedeed aan een reünie.
Het formulier bevat velden (in het Nederlands, sommige met drukletters vooraf gedrukt) voor naam, geboortejaar,
totemnaam, de periode dat het lid meedeed, de plezantste activiteit, de beste kampplaats en het lekkerste kamp-eten.

Lees het handschrift zo nauwkeurig mogelijk. Corrigeer voor de hand liggende spellingsfouten niet, transcribeer
wat er letterlijk staat, maar corrigeer wel evidente OCR-achtige leesfouten in eigen namen als de context dat
logisch maakt. Een leeg veld op het formulier geef je terug als lege string (of lege array).`;

function isAllowedImageMediaType(mimeType: string): mimeType is "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Niet aangemeld." }, { status: 401 });
  }

  let uid: string;
  let systeembeheerder = false;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    systeembeheerder = decoded.systeembeheerder === true;
  } catch {
    return Response.json({ error: "Ongeldige sessie -- meld opnieuw aan." }, { status: 401 });
  }

  const { groepId, base64Data, mimeType } = (await request.json().catch(() => null)) || {};
  if (!groepId || !base64Data || !mimeType) {
    return Response.json({ error: "groepId, base64Data en mimeType zijn verplicht." }, { status: 400 });
  }

  if (!systeembeheerder) {
    const lidmaatschap = await adminDb.collection("lidmaatschappen").doc(`${uid}_${groepId}`).get();
    if (!lidmaatschap.exists) {
      return Response.json({ error: "Je bent geen beheerder van deze groep." }, { status: 403 });
    }
  }

  const isPdf = mimeType === "application/pdf";
  if (!isPdf && !isAllowedImageMediaType(mimeType)) {
    return Response.json({ error: "Enkel jpeg-, png-, gif-, webp-afbeeldingen of pdf's worden ondersteund." }, { status: 400 });
  }

  const contentBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } };

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: "Herken de velden op dit formulier." }],
        },
      ],
      output_config: { format: zodOutputFormat(ScanExtractSchema) },
    });

    if (!response.parsed_output) {
      return Response.json({ error: "Herkenning gaf geen leesbaar resultaat terug." }, { status: 502 });
    }
    return Response.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      return Response.json({ error: "Het bestand kon niet verwerkt worden." }, { status: 400 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Even geduld, te veel aanvragen tegelijk -- probeer straks opnieuw." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("extract-scan Anthropic API-fout:", err);
      return Response.json({ error: "Herkenning is mislukt, probeer opnieuw." }, { status: 502 });
    }
    console.error("extract-scan onverwachte fout:", err);
    return Response.json({ error: "Er ging iets mis bij de herkenning." }, { status: 500 });
  }
}
