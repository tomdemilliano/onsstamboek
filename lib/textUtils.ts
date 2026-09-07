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
