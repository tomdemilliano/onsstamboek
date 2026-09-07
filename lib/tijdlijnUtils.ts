/**
 * Haalt start- én eindjaar uit een vrije-tekst periode-veld zoals
 * "1952 - 1955" of "ongeveer 1978". Als er maar één jaartal gevonden
 * wordt, is end null (open periode).
 */
export function parsePeriodRange(periode?: string | null): { start: number | null; end: number | null } {
  if (!periode) return { start: null, end: null };
  const matches = [...periode.matchAll(/(19|20)\d{2}/g)].map((m) => parseInt(m[0], 10));
  if (matches.length === 0) return { start: null, end: null };
  if (matches.length === 1) return { start: matches[0], end: null };
  return { start: matches[0], end: matches[1] };
}

/**
 * Het huidige werkingsjaar van de scouts (start in september, loopt tot
 * augustus het jaar erna). Geeft het startjaar terug, bv. 2025 voor
 * werkingsjaar "2025-2026".
 */
export function huidigWerkingsjaarStart(): number {
  const nu = new Date();
  const maand = nu.getMonth() + 1;
  return maand >= 9 ? nu.getFullYear() : nu.getFullYear() - 1;
}

export function werkingsjaarLabel(startJaar: number): string {
  return `${startJaar}–${startJaar + 1}`;
}
