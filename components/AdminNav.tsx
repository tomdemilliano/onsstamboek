"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGroep } from "@/lib/groepContext";
import { logout } from "@/lib/auth";
import GroepWisselaar from "./GroepWisselaar";

const SECTIES = [
  { href: "/beheer", label: "Dashboard" },
  { href: "/beheer/instellingen", label: "Instellingen" },
];

export default function AdminNav() {
  const groep = useGroep();
  const pathname = usePathname();
  const basis = `/${groep.slug}`;

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem" }}>
      <nav style={{ display: "flex", gap: "1rem" }}>
        {SECTIES.map((sectie) => {
          const href = `${basis}${sectie.href}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ fontWeight: isActive ? "bold" : "normal" }}>
              {sectie.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <GroepWisselaar />
        <button onClick={() => logout()}>Uitloggen</button>
      </div>
    </header>
  );
}
