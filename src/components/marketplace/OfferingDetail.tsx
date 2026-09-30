import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CompaniesIcon,
  GlobeIcon,
  ProfileIcon,
  type IconRenderer,
} from "@/components/icons/lovedis";
import type { MarketplaceOfferingType } from "@/generated/prisma/enums";
import { MarketplaceBookingForm } from "@/components/marketplace/MarketplaceBookingForm";
import { WorkshopList } from "@/components/marketplace/WorkshopList";
import { OfferingTypeBadge } from "@/components/shared/badges";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { OnBehalfStartup } from "@/lib/marketplace-view";
import type { ProgramWorkshop } from "@/lib/program-workshops";

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
  /** Optional Notion-sourced metadata (rendered where present). */
  providerCompany?: string | null;
  contactPerson?: string | null;
  website?: string | null;
  sessionDate?: string | null;
  /** Program format line, e.g. "4 Wochen · Online". */
  format?: string | null;
  /** Program workshop series, listed in order. */
  workshops?: ProgramWorkshop[];
  /** Program not started yet: shows a "Coming Soon" sticker. */
  comingSoon?: boolean;
  /** When true, render the internal-team on-behalf-of booking variant. */
  teamMode?: boolean;
  startups?: OnBehalfStartup[];
}

/** A single provider/contact/date/website metadata row. */
function MetaRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: IconRenderer;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-lv-blue" />
      <div className="text-sm">
        <span className="text-lv-secondary">{label}: </span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-lv-blue hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="font-medium text-lv-text">{value}</span>
        )}
      </div>
    </div>
  );
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
  providerCompany,
  contactPerson,
  website,
  sessionDate,
  format,
  workshops = [],
  comingSoon = false,
  teamMode = false,
  startups = [],
}: Props) {
  const hasMeta = Boolean(
    providerCompany || contactPerson || website || sessionDate || format
  );
  const isProgram = offeringType === "PROGRAM";
  return (
    <>
      <Link
        href="/venture/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-secondary hover:text-lv-blue"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Zurück zum Marktplatz
      </Link>

      {teamMode && (
        <PreviewBanner>
          Du siehst die Startup-Buchungsansicht. Anfragen kannst du im Auftrag
          eines ausgewählten Startups senden — die Credits werden diesem Startup
          belastet.
        </PreviewBanner>
      )}

      <HeroBanner
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        actions={
          comingSoon ? (
            <span className="rotate-3 rounded-full bg-lv-orange px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-md">
              Coming Soon
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <SectionLabel number="01" label="Überblick" title="Das Angebot" />
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <OfferingTypeBadge value={offeringType} />
              {comingSoon && <Badge tone="orange">Coming Soon</Badge>}
            </div>
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
            {hasMeta && (
              <div className="space-y-2 border-t border-lv-border pt-4">
                {providerCompany && (
                  <MetaRow
                    icon={CompaniesIcon}
                    label="Anbieter"
                    value={providerCompany}
                  />
                )}
                {contactPerson && (
                  <MetaRow
                    icon={ProfileIcon}
                    label="Kontakt"
                    value={contactPerson}
                  />
                )}
                {format && (
                  <MetaRow icon={CalendarIcon} label="Format" value={format} />
                )}
                {sessionDate && (
                  <MetaRow
                    icon={CalendarIcon}
                    label="Termin"
                    value={sessionDate}
                  />
                )}
                {website && (
                  <MetaRow
                    icon={GlobeIcon}
                    label="Website"
                    value={website.replace(/^https?:\/\//, "")}
                    href={website}
                  />
                )}
              </div>
            )}
            {workshops.length > 0 && <WorkshopList workshops={workshops} />}
          </Card>
        </section>

        <section className="space-y-4">
          <SectionLabel
            number="02"
            label={isProgram ? "Anmeldung" : "Anfrage"}
            title={isProgram ? "Jetzt anmelden" : "Jetzt anfragen"}
          />
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
