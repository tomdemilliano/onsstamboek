import type { Metadata } from "next";
import { fontImports } from "@/lib/theme";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "onsstamboek",
  description: "Vriendenboekje-platform voor scoutsgroepen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <link rel="stylesheet" href={fontImports} />
      <body>{children}</body>
    </html>
  );
}
