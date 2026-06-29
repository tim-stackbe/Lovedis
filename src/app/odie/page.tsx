import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Good boy",
  robots: { index: false, follow: false },
};

/**
 * Hidden Easter-egg route (#3). Not linked anywhere in the nav and marked
 * public in middleware so it's reachable while testing — with or without a
 * session.
 */
export default function OdiePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lv-cover px-6 py-16 text-center text-white">
      <div className="w-full max-w-md rounded-card bg-white/10 p-8 shadow-card backdrop-blur-sm">
        <p className="lv-wordmark mb-4 text-[11px] text-white/80">
          Lovedis · Office Dog
        </p>

        <div className="mx-auto mb-6 overflow-hidden rounded-card bg-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/odie.png"
            alt="Odie, the Lovedis office dog"
            className="mx-auto block h-64 w-full object-contain"
            draggable={false}
          />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Who&apos;s a good boy?</h1>
        <p className="mt-2 text-base text-white/85">
          Das ist <span className="font-semibold">Odie</span> — der inoffizielle
          Chief Happiness Officer von Lovedis. 🐾
        </p>
        <p className="mt-1 text-sm text-white/70">
          Du hast die geheime Seite gefunden. Gut gemacht!
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-button bg-white px-5 py-2.5 text-sm font-semibold text-lv-blue transition-transform hover:scale-[1.02]"
        >
          Zurück zur Plattform
        </Link>
      </div>
    </main>
  );
}
