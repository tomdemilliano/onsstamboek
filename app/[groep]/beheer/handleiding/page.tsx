import { colors, fonts, radius } from "@/lib/theme";

// Statische inhoud, geen groep-specifieke gegevens nodig -- daarom bewust
// een server component (geen "use client"/hooks) i.t.t. de andere
// beheerschermen. Bijwerken bij nieuwe functionaliteit in de rest van
// app/[groep]/beheer/.
const HOOFDSTUKKEN = [
  { id: "taken", label: "🎯 Taken van de beheerder" },
  { id: "dashboard", label: "🏠 Dashboard" },
  { id: "vriendenboek", label: "📖 Vriendenboek" },
  { id: "tijdlijn", label: "⏳ Tijdlijn" },
  { id: "kampplaatsen", label: "📍 Kampplaatsen" },
  { id: "fotos", label: "📷 Foto's" },
  { id: "gerechten", label: "🍽️ Gerechten" },
  { id: "links", label: "🔗 Links" },
  { id: "activiteit", label: "📝 Activiteit" },
  { id: "contact", label: "✉️ Contact" },
  { id: "instellingen", label: "⚙️ Instellingen" },
  { id: "hulp", label: "❓ Hulp nodig?" },
];

export default function HandleidingPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 100px" }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 600, color: colors.ink, margin: "0 0 6px" }}>
        Handleiding voor groepsbeheerders
      </h1>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: 20 }}>
        Een overzicht van elk onderdeel van dit beheerscherm, wat het doet, en hoe de goedkeuringsflow voor
        publiek ingezonden content werkt.
      </p>

      <Callout>
        <strong>Hoe crowdsourcing werkt op Ons Stamboek:</strong> bezoekers kunnen zelf een vriendenboekje-
        formulier insturen, een foto opladen of taggen, een leidingsploeg aanvullen, of een kampplaats/mijlpaal
        voorstellen. Dat verschijnt meteen ergens in dit beheerscherm, maar pas <strong>gepubliceerd/zichtbaar
        na jouw goedkeuring</strong> zodra het om een geheel nieuw item gaat, of als &quot;&#9203; wacht op
        goedkeuring&quot; naast een reeds gepubliceerd item als iemand een correctie voorstelde. Het{" "}
        <strong>Dashboard</strong> hieronder verzamelt alles wat ergens op jouw actie wacht op één plek.
      </Callout>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0 36px" }}>
        {HOOFDSTUKKEN.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            style={{
              padding: "6px 14px",
              borderRadius: radius.badge,
              border: `1px solid ${colors.line}`,
              background: colors.paperCard,
              color: colors.ink,
              fontFamily: fonts.body,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {h.label}
          </a>
        ))}
      </nav>

      <Sectie id="taken" titel="🎯 Taken van de beheerder">
        <P>Kort samengevat komt het beheer van een groep op dit platform neer op:</P>
        <List
          items={[
            <>
              Ingezonden fiches, foto&apos;s, mijlpalen, kampplaatsen en leidingsploegen <strong>nakijken en
              goedkeuren of afwijzen</strong> voor ze publiek zichtbaar worden of van toepassing zijn (zie de
              goedkeuringsflow hierboven).
            </>,
            <>
              Contactberichten en verwijderverzoeken <strong>tijdig opvolgen</strong> -- niemand anders doet dit
              voor jouw groep.
            </>,
            <>
              <strong>Verantwoordelijk zijn voor de inhoud van je groep.</strong> Jij bepaalt en beheert wat er
              over jouw groep gepubliceerd staat. De systeembeheerder/het platform kan technisch ingrijpen (bv.
              bij misbruik), maar draagt zelf geen verantwoordelijkheid over de inhoud van een individuele groep
              -- die verantwoordelijkheid ligt bij jou als groepsbeheerder.
            </>,
            <>
              Content <strong>verwijderen zodra ze gerapporteerd wordt</strong> als ongepast, onjuist of
              ongewenst (bv. via een contactbericht of een verwijderverzoek bij een foto).
            </>,
            <>
              Een fiche of foto <strong>verwijderen als de betrokken persoon (of iemand namens hem/haar) daarom
              vraagt</strong> -- bv. iemand die zelf op een foto staat of over wie een vriendenboekje-fiche gaat.
              Dit is geen gunst maar een recht (denk AVG/GDPR: recht op verwijdering van persoonsgegevens) en
              vraagt dus geen verdere discussie.
            </>,
          ]}
        />
      </Sectie>

      <Sectie id="dashboard" titel="🏠 Dashboard">
        <P>
          De pagina die je als eerste ziet na het aanmelden. Bovenaan staat <strong>&quot;Te behandelen&quot;</strong>:
          een verzamellijst van alles wat ergens in de rest van dit beheerscherm op jouw actie wacht -- goed te
          keuren fiches, niet-gekoppelde kampplaatsen, pending extra kampplaatsen/mijlpalen/foto&apos;s,
          verwijderverzoeken voor foto&apos;s, wijzigingsvoorstellen, pending leidingsploegen en ongelezen
          contactberichten -- elk met een link die je er rechtstreeks naartoe brengt. Staat die lijst leeg, dan
          is alles bijgewerkt.
        </P>
        <P>
          Daaronder staan kerncijfers (aantal leden, kampplaatsen, mijlpalen, foto&apos;s, links) en
          bezoekerstatistieken van de publieke groep-pagina&apos;s: enkel het aantal paginabezoeken per dag wordt
          geteld, geen individuele bezoekers of IP-adressen.
        </P>
      </Sectie>

      <Sectie id="vriendenboek" titel="📖 Vriendenboek">
        <P>
          Het overzicht toont elke fiche met een status: <strong>concept</strong> (nog niet gepubliceerd),{" "}
          <strong>gepubliceerd</strong>, of <strong>getagd, geen fiche</strong> (iemand werd herkend op een foto
          of stond in een leidingsploeg, maar vulde zelf nog geen formulier in -- zo&apos;n &quot;stub&quot;-fiche
          wordt automatisch aangemaakt). Filter op status of op &quot;kampplaats niet gekoppeld&quot; om snel te
          zien wat nog actie vraagt.
        </P>
        <List
          items={[
            <>
              <strong>Bewerken</strong> -- de velden van een fiche aanpassen.
            </>,
            <>
              <strong>Publiceren</strong> -- een concept zichtbaar maken op de publieke site.
            </>,
            <>
              <strong>Goedkeuren</strong> -- verschijnt enkel als een bezoeker zelf een al gepubliceerde fiche
              aanvulde/corrigeerde; bevestigt die wijziging.
            </>,
            <>
              <strong>Depubliceren / Verwijderen</strong> -- tijdelijk verbergen, of definitief wissen (bij een
              &quot;getagd, geen fiche&quot;-item verwijdert dit ook de foto-tags en leidingsploeg-koppelingen van
              die persoon).
            </>,
          ]}
        />
        <P>
          <strong>+ Fiche toevoegen</strong> maakt handmatig een nieuwe fiche aan (als concept). Laad je een foto
          of pdf van een ingevuld papieren formulier op, dan herkent &quot;Tekst herkennen&quot; automatisch de
          velden (via AI-tekstherkenning) -- controleer en corrigeer die altijd voor je publiceert.{" "}
          <strong>+ Meerdere scans</strong> doet hetzelfde voor een hele stapel scans in één keer: elke scan wordt
          herkend en als concept opgeslagen, nakijken en publiceren doe je nadien per formulier.
        </P>
        <P>
          <strong>Wijzigingsvoorstellen</strong> zijn correcties die een bezoeker instuurde op een fiche die al
          gepubliceerd stond. Je ziet per veld wat verandert (oud → nieuw) en kiest <strong>Goedkeuren</strong>{" "}
          (past de fiche meteen aan) of <strong>Weigeren</strong> (fiche blijft ongewijzigd).
        </P>
      </Sectie>

      <Sectie id="tijdlijn" titel="⏳ Tijdlijn">
        <P>Drie tabbladen:</P>
        <List
          items={[
            <>
              <strong>🚩 Mijlpalen</strong> -- belangrijke momenten uit de geschiedenis van jouw groep (jaar,
              titel, optioneel een beschrijving en afbeelding). Scouting-brede mijlpalen (⚜️, bv. jaarthema&apos;s)
              beheert de systeembeheerder centraal en verschijnen hier gewoon mee op de tijdlijn. Een door een
              bezoeker voorgestelde mijlpaal staat &quot;goed te keuren&quot; tot je ze bevestigt, bewerkt of afwijst.
            </>,
            <>
              <strong>👥 Takken</strong> -- de lijst afdelingen (bv. Kapoenen, Welpen, Jonggivers...) waaruit je
              kiest bij het invullen van een leidingsploeg. De volgorde hier (te wijzigen met de pijltjes) bepaalt
              ook de volgorde op de tijdlijn. Een tak verwijderen wist geen leidingsploeg-geschiedenis, enkel de
              koppeling met die naam.
            </>,
            <>
              <strong>Leidingsploegen</strong> -- de leiding per tak, per werkingsjaar (bv. 2023 = werkingsjaar
              2023-2024). Een bestaande tak+jaar-combinatie opnieuw invullen overschrijft ze. Leden tag je via de
              naamzoeker (gekoppeld aan een bestaande vriendenboekje-fiche) of typ je vrij in. Een door een
              bezoeker aangevulde/gecorrigeerde ploeg staat &quot;wacht op goedkeuring&quot; tot je ze bevestigt.
            </>,
          ]}
        />
      </Sectie>

      <Sectie id="kampplaatsen" titel="📍 Kampplaatsen">
        <P>Twee tabbladen:</P>
        <List
          items={[
            <>
              <strong>❤️ Uit vriendenboekjes</strong> -- elke unieke &quot;beste kampplaats&quot; die ergens in een
              fiche vermeld staat, automatisch gegroepeerd. Zoek de plaats op (via OpenStreetMap) en kies een
              resultaat, klik &quot;Kies op kaart&quot; om de pin zelf te verslepen, of vul coördinaten manueel in
              (bv. via rechtsklik op Google Maps → coördinaten kopiëren) als de zoekfunctie niets vindt. Is een
              naam geen echte plaats (bv. &quot;overal&quot; of &quot;thuis&quot;), markeer ze dan als &quot;geen
              koppeling nodig&quot; zodat ze niet als &quot;nog te koppelen&quot; blijft meetellen.
            </>,
            <>
              <strong>📍 Extra kampplaatsen</strong> -- losstaande plekken, niet gekoppeld aan een
              &quot;beste kampplaats&quot;-vermelding: door jou rechtstreeks toegevoegd, of door een bezoeker
              voorgesteld (dan &quot;goed te keuren&quot;, met coördinaten in te stellen vóór je goedkeurt als de
              bezoeker die nog niet koos).
            </>,
          ]}
        />
      </Sectie>

      <Sectie id="fotos" titel="📷 Foto's">
        <P>Vijf tabbladen:</P>
        <List
          items={[
            <>
              <strong>Overzicht</strong> -- pending foto&apos;s (goedkeuren/afwijzen), verwijderverzoeken van
              bezoekers (verwijderen/behouden), en de gepubliceerde foto&apos;s met een tag-filter. Bewerken laat
              je jaar/decennium, locatie, beschrijving, leden-tags en categorie-tags instellen, en de foto 90°
              draaien.
            </>,
            <>
              <strong>+ Foto&apos;s toevoegen</strong> -- bulk-opladen, meteen gepubliceerd (en automatisch
              verkleind). Jaar/locatie hier gelden dan voor de hele selectie; wie erop staat tag je nadien per
              foto (door jezelf of door bezoekers).
            </>,
            <>
              <strong>Tags</strong> -- enkel jij als beheerder maakt nieuwe categorieën aan (bv. Kampvuur,
              Groepsfoto); iedereen mag daarna bestaande tags aan een foto toekennen, in beheer én publiek.
            </>,
            <>
              <strong>🗓️ Op decennium sorteren</strong> -- sleep een foto zonder exact jaartal naar een decennium,
              en herschik binnen dat decennium (vooraan = vroeger) voor een soort tijdlijn zonder exacte jaartallen.
              Je kan ook alsnog een exact jaartal intypen per foto.
            </>,
            <>
              <strong>🔍 Dubbels</strong> -- scant alle gepubliceerde foto&apos;s op visuele gelijkenis (ook net
              geen exacte kopieën), handig omdat verschillende bezoekers soms zonder het te weten dezelfde foto
              opladen. De eerste scan kan even duren; bekijk elke gevonden groep en verwijder de overtollige
              exemplaren.
            </>,
          ]}
        />
      </Sectie>

      <Sectie id="gerechten" titel="🍽️ Gerechten & recepten">
        <P>
          Net als bij kampplaatsen: elk uniek &quot;lekkerste eten&quot; uit de fiches wordt automatisch
          gegroepeerd. Koppel er optioneel een receptlink en een korte notitie aan (bv. &quot;Mama&apos;s
          recept&quot;) -- op de publieke pagina wordt dat gerecht dan klikbaar.
        </P>
      </Sectie>

      <Sectie id="links" titel="🔗 Links">
        <P>
          Een eenvoudige lijst externe links (naam, URL, optionele omschrijving) die publiek verschijnt op de
          <code> /links</code>-pagina van jouw groep.
        </P>
      </Sectie>

      <Sectie id="activiteit" titel="📝 Activiteit">
        <P>
          Een logboek van alles wat <strong>bezoekers zelf</strong> deden (foto&apos;s taggen/draaien,
          leidingsploegen invullen, voorstellen indienen...) -- jouw eigen bewerkingen als beheerder tellen hier
          niet in mee. Je ziet cijfers per periode (vandaag/deze week/deze maand/all-time), een grafiek van de
          laatste 30 dagen, een verdeling per onderdeel, en een filterbare lijst met &quot;bekijken&quot;-links die
          je rechtstreeks naar het betrokken scherm/item brengen.
        </P>
      </Sectie>

      <Sectie id="contact" titel="✉️ Contact">
        <P>
          De inbox van berichten die bezoekers via het publieke contactformulier van jouw groep instuurden. Markeer
          als gelezen, antwoord rechtstreeks via de e-maillink, of verwijder een bericht.
        </P>
      </Sectie>

      <Sectie id="instellingen" titel="⚙️ Instellingen">
        <List
          items={[
            <>
              <strong>Welkomstfoto</strong> -- bovenaan de publieke startpagina van de groep. Laad een nieuw
              bestand op of kies uit al gepubliceerde foto&apos;s, en gebruik &quot;Kadreren&quot; om te bepalen
              welk deel van de foto zichtbaar blijft (sleep + zoom), exact zoals bezoekers het te zien krijgen.
            </>,
            <>
              <strong>Basisgegevens</strong> -- naam, gemeente, een algemeen contactadres (publiek zichtbaar op
              &quot;over de groep&quot;, dus niet jouw persoonlijk e-mailadres), oprichtingsjaar (bepaalt mee het
              startjaar van de tijdlijn), en de gekoppelde organisatie (ontgrendelt gedeelde jaarkentekens en
              scouting-brede mijlpalen op de tijdlijn -- wordt centraal beheerd door de systeembeheerder).
            </>,
          ]}
        />
      </Sectie>

      <Sectie id="hulp" titel="❓ Hulp nodig?">
        <P>
          Aanmelden kan via het sleuteltje-icoon rechtsboven op elke publieke pagina van je groep; eens aangemeld
          tonen je initialen daar een menu met &quot;Groepsbeheer openen&quot; en &quot;Afmelden&quot;. Ben je
          beheerder van meerdere groepen, dan verschijnt bovenaan dit beheerscherm een groepswisselaar.
        </P>
        <P>
          Voor een nieuw account, een nieuwe groepsbeheerder, een wachtwoordprobleem, of iets dat je zelf niet
          kan oplossen via dit scherm: neem contact op met de systeembeheerder van Ons Stamboek.
        </P>
      </Sectie>
    </div>
  );
}

function Sectie({ id, titel, children }: { id: string; titel: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40, scrollMarginTop: 20 }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: colors.ink, margin: "0 0 10px" }}>{titel}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 1.6, margin: "0 0 12px" }}>{children}</p>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 1.6 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: colors.campfireLight,
        border: `1.5px dashed ${colors.campfire}`,
        borderRadius: radius.card,
        padding: "16px 18px",
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.ink,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
