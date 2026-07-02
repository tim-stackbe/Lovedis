import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { OdieEggs } from "@/components/easter-eggs/OdieEggs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Lovedis — Startup-Bewertung & Tech-Scouting",
    template: "%s · Lovedis",
  },
  description:
    "Die Startup-Scouting- und Bewertungsplattform für Innovation Engineers und Venture Scouts — mit Rollen für Partner, Investoren und Startups.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="font-sans">
        {children}
        <OdieEggs />
      </body>
    </html>
  );
}
