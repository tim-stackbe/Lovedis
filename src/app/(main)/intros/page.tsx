import { Handshake, Inbox } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { IntroDecision } from "@/components/intros/IntroDecision";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { IntroStatusBadge } from "@/components/shared/badges";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Intro-Anfragen" };

export default async function IntrosPage() {
  await requireRole(["ADMIN", "MEMBER"]);

  const requests = await prisma.introRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      conversationId: true,
      investor: { select: { name: true, company: true } },
      startup: { select: { id: true, name: true, logoUrl: true, industry: true } },
      handledBy: { select: { name: true } },
    },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const handled = requests.filter((r) => r.status !== "PENDING");
  const connected = requests.filter((r) => r.status === "CONNECTED").length;

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Intro-Anfragen"
        subtitle="Investoren bekunden Interesse an Startups — du stellst die Verbindung her. „Verbinden“ eröffnet einen direkten Chat zwischen Investor und Startup."
      >
        <div className="grid grid-cols-3 gap-3 sm:max-w-sm">
          <BannerStat label="Offen" value={pending.length} />
          <BannerStat label="Verbunden" value={connected} />
          <BannerStat label="Gesamt" value={requests.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Posteingang" title="Offene Anfragen" />
        {pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Keine offenen Anfragen"
            description="Sobald ein Investor über „Entdecken“ Interesse bekundet, landet die Anfrage hier zum Brokern."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <StartupLogo
                      name={r.startup.name}
                      logoUrl={r.startup.logoUrl}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/discover/${r.startup.id}`}
                          className="text-sm font-bold text-lv-text hover:text-lv-blue"
                        >
                          {r.startup.name}
                        </Link>
                        <span className="text-xs text-lv-secondary">
                          ← {r.investor.company ?? r.investor.name}
                        </span>
                      </div>
                      <p className="mt-1.5 max-w-2xl text-sm text-lv-secondary">
                        „{r.message}“
                      </p>
                      <p className="mt-1 text-xs text-lv-secondary">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <IntroDecision introId={r.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section className="space-y-4">
          <SectionLabel number="02" label="Verlauf" title="Bearbeitete Anfragen" />
          <Card className="divide-y divide-lv-border">
            {handled.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <StartupLogo
                    name={r.startup.name}
                    logoUrl={r.startup.logoUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-lv-text">
                      {r.startup.name}
                      <span className="ml-1.5 font-normal text-lv-secondary">
                        ← {r.investor.company ?? r.investor.name}
                      </span>
                    </p>
                    <p className="text-xs text-lv-secondary">
                      {r.handledBy ? `von ${r.handledBy.name} · ` : ""}
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.status === "CONNECTED" && r.conversationId && (
                    <Link
                      href={`/messages?c=${r.conversationId}`}
                      className="text-xs font-semibold text-lv-blue hover:underline"
                    >
                      Chat öffnen
                    </Link>
                  )}
                  <IntroStatusBadge value={r.status} />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {requests.length === 0 && (
        <ToneCard
          tone="info"
          label="Tipp"
          value={<Handshake className="h-6 w-6" />}
          sub="Anfragen entstehen, wenn Investoren auf einem öffentlichen Profil „Intro anfragen“ wählen."
        />
      )}
    </>
  );
}
