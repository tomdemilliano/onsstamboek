/**
 * Vergelijkt vrij ingetypte namen (bv. bij het taggen van een foto) met
 * reeds gekende leden, om te vermijden dat eenzelfde persoon met een kleine
 * schrijffout of een onvolledige naam telkens opnieuw als nieuw lid
 * aangemaakt wordt in plaats van teruggevonden.
 */

function normaliseerNaam(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Standaard Levenshtein-editafstand (aantal invoegingen/verwijderingen/vervangingen om a in b om te zetten). */
function levenshteinAfstand(a: string, b: string): number {
  const rijen = a.length + 1;
  const kolommen = b.length + 1;
  const matrix: number[][] = Array.from({ length: rijen }, () => new Array(kolommen).fill(0));
  for (let i = 0; i < rijen; i++) matrix[i][0] = i;
  for (let j = 0; j < kolommen; j++) matrix[0][j] = j;
  for (let i = 1; i < rijen; i++) {
    for (let j = 1; j < kolommen; j++) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + kost);
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Zoekt onder `kandidaten` welke namen gelijkaardig zijn aan `naam` -- een
 * kleine schrijffout (editafstand binnen ~30% van de langste van de twee
 * namen), of de ene naam die letterlijk in de andere voorkomt (bv. enkel de
 * voornaam ingetypt terwijl het lid met voor- en achternaam gekend is).
 * Retourneert de beste match eerst, en bevat bewust GEEN exacte match --
 * die wordt elders al automatisch (zonder te vragen) gekoppeld.
 */
export function vindGelijkaardigeNamen<T extends { naam: string }>(naam: string, kandidaten: T[], maxAantal = 5): T[] {
  const genormaliseerd = normaliseerNaam(naam);
  if (!genormaliseerd) return [];

  return kandidaten
    .map((kandidaat) => {
      const kNaam = normaliseerNaam(kandidaat.naam);
      if (!kNaam || kNaam === genormaliseerd) return null;

      const kortsteLengte = Math.min(genormaliseerd.length, kNaam.length);
      const bevatElkaar = kortsteLengte >= 3 && (kNaam.includes(genormaliseerd) || genormaliseerd.includes(kNaam));
      const afstand = levenshteinAfstand(genormaliseerd, kNaam);
      const drempel = Math.max(2, Math.floor(Math.max(genormaliseerd.length, kNaam.length) * 0.3));

      if (bevatElkaar) return { kandidaat, score: afstand - 0.5 };
      if (afstand <= drempel) return { kandidaat, score: afstand };
      return null;
    })
    .filter((resultaat): resultaat is { kandidaat: T; score: number } => resultaat !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxAantal)
    .map((resultaat) => resultaat.kandidaat);
}

/** Splitst een invoerveld op komma's en puntkomma's -- vaak typen mensen "Jan, Piet, Klaas" in één keer in plaats van elke naam apart toe te voegen. */
export function splitsNamen(invoer: string): string[] {
  return invoer
    .split(/[,;]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * Geeft de naam van een getagd lid (foto- of leidingsploeg-tag) weer.
 * `naam` op de tag zelf is een kopie van het moment van taggen, die
 * verouderd raakt zodra de fiche nadien hernoemd wordt -- dus wanneer de
 * tag gekoppeld is aan een fiche (`entryId`), heeft de actuele naam uit
 * `namen` (zie EntryFactory.getNamenMap) altijd voorrang. De bevroren
 * `naam` blijft enkel de fallback voor een (zeldzame) tag zonder koppeling.
 */
export function weergaveNaam(tag: { naam: string; entryId?: string | null }, namen: Map<string, string>): string {
  return (tag.entryId && namen.get(tag.entryId)) || tag.naam;
}
