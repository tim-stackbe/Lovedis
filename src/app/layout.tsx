import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { OdieEggs } from "@/components/easter-eggs/OdieEggs";
import "./globals.css";

/** Same files and weight mapping as lovedis.de (Nuxt homepage). */
const greedStandard = localFont({
  src: [
    {
      path: "../../public/fonts/greed-standard/GreedStandard-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/greed-standard/GreedStandard-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/greed-standard/GreedStandard-Medium.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/greed-standard/GreedStandard-Medium.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-greed-standard",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LOVEDIS — Startup-Bewertung & Tech-Scouting",
    template: "%s · LOVEDIS",
  },
  description:
    "Die Startup-Scouting- und Bewertungsplattform für Innovation Engineers und Venture Scouts — mit Rollen für Partner, Investoren und Startups.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2926e5",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={greedStandard.variable}>
      <body className="font-sans">
        {children}
        <OdieEggs />
      </body>
    </html>
  );
}
