import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Display face substituting for lovedis.de's commercial "Greed Standard"
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: {
    default: "Lovedis — Startup-Bewertung & Tech-Scouting",
    template: "%s · Lovedis",
  },
  description:
    "Die Startup-Scouting- und Bewertungsplattform für Innovation Engineers und Venture Scouts — mit Rollen für Partner, Investoren und Startups.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
