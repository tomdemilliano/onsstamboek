/**
 * Gedeelde structuur van de groepsbeheer-navigatie (components/AdminSidebar.tsx),
 * losgekoppeld van Firebase/data-ophaling -- `key` per item is enkel de
 * koppeling naar de badge-tellingen (lib/useAdminBadgeCounts.ts), niet
 * naar een Firestore-veld of -collectie.
 */

export interface AdminNavItem {
  key: string;
  /** Relatief t.o.v. de groep, bv. "/beheer/vriendenboek". */
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export interface AdminNavGroup {
  key: string;
  /** null = geen zichtbaar groepslabel (enkel "Overzicht", met 1 item). */
  label: string | null;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    key: "overzicht",
    label: null,
    items: [{ key: "dashboard", href: "/beheer", label: "Dashboard", icon: "🏠", exact: true }],
  },
  {
    key: "inhoud",
    label: "Inhoud",
    items: [
      { key: "vriendenboek", href: "/beheer/vriendenboek", label: "Vriendenboek", icon: "📖" },
      { key: "tijdlijn", href: "/beheer/tijdlijn", label: "Tijdlijn", icon: "⏳" },
      { key: "fotos", href: "/beheer/fotos", label: "Foto's", icon: "📷" },
      { key: "kampplaatsen", href: "/beheer/kampplaatsen", label: "Kampplaatsen", icon: "📍" },
      { key: "gerechten", href: "/beheer/gerechten", label: "Gerechten", icon: "🍽️" },
      { key: "links", href: "/beheer/links", label: "Links", icon: "🔗" },
    ],
  },
  {
    key: "communicatie",
    label: "Communicatie",
    items: [
      { key: "contact", href: "/beheer/contact", label: "Contact", icon: "✉️" },
      { key: "mailing", href: "/beheer/mailing", label: "Mailing", icon: "📧" },
    ],
  },
  {
    key: "beheer",
    label: "Beheer",
    items: [
      { key: "instellingen", href: "/beheer/instellingen", label: "Groepsinstellingen", icon: "⚙️" },
      { key: "beheerdersinstellingen", href: "/beheer/beheerdersinstellingen", label: "Beheerder instellingen", icon: "🔔" },
      { key: "statistieken", href: "/beheer/statistieken", label: "Statistieken", icon: "📊" },
      { key: "activiteitenlog", href: "/beheer/activiteitenlog", label: "Activiteitenlog", icon: "📝" },
    ],
  },
];
