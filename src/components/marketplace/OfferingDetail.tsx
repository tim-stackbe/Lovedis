import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { MarketplaceOfferingType } from "@/generated/prisma/enums";
import { MarketplaceBookingForm } from "@/components/marketplace/MarketplaceBookingForm";
import { OfferingTypeBadge } from "@/components/shared/badges";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { OnBehalfStartup } from "@/lib/marketplace-view";

interface Props {
  offeringType: MarketplaceOfferingType;
  targetId: string;
  kicker: string;
  title: string;
  subtitle?: string;
  description: string;
  tags?: string[];
  creditCost: number;
  balance: number;
  defaultName: string;
  defaultEmail: string;
  /** When true, render the internal-team on-behalf-of booking variant. */
  teamMode?: boolean;
  startups?: OnBehalfStartup[];
}

/** Shared detail + request-form layout for all three offering types. */
export function OfferingDetail({
  offeringType,
  targetId,
  kicker,
  title,
  subtitle,
  description,
  tags,
  creditCost,
  balance,
  defaultName,
  defaultEmail,
  teamMode = false,
  startups = [],
}: Props) {
  return (
    <>
      <Link
        href="/venture/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-secondary hover:text-lv-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Marktplatz
      </Link>

      {teamMode && (
        <PreviewBanner>
          Du siehst die Startup-Buchungsansicht. Anfragen kannst du im Auftrag
          eines ausgewählten Startups senden — die Credits werden diesem Startup
          belastet.
        </PreviewBanner>
      )}

      <HeroBanner kicker={kicker} title={title} subtitle={subtitle} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <SectionLabel number="01" label="Überblick" title="Das Angebot" />
          <Card className="space-y-4 p-6">
            <OfferingTypeBadge value={offeringType} />
            <p className="whitespace-pre-line text-sm leading-relaxed text-lv-text">
              {description}
            </p>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-lv-surface px-2.5 py-0.5 text-xs text-lv-secondary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-4">
          <SectionLabel number="02" label="Anfrage" title="Jetzt anfragen" />
          <Card className="p-6">
            <MarketplaceBookingForm
              offeringType={offeringType}
              targetId={targetId}
              creditCost={creditCost}
              balance={balance}
              defaultName={defaultName}
              defaultEmail={defaultEmail}
              teamMode={teamMode}
              startups={startups}
            />
          </Card>
        </section>
      </div>
    </>
  );
}
