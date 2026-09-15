import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless, ondertekend afmeldtoken voor de "uitschrijven"-link onderaan
 * elke ledenmailing -- geen extra Firestore-veld nodig, en dus geen risico
 * dat een opgeslagen token verouderd/overschreven raakt. De enige echte
 * geheime waarde is `AFMELD_SECRET` zelf; met `entryId` (een niet te raden
 * Firestore-auto-ID) en dat geheim kan het token altijd identiek herrekend
 * worden, zonder databaselezing.
 */

function geheim(): string {
  const secret = process.env.AFMELD_SECRET;
  if (!secret) {
    throw new Error("AFMELD_SECRET ontbreekt -- afmeldlinks kunnen niet aangemaakt/geverifieerd worden.");
  }
  return secret;
}

export function maakAfmeldToken(groepId: string, entryId: string): string {
  return createHmac("sha256", geheim()).update(`${groepId}:${entryId}`).digest("hex");
}

/** Vergelijkt met `timingSafeEqual` i.p.v. `===`, om een timing-aanval op het token te voorkomen. */
export function verifieerAfmeldToken(groepId: string, entryId: string, token: string): boolean {
  try {
    const verwacht = Buffer.from(maakAfmeldToken(groepId, entryId), "hex");
    const gegeven = Buffer.from(token, "hex");
    if (verwacht.length !== gegeven.length) return false;
    return timingSafeEqual(verwacht, gegeven);
  } catch {
    return false;
  }
}
