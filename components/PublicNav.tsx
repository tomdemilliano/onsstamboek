"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";

const LINKS = [
  { href: "", label: "Home" },
  { href: "/vriendenboekje", label: "Vriendenboekje" },
  { href: "/tijdlijn", label: "Tijdlijn" },
  { href: "/fotos", label: "Foto's" },
  { href: "/over-de-groep", label: "Over de groep" },
];

export default function PublicNav() {
  const groep = useGroep();
  const pathname = usePathname();
  const basis = `/${groep.slug}`;

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem" }}>
      <Link href={basis} style={{ fontWeight: "bold" }}>
        {groep.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={groep.logoUrl} alt={groep.naam} style={{ height: 32 }} />
        ) : (
          groep.naam
        )}
      </Link>
      <nav style={{ display: "flex", gap: "1rem" }}>
        {LINKS.map((link) => {
          const href = `${basis}${link.href}`;
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} style={{ fontWeight: isActive ? "bold" : "normal" }}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/" style={{ fontSize: "0.85rem" }}>
        Niet jouw groep?
      </Link>
    </header>
  );
}
