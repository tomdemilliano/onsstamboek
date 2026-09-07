import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GROEP_COOKIE = "stamboek_groep";

/**
 * Stuurt een terugkerende bezoeker van de platform-landingspagina ("/")
 * automatisch door naar de laatst gekozen groep. Loopt bewust ENKEL op het
 * exacte pad "/" (zie matcher hieronder) -- een gedeelde link naar een
 * specifieke groep/pagina (bv. /sinteduardus/fotos/123) mag nooit omgeleid
 * worden naar een eerder gekozen, andere groep.
 */
export function proxy(request: NextRequest) {
  const groep = request.cookies.get(GROEP_COOKIE)?.value;
  if (!groep) return NextResponse.next();
  return NextResponse.redirect(new URL(`/${groep}`, request.url));
}

export const config = {
  matcher: "/",
};
