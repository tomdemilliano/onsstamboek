/**
 * Leidt een webadres (URL-padsegment) af van een groepsnaam: spaties en
 * andere niet-URL-vriendelijke tekens weg, kleine letters. Bewust geen
 * "technische slug" met streepjes op elke woordgrens -- gewoon de naam
 * aan elkaar geschreven, zodat een beheerder er zelf niet over hoeft na
 * te denken (kan nadien nog altijd overschreven worden).
 */
const DIACRITISCHE_TEKENS = new RegExp("[\\u0300-\\u036f]", "g");

export function naarWebadres(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(DIACRITISCHE_TEKENS, "") // diakritische tekens (e.g. e-met-accent wordt gewone e)
    .replace(/[^a-zA-Z0-9-]/g, "") // spaties en overige leestekens weg
    .toLowerCase();
}

/**
 * Normaliseert een veld dat meerdere losse waarden kan bevatten (activiteiten,
 * kampplaatsen, gerechten...) naar een array met minstens één (mogelijk lege)
 * waarde, zodat formuliercomponenten er altijd veilig doorheen kunnen loopen.
 */
export function toTextArray(value: string[] | string | undefined | null): string[] {
  if (Array.isArray(value)) return value.length ? value : [""];
  if (typeof value === "string" && value.trim()) return [value];
  return [""];
}

/** Geeft een array terug voor weergave (leeg als er niets zinvols is), i.p.v. altijd minstens [""]. */
export function toDisplayArray(value: string[] | string | undefined | null): string[] {
  return toTextArray(value).filter(Boolean);
}

export interface VeldGroep<T> {
  label: string;
  entries: T[];
}

/**
 * Groepeert entries op een veld dat een lijst van waarden bevat (bv. meerdere
 * gerechten of kampplaatsen per entry) -- ongeacht of het veld al een array
 * is of nog een oudere, losse string. Gesorteerd van meest naar minst vermeld.
 */
export function groupByArrayField<T>(entries: T[], key: keyof T): VeldGroep<T>[] {
  const groups: Record<string, VeldGroep<T>> = {};
  entries.forEach((entry) => {
    const raw = entry[key];
    if (!raw) return;
    const lijst = Array.isArray(raw) ? (raw as string[]) : [raw as string];
    lijst.forEach((item) => {
      const trimmed = (item || "").trim();
      if (!trimmed) return;
      const norm = trimmed.toLowerCase();
      if (!groups[norm]) groups[norm] = { label: trimmed, entries: [] };
      groups[norm].entries.push(entry);
    });
  });
  return Object.values(groups).sort((a, b) => b.entries.length - a.entries.length);
}
