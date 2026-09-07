"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, fonts } from "@/lib/theme";

export interface SubNavTab {
  href: string;
  label: string;
  exact?: boolean;
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
          </Link>
        );
      })}
    </div>
  );
}
