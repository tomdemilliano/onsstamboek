import { z } from "zod";

/**
 * Vorm van het resultaat dat de OCR-herkenning (app/api/extract-scan) van een
 * ingescand vriendenboekje-formulier teruggeeft. Losstaand van de Anthropic
 * SDK gehouden zodat client components dit type kunnen importeren zonder de
 * (server-only) SDK mee te bundelen.
 */
export const ScanExtractSchema = z.object({
  naam: z.string().describe("Achternaam + voornaam van het lid, exact zoals op het formulier geschreven."),
  geboortejaar: z.string().describe("Geboortejaar. Lege string als het veld leeg is."),
  totemnaam: z.string().describe("Totemnaam. Lege string als het veld leeg is."),
  periode: z.string().describe('De periode dat dit lid meedeed, bv. "1952-1955". Lege string als leeg.'),
  leuksteActiviteit: z
    .array(z.string())
    .describe(
      "Het plezantste spel/de strafste activiteit. Meestal één element (ook als het een korte zin is). Enkel meerdere elementen als er expliciet meerdere losse activiteiten opgesomd zijn (gescheiden door 'en', een komma, of een nieuwe regel)."
    ),
  besteKampplaats: z
    .array(z.string())
    .describe(
      "De beste kampplaats ooit. Meestal één element (een plaatsnaam, eventueel met een gemeente/regio tussen haakjes). Enkel meerdere elementen bij een expliciete opsomming van aparte kampplaatsen."
    ),
  lekkersteEten: z
    .array(z.string())
    .describe(
      "Het lekkerste kamp-eten. Vaak één samengesteld gerecht (bv. 'stoofvlees met frieten' blijft één element) -- enkel opsplitsen bij een duidelijke opsomming van meerdere losse gerechten."
    ),
});

export type ScanExtractResult = z.infer<typeof ScanExtractSchema>;
