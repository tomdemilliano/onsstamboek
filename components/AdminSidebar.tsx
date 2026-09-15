"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { useAdminBadgeCounts, type AdminBadgeCounts } from "@/lib/useAdminBadgeCounts";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "@/lib/adminNavConfig";
import { CountBadge } from "@/components/AdminSubNav";
import { colors, fonts, radius } from "@/lib/theme";

/**
 * Gegroepeerde hoofdnavigatie van het groepsbeheer -- vaste zijbalk vanaf
 * een breder scherm (.beheer-sidebar-groot), hamburger + off-canvas paneel
 * eronder (.beheer-sidebar-klein), zelfde 680px-breakpoint en
 * sluiten-bij-navigeren-tijdens-render-idioom als components/PublicNav.tsx.
 * Eén component voor beide weergaven, met gedeelde markup via `NavGroups`,
 * zodat ze nooit uit sync kunnen raken.
 */
export default function AdminSidebar() {
  const groep = useGroep();
  const pathname = usePathname();
  const basis = `/${groep.slug}`;
  const badgeCounts = useAdminBadgeCounts(groep.id);
  const [open, setOpen] = useState(false);

  // Sluit het uitklappaneel bij navigatie -- aanpassen tijdens het renderen
  // (zelfde patroon als PublicNav.tsx) i.p.v. in een effect.
  const [vorigePathname, setVorigePathname] = useState(pathname);
  if (pathname !== vorigePathname) {
    setVorigePathname(pathname);
    setOpen(false);
  }

  function isActief(item: AdminNavItem): boolean {
    const href = `${basis}${item.href}`;
    return item.exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {/* Vaste zijbalk -- vanaf een breder scherm */}
      <aside className="beheer-sidebar-groot" style={{ background: colors.forestDark, padding: "20px 12px" }}>
        <NavGroups basis={basis} badgeCounts={badgeCounts} isActief={isActief} />
      </aside>

      {/* Hamburger + off-canvas paneel -- enkel op een smal scherm */}
      <div className="beheer-sidebar-klein">
        <div style={{ background: colors.forestDark, padding: "10px 16px" }}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menu sluiten" : "Menu openen"}
            aria-expanded={open}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: radius.input,
              border: "1.5px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: colors.white,
              fontFamily: fonts.body,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {open ? "✕" : "☰"} Menu
          </button>
        </div>

        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 90 }}
            />
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                height: "100vh",
                width: 260,
                maxWidth: "80vw",
                overflowY: "auto",
                background: colors.forestDark,
                padding: "20px 12px",
                zIndex: 91,
              }}
            >
              <NavGroups basis={basis} badgeCounts={badgeCounts} isActief={isActief} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function NavGroups({ basis, badgeCounts, isActief }: { basis: string; badgeCounts: AdminBadgeCounts; isActief: (item: AdminNavItem) => boolean }) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.key}>
          {group.label && (
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.5)",
                padding: "0 10px 6px",
              }}
            >
              {group.label}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.items.map((item) => {
              const actief = isActief(item);
              const count = badgeCounts[item.key as keyof AdminBadgeCounts];
              return (
                <Link
                  key={item.key}
                  href={`${basis}${item.href}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 10px",
                    borderRadius: radius.input,
                    borderLeft: `3px solid ${actief ? colors.campfire : "transparent"}`,
                    background: actief ? "rgba(255,255,255,0.08)" : "transparent",
                    color: actief ? colors.white : "rgba(255,255,255,0.7)",
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {Boolean(count) && <CountBadge count={count} />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
