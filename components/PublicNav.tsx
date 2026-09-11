"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { useGroep } from "@/lib/groepContext";
import { colors, fonts, radius } from "@/lib/theme";
import { clearGroepCookie, getGroepCookie } from "@/lib/groepCookie";
import { watchAuth, isSysteembeheerder, logout } from "@/lib/auth";
import { GroepFactory, LidmaatschapFactory } from "@/lib/dbSchema";
import DasIcon from "@/components/DasIcon";
import type { Groep, WithId } from "@/types/models";

const LINKS = [
  { href: "/vriendenboekje", label: "Vriendenboekje", icon: "📖" },
  { href: "/tijdlijn", label: "Tijdlijn", icon: "⏳" },
  { href: "/kampplaatsen", label: "Kampplaatsen", icon: "🏕️" },
  { href: "/fotos", label: "Foto's", icon: "📷" },
  { href: "/eten", label: "Eten", icon: "🍲" },
  { href: "/spellen", label: "Spellen", icon: "🎲" },
  { href: "/links", label: "Links", icon: "🔗" },
  { href: "/over-de-groep", label: "Over de groep", icon: "ℹ️" },
];

// Lichtjes scheve hoeken en rotaties, per knop verschillend maar altijd
// dezelfde volgorde (geen Math.random -- anders klopt server- en
// client-render niet met elkaar, wat een hydration-fout geeft).
const RADIUS = [
  "16px 22px 18px 24px / 20px 16px 22px 14px",
  "22px 16px 24px 18px / 16px 22px 14px 20px",
  "18px 24px 16px 22px / 22px 14px 20px 16px",
  "24px 18px 22px 16px / 14px 20px 16px 22px",
];
const ROTATIE = [-1.5, 1, -1, 1.5];

function Kampvuurtje({ maat = 30 }: { maat?: number }) {
  return (
    <svg width={maat} height={maat} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M6 24 L14 12" stroke={colors.forestDark} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 24 L16 12" stroke={colors.forestDark} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 9 C 11 13, 11 17, 15 21 C 19 17, 19 13, 15 9 Z" fill={colors.campfire} />
      <path d="M15 13 C 13 15.5, 13 17.5, 15 19.5 C 17 17.5, 17 15.5, 15 13 Z" fill="#F4B860" />
    </svg>
  );
}

/**
 * Vast, klein icoontje rechtsboven in beeld (blijft ook zichtbaar bij het
 * scrollen) -- een aparte, altijd-zichtbare kortere weg naar het
 * contactformulier van déze groep, i.p.v. enkel een link ergens in de nav.
 * Op een smal scherm zou dit -- samen met AccountKnop ernaast -- achter het
 * hamburger-icoon van de compacte balk vallen, dus daar via vb-navicon-vast
 * verborgen (zie app/globals.css); Contact staat op mobiel in het
 * uitklapmenu (zie MobielAccountSectie hieronder).
 */
