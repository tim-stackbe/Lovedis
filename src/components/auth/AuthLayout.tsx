import { Wordmark } from "@/components/ui/Wordmark";

interface AuthLayoutProps {
  headline: [string, string, string];
  subline: string;
  children: React.ReactNode;
}

/** Split-screen auth shell: brand cover left, white form card right. */
export function AuthLayout({ headline, subline, children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-lv-cover p-12">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-lv-orange/40 blur-3xl pointer-events-none" />
        <div className="relative">
          <Wordmark variant="light" size="lg" priority />
        </div>
        <div className="relative">
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white">
            {headline[0]}
            <br />
            {headline[1]}
            <br />
            <span className="text-lv-orange">{headline[2]}</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-white/70">{subline}</p>
        </div>
        <p className="relative text-xs uppercase tracking-[0.18em] text-white/50">
          Plattform für Startup-Bewertung & Tech-Scouting
        </p>
      </div>
      <div className="flex items-center justify-center bg-lv-surface/60 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Wordmark size="lg" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
