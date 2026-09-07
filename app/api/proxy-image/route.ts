// Haalt een afbeelding server-side op en geeft ze terug als "same-origin"
// response. Nodig omdat de browser de ruwe pixels van een Firebase
// Storage-URL niet zomaar in een canvas mag inlezen (nodig om een foto te
// draaien of er een dHash van te berekenen) zonder dat de bucket daar apart
// voor geconfigureerd is.

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return Response.json({ error: "Ontbrekende url-parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "Ongeldige url" }, { status: 400 });
  }

  // Enkel Firebase Storage-URL's toelaten, zodat deze route niet als open
  // proxy voor eender welke website misbruikt kan worden.
  if (parsed.hostname !== "firebasestorage.googleapis.com") {
    return Response.json({ error: "Enkel Firebase Storage-URL's zijn toegestaan" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return Response.json({ error: "Ophalen van de afbeelding is mislukt" }, { status: response.status });
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return Response.json({ error: "Er ging iets mis bij het ophalen van de afbeelding" }, { status: 500 });
  }
}
