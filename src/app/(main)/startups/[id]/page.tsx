import {
  ExternalLink,
  Globe,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteAttachment,
  deleteContact,
  deleteStartup,
} from "@/app/actions/startups";
import { createEvaluation } from "@/app/actions/evaluations";
import {
  PipelineStageBadge,
  QuadrantBadge,
  RecommendationBadge,
  ScorePill,
} from "@/components/shared/badges";
import { AttachmentForm } from "@/components/startups/AttachmentForm";
import { ContactForm } from "@/components/startups/ContactForm";
import { StartupForm } from "@/components/startups/StartupForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import {
  RADAR_QUADRANT_LABELS,
  RADAR_RING_LABELS,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { deriveQuadrant } from "@/lib/scoring";
import { formatDate, formatMillions } from "@/lib/utils";

export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireScoutModule();
  const { id } = await params;

  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      evaluations: {
        include: { evaluator: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      },
      campaign: { select: { name: true } },
    },
  });
  if (!startup) notFound();

  const latest = startup.evaluations[0];

  return (
    <>
      <HeroBanner
        kicker="Startup-Profil"
        title={startup.name}
        subtitle={startup.description}
        actions={
          <form action={createEvaluation.bind(null, startup.id)}>
            <Button type="submit" variant="white">
              <Plus className="h-4 w-4" />
              Neue Bewertung
            </Button>
          </form>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat
            label="Letzter Score"
            value={latest ? latest.overallScore.toFixed(1) : "—"}
          />
          <BannerStat
            label="Phase"
            value={STARTUP_STAGE_LABELS[startup.stage]}
          />
          <BannerStat
            label="Funding"
            value={formatMillions(startup.fundingRaised)}
          />
          <BannerStat label="Team" value={startup.teamSize ?? "—"} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Profil" title="Unternehmensdaten" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Branche
                </dt>
                <dd className="mt-1">
                  <Badge tone="pink">{startup.industry}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Standort
                </dt>
                <dd className="mt-1 font-medium">
                  {[startup.city, startup.country].filter(Boolean).join(", ") ||
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Gegründet
                </dt>
                <dd className="mt-1 font-medium">
                  {startup.foundedYear ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Website
                </dt>
                <dd className="mt-1 font-medium">
                  {startup.website ? (
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-lv-blue hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Öffnen
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Kampagne
                </dt>
                <dd className="mt-1 font-medium">
                  {startup.campaign?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                  Hinzugefügt
                </dt>
                <dd className="mt-1 font-medium">
                  {formatDate(startup.createdAt)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-wider text-lv-secondary">
              Einordnung
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-lv-secondary">Pipeline</span>
                <PipelineStageBadge value={startup.pipelineStage} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lv-secondary">Radar</span>
                <span className="font-medium">
                  {startup.radarQuadrant && startup.radarRing
                    ? `${RADAR_QUADRANT_LABELS[startup.radarQuadrant]} · ${RADAR_RING_LABELS[startup.radarRing]}`
                    : "Nicht platziert"}
                </span>
              </div>
              {latest && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-lv-secondary">Quadrant</span>
                    <QuadrantBadge
                      value={deriveQuadrant(latest.potential, latest.feasibility)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lv-secondary">Empfehlung</span>
                    <RecommendationBadge value={latest.recommendation} />
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="02"
          label="Bewerten"
          title={`Bewertungen (${startup.evaluations.length})`}
        />
        {startup.evaluations.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Noch keine Bewertungen — starte eine mit dem Button oben.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Bewertet von</Th>
                <Th>Aktualisiert</Th>
                <Th>Empfehlung</Th>
                <Th className="text-right">Potenzial</Th>
                <Th className="text-right">Machbarkeit</Th>
                <Th className="text-right">Gesamt</Th>
              </tr>
            </THead>
            <tbody>
              {startup.evaluations.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/evaluations/${e.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.evaluator.name}
                    </Link>
                  </Td>
                  <Td className="text-lv-secondary">
                    {formatDate(e.updatedAt)}
                  </Td>
                  <Td>
                    <RecommendationBadge value={e.recommendation} />
                  </Td>
                  <Td className="text-right tabular-nums">
                    {e.potential.toFixed(1)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {e.feasibility.toFixed(1)}
                  </Td>
                  <Td className="text-right">
                    <ScorePill score={e.overallScore} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel
            number="03"
            label="Netzwerk"
            title={`Kontakte (${startup.contacts.length})`}
          />
          <Card className="divide-y divide-lv-border">
            {startup.contacts.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-blue-soft text-lv-blue">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {c.name}
                    {c.position && (
                      <span className="ml-2 font-normal text-lv-secondary">
                        {c.position}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-lv-secondary">
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <p className="mt-1 text-xs text-lv-secondary">{c.notes}</p>
                  )}
                </div>
                <form action={deleteContact.bind(null, c.id, startup.id)}>
                  <button
                    type="submit"
                    className="rounded-button p-1.5 text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange transition-colors"
                    aria-label={`${c.name} löschen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
            <div className="p-4">
              <ContactForm startupId={startup.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionLabel
            number="04"
            label="Material"
            title={`Anhänge (${startup.attachments.length})`}
          />
          <Card className="divide-y divide-lv-border">
            {startup.attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-pink text-lv-text">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-lv-blue"
                  >
                    {a.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-lv-secondary">{a.type}</p>
                </div>
                <form action={deleteAttachment.bind(null, a.id, startup.id)}>
                  <button
                    type="submit"
                    className="rounded-button p-1.5 text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange transition-colors"
                    aria-label={`${a.name} löschen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
            <div className="p-4">
              <AttachmentForm startupId={startup.id} />
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="05" label="Verwalten" title="Startup bearbeiten" />
        <StartupForm startup={startup} />
        <div className="flex justify-end">
          <form action={deleteStartup.bind(null, startup.id)}>
            <Button type="submit" variant="danger" size="sm">
              <Trash2 className="h-4 w-4" />
              Startup löschen
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
