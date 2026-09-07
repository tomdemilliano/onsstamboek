import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
