import { colors, fonts } from "@/lib/theme";
import { VOORWAARDEN_VERSIE } from "@/lib/voorwaarden";

/**
 * De inhoud van de gebruiksvoorwaarden voor groepsbeheerders -- gedeeld
 * tussen de verplichte acceptatie-gate (components/RequireGroepsbeheerder)
 * en de publieke, los raadpleegbare pagina (app/voorwaarden). Bewust hier
 * als losse component i.p.v. inline op 2 plekken herhaald.
 */
export default function VoorwaardenTekst() {
  return (
    <div>
      <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 0 }}>Versie {VOORWAARDEN_VERSIE}</p>

      <P>
        Deze voorwaarden gelden voor wie als <strong>groepsbeheerder</strong> toegang krijgt tot het beheer van een
        groep op Ons Stamboek. Door te aanvaarden bevestig je onderstaande afspraken voor die groep.
      </P>

      <H>1. Jij bent verantwoordelijk voor de inhoud van je groep</H>
      <P>
        Alles wat over jouw groep gepubliceerd staat -- vriendenboekje-fiches, foto&apos;s, mijlpalen, kampplaatsen,
        leidingsploegen, links en andere content -- valt onder jouw verantwoordelijkheid als groepsbeheerder, ook
        wanneer die content oorspronkelijk door een bezoeker werd ingestuurd en jij ze goedkeurde. Ons Stamboek
        (het platform, beheerd door de systeembeheerder) biedt enkel de technische infrastructuur en kan
        ingrijpen bij misbruik of een gegrond verzoek, maar draagt zelf geen inhoudelijke verantwoordelijkheid
        over een individuele groep.
      </P>

      <H>2. Persoonsgegevens (AVG/GDPR)</H>
      <P>Fiches en foto&apos;s bevatten vaak persoonsgegevens van oud-leden en anderen. Als groepsbeheerder verbind je je ertoe om:</P>
      <List
        items={[
          "enkel content te publiceren waarvan je redelijkerwijs mag aannemen dat de betrokkene daarmee akkoord gaat (bv. zelf ingestuurd, of algemeen bekende historische informatie);",
          "een verzoek van een betrokken persoon tot inzage, correctie of verwijdering van zijn/haar gegevens zonder onnodige vertraging te behandelen -- dit is een recht, geen gunst;",
          "gerapporteerde of ongepaste content tijdig na te kijken en waar nodig te verwijderen.",
        ]}
      />

      <H>3. Moderatie van ingezonden content</H>
      <P>
        Bezoekers kunnen zelf fiches, foto&apos;s en andere content insturen of aanvullen. Jij controleert die
        voorstellen en keurt ze goed of af voor ze (verder) zichtbaar zijn -- en blijft, eens goedgekeurd,
        verantwoordelijk voor die inhoud alsof je ze zelf publiceerde.
      </P>

      <H>4. Correct gebruik</H>
      <P>
        Geen content die in strijd is met de wet, lasterlijk of haatdragend is, of andermans auteursrechten
        schendt. Bij twijfel: niet publiceren, of eerst navragen bij de betrokkene.
      </P>

      <H>5. Rol van de systeembeheerder</H>
      <P>
        De systeembeheerder van Ons Stamboek kan technisch ingrijpen (bv. content verwijderen of een account
        schorsen) bij misbruik of een gegrond verzoek, maar neemt daarmee geen inhoudelijke verantwoordelijkheid
        over jouw groep over.
      </P>

      <H>6. Wijzigingen aan deze voorwaarden</H>
      <P>
        Deze voorwaarden kunnen wijzigen. Bij een inhoudelijke wijziging vraagt het beheerscherm je om ze opnieuw
        te aanvaarden voor je verder kan.
      </P>

      <H>7. Vragen</H>
      <P>Vragen over deze voorwaarden? Neem contact op met de systeembeheerder van Ons Stamboek.</P>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.ink, margin: "20px 0 6px" }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 1.6, margin: "0 0 8px" }}>{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 8px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 1.6 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
