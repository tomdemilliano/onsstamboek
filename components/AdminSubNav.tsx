"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, fonts } from "@/lib/theme";

export interface SubNavTab {
  href: string;
  label: string;
  exact?: boolean;
  /** Optioneel aantal, getoond als rond badge-je na het label (bv. aantal concepten/onbehandelde items) -- enkel getoond als > 0. */
  count?: number;
}

export default function AdminSubNav({ tabs }: { tabs: SubNavTab[] }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const actief = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 999,
              border: `1.5px solid ${actief ? colors.forest : colors.line}`,
              background: actief ? colors.forest : colors.white,
              color: actief ? colors.white : colors.ink,
              fontFamily: fonts.body,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {tab.label}
            {Boolean(tab.count) && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: actief ? colors.white : colors.forest,
                  color: actief ? colors.forest : colors.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