function ContactLink({ basis, naam }: { basis: string; naam: string }) {
  return (
    <Link
      href={`${basis}/contact`}
      title={`Contacteer ${naam}`}
      aria-label={`Contacteer ${naam}`}
      className="vb-navicon-vast"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 50,
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: colors.paperCard,
        border: `1.5px solid ${colors.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 2px 6px rgba(44, 36, 25, 0.12)",
      }}
    >
      ✉️
    </Link>
  );
}

const accountIconBasisStyle: React.CSSProperties = {
  position: "fixed",
  top: 12,
  right: 54,
  zIndex: 50,
  width: 34,
  height: 34,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  textDecoration: "none",
  boxShadow: "0 2px 6px rgba(44, 36, 25, 0.12)",
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "8px 10px",
  borderRadius: radius.input,
  fontFamily: fonts.body,
  fontSize: 13,
  fontWeight: 600,
  color: colors.ink,
  textDecoration: "none",
};

/** Zelfde look als de gewone links in het mobiele uitklapmenu (zie LINKS hieronder), voor de contact/aanmeld/beheer-rijen van MobielAccountSectie. */
const mobielMenuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: radius.input,
  fontFamily: fonts.body,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  color: colors.ink,
  background: colors.paperCard,
  border: `1.5px solid ${colors.line}`,
};

type AccountStatus = {
  user: User | null | undefined;
  systeembeheerder: boolean;
  mijnGroepen: WithId<Groep>[];
};

/**
 * Auth-status voor de publieke nav -- éénmaal opgehaald in PublicNav en
 * gedeeld door zowel AccountKnop (het vaste icoontje, enkel op een breed
 * scherm) als MobielAccountSectie (dezelfde info in het uitklapmenu op een
 * smal scherm), zodat er geen 2 keer een auth-listener + lidmaatschappen-
 * opzoeking loopt voor exact dezelfde gegevens.
 */
function useAccountStatus(): AccountStatus {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [systeembeheerder, setSysteembeheerder] = useState(false);
  const [mijnGroepen, setMijnGroepen] = useState<WithId<Groep>[]>([]);

  useEffect(() => {
    return watchAuth((u) => {
      setUser(u);
      if (!u) {
        setSysteembeheerder(false);
        setMijnGroepen([]);
        return;
      }
      isSysteembeheerder(u).then(setSysteembeheerder);
      LidmaatschapFactory.getByUserId(u.uid)
        .then((lidmaatschappen) => Promise.all(lidmaatschappen.map((l) => GroepFactory.getById(l.groepId))))
        .then((groepen) => setMijnGroepen(groepen.filter((g): g is WithId<Groep> => g !== null)));
    });
  }, []);

  return { user, systeembeheerder, mijnGroepen };
}

type GroepDoel = { id: string; slug: string; naam: string };

/**
 * Welke groep de "Groepsbeheer openen"-snelkoppeling moet aanbieden: de
 * laatst bezochte groep (cookie) als die er is, anders de enige groep
 * waarvan de gebruiker beheerder is -- bij meerdere groepen (en geen
 * cookie) toont de aanroeper zelf de volledige lijst.
 * `actief` beschermt tegen het lezen van `document.cookie` tijdens SSR/de
 * eerste render (voor allebei de menu's begint dat altijd op `false`).
 */
function bepaalGroepsbeheerDoel(actief: boolean, mijnGroepen: WithId<Groep>[]): GroepDoel | null {
  if (!actief) return null;
  const cookieSlug = getGroepCookie();
  if (cookieSlug) return { id: cookieSlug, slug: cookieSlug, naam: "" };
  return mijnGroepen.length === 1 ? mijnGroepen[0] : null;
}

/**
 * Vast icoontje rechtsboven, net naast ContactLink: aanmeldknop voor
 * groepsbeheerders (en systeembeheerders, die via dezelfde /aanmelden
 * binnenkomen) als niemand is aangemeld, anders de initialen van de
 * ingelogde gebruiker met een uitklapmenu (groepsbeheer/systeembeheer
 * openen, afmelden). Bewust hier i.p.v. op de platform-landingspagina --
 * dat is de plek waar nu al een vast contact-icoontje staat. Enkel
 * zichtbaar op een breed scherm (vb-navicon-vast) -- op mobiel toont
 * MobielAccountSectie dezelfde info in het uitklapmenu.
 */
function AccountKnop({ account }: { account: AccountStatus }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, systeembeheerder, mijnGroepen } = account;
  const [menuOpen, setMenuOpen] = useState(false);

  // Zelfde patroon als de mobiele menu-sluiting in PublicNav hieronder:
  // aanpassen tijdens het renderen bij een pad-wijziging, i.p.v. in een
  // effect (geen overbodige extra render).
  const [vorigePathname, setVorigePathname] = useState(pathname);
  if (pathname !== vorigePathname) {
    setVorigePathname(pathname);
    setMenuOpen(false);
  }

  // Sluit het menu ook als de auth-status zelf wijzigt (bv. na afmelden).
  const [vorigeUser, setVorigeUser] = useState(user);
  if (user !== vorigeUser) {
    setVorigeUser(user);
    setMenuOpen(false);
  }

  // Nog niet bekend of iemand is aangemeld -- niets tonen i.p.v. even kort
  // het verkeerde icoon te flitsen.
  if (user === undefined) return null;

  if (!user) {
    return (
      <Link
        href="/aanmelden"
        title="Aanmelden voor groepsbeheerders"
        aria-label="Aanmelden"
        className="vb-navicon-vast"
        style={{ ...accountIconBasisStyle, background: colors.paperCard, border: `1.5px solid ${colors.line}` }}
      >
        🔑
      </Link>
    );
  }

  const initialen = (user.email || "??").slice(0, 2).toUpperCase();
  const groepDoel = bepaalGroepsbeheerDoel(menuOpen, mijnGroepen);

  return (
    <div className="vb-navicon-vast" style={{ position: "fixed", top: 12, right: 54, zIndex: 50 }}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={menuOpen}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: colors.forest,
          color: colors.white,
          border: "none",
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(44, 36, 25, 0.12)",
        }}
      >
        {initialen}
      </button>

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            minWidth: 210,
            background: colors.white,
            border: `1px solid ${colors.line}`,
            borderRadius: radius.card,
            boxShadow: "0 4px 14px rgba(44, 36, 25, 0.18)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, padding: "4px 10px 8px", wordBreak: "break-all" }}>{user.email}</div>

          {systeembeheerder && (
            <Link href="/systeembeheer" style={menuItemStyle}>
              🧭 Systeembeheer
            </Link>
          )}

          {groepDoel && (
            <Link href={`/${groepDoel.slug}/beheer`} style={menuItemStyle}>
              ⚙️ Groepsbeheer openen
            </Link>
          )}
          {!groepDoel &&
            mijnGroepen.length > 1 &&
            mijnGroepen.map((g) => (
              <Link key={g.id} href={`/${g.slug}/beheer`} style={menuItemStyle}>
                ⚙️ {g.naam}
              </Link>
            ))}
          {!groepDoel && mijnGroepen.length === 0 && !systeembeheerder && (
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, padding: "6px 10px" }}>Nog geen groep gekoppeld.</div>
          )}

          <div style={{ height: 1, background: colors.line, margin: "4px 4px" }} />

          <button
            onClick={() => logout().then(() => router.refresh())}
            style={{ ...menuItemStyle, textAlign: "left", background: "none", border: "none", cursor: "pointer", width: "100%", color: colors.stamp }}
          >
            🚪 Afmelden
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Zelfde info als AccountKnop (contact, aanmelden/afmelden, systeembeheer/
 * groepsbeheer), maar dan als rijen onderaan het mobiele uitklapmenu i.p.v.
 * een apart vast icoontje -- dat zou op een smal scherm anders achter het
 * hamburger-icoon van de compacte balk vallen. `actief` is het menuOpen van
 * de compacte balk zelf (het uitklapmenu bestaat sowieso enkel dan).
 */
function MobielAccountSectie({ account, basis, actief, router }: { account: AccountStatus; basis: string; actief: boolean; router: ReturnType<typeof useRouter> }) {
  const { user, systeembeheerder, mijnGroepen } = account;
  const groepDoel = bepaalGroepsbeheerDoel(actief, mijnGroepen);

  return (
    <>
      <div style={{ height: 1, background: colors.line, margin: "8px 4px" }} />

      <Link href={`${basis}/contact`} style={mobielMenuItemStyle}>
        <span aria-hidden="true">✉️</span> Contact
      </Link>

      {user === undefined ? null : !user ? (
        <Link href="/aanmelden" style={mobielMenuItemStyle}>
          <span aria-hidden="true">🔑</span> Aanmelden
        </Link>
      ) : (
        <>
          {systeembeheerder && (
            <Link href="/systeembeheer" style={mobielMenuItemStyle}>
              <span aria-hidden="true">🧭</span> Systeembeheer
            </Link>
          )}
          {groepDoel && (
            <Link href={`/${groepDoel.slug}/beheer`} style={mobielMenuItemStyle}>
              <span aria-hidden="true">⚙️</span> Groepsbeheer
            </Link>
          )}
          {!groepDoel &&
            mijnGroepen.length > 1 &&
            mijnGroepen.map((g) => (
              <Link key={g.id} href={`/${g.slug}/beheer`} style={mobielMenuItemStyle}>
                <span aria-hidden="true">⚙️</span> {g.naam}
              </Link>
            ))}
          <button
            onClick={() => logout().then(() => router.refresh())}
            style={{ ...mobielMenuItemStyle, cursor: "pointer", width: "100%", textAlign: "left", color: colors.stamp }}
          >
            <span aria-hidden="true">🚪</span> Afmelden
          </button>
        </>
      )}
    </>
  );
}

export default function PublicNav() {
  const groep = useGroep();
  const router = useRouter();
  const pathname = usePathname();
  const basis = `/${groep.slug}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const account = useAccountStatus();

  // Links naast de naam altijd das1 (als ingesteld); rechts das2 als de
  // groep die instelde, anders gewoon das1 nogmaals (groepen die nooit van
  // kleur veranderden tonen dan dezelfde das aan beide kanten).
  const das1 = groep.dasKleur1 && groep.dasKleur2 ? { kleur1: groep.dasKleur1, kleur2: groep.dasKleur2 } : null;
  const das2 = groep.das2Kleur1 && groep.das2Kleur2 ? { kleur1: groep.das2Kleur1, kleur2: groep.das2Kleur2 } : das1;

  function kiesAndereGroep() {
    // Zonder de cookie te wissen zou proxy.ts "/" meteen terugsturen naar
    // deze zelfde groep.
    clearGroepCookie();
    router.push("/");
  }

  // Sluit het uitklapmenu bij navigatie -- aanpassen tijdens het renderen
  // (React's aanbevolen patroon om state te resetten op een prop-wijziging)
  // i.p.v. in een effect, dat hier een overbodige extra render zou geven.
  const [vorigePathname, setVorigePathname] = useState(pathname);
  if (pathname !== vorigePathname) {
    setVorigePathname(pathname);
    setMenuOpen(false);
  }

  return (
    <div>
      <ContactLink basis={basis} naam={groep.naam} />
      <AccountKnop account={account} />

      {/* Volledige weergave -- vanaf een breder scherm */}
      <div className="vb-nav-groot">
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <Link href={basis} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
            {das1 && <DasIcon kleur1={das1.kleur1} kleur2={das1.kleur2} maat={48} />}
            <span style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: colors.ink }}>{groep.naam}</span>
            {das2 && <DasIcon kleur1={das2.kleur1} kleur2={das2.kleur2} maat={48} />}
          </Link>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", padding: "18px 20px 0" }}>
          <Link href={basis} aria-label="Naar de groep-startpagina" style={{ display: "flex", marginRight: 4 }}>
            <Kampvuurtje />
          </Link>

          {LINKS.map((link, i) => {
            const href = `${basis}${link.href}`;
            const active = pathname === href;
            return (
              <Link
                key={link.href}
                href={href}
                style={{
                  padding: "7px 16px",
                  borderRadius: RADIUS[i % RADIUS.length],
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? colors.white : colors.ink,
                  background: active ? colors.forest : colors.paperCard,
                  border: `1.5px solid ${active ? colors.forest : colors.line}`,
                  transform: `rotate(${ROTATIE[i % ROTATIE.length]}deg)`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <button
            onClick={kiesAndereGroep}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecoration: "underline" }}
          >
            Niet jouw groep? Kies opnieuw
          </button>
        </div>
      </div>

      {/* Compacte balk + uitklapmenu -- enkel op een smal scherm */}
      <div className="vb-nav-klein">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <Link href={basis} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Kampvuurtje maat={26} />
            {das1 && <DasIcon kleur1={das1.kleur1} kleur2={das1.kleur2} maat={24} />}
            <span style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, color: colors.ink }}>{groep.naam}</span>
            {das2 && <DasIcon kleur1={das2.kleur1} kleur2={das2.kleur2} maat={24} />}
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={menuOpen}
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.input,
              border: `1.5px solid ${colors.line}`,
              background: colors.paperCard,
              fontSize: 16,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            {LINKS.map((link) => {
              const href = `${basis}${link.href}`;
              const active = pathname === href;
              return (
                <Link
                  key={link.href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: radius.input,
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    color: active ? colors.white : colors.ink,
                    background: active ? colors.forest : colors.paperCard,
                    border: `1.5px solid ${active ? colors.forest : colors.line}`,
                  }}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={kiesAndereGroep}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "10px 14px", fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textDecoration: "underline" }}
            >
              Niet jouw groep? Kies opnieuw
            </button>

            <MobielAccountSectie account={account} basis={basis} actief={menuOpen} router={router} />
          </div>
        )}
      </div>
    </div>
  );
}
