import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { MentorCreateForm } from "@/components/marketplace/CatalogForms";
import { MentorActiveToggle } from "@/components/marketplace/CatalogToggle";
import { ProgramStatusBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { EditorRowActions } from "@/components/venture-store-editor/EditorActions";
import { requireAdmin } from "@/lib/auth-guards";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { EDITOR_PATH } from "@/lib/venture-store-editor";

export const metadata: Metadata = { title: "Venture Store Editor" };

/** SectionLabel look, with "·" instead of a dash (project text rule). */
function EditorSection({
  number,
  label,
  title,
  actions,
}: {
  number: string;
  label: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="lv-wordmark text-xs text-lv-blue shrink-0">
          Section {number} · {label}
        </span>
        <span className="h-px flex-1 bg-lv-border" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
          {title}
        </h2>
        {actions}
      </div>
    </div>
  );
}

function credits(n: number) {
  return `${n} ${n === 1 ? "Credit" : "Credits"}`;
}

export default async function VentureStoreEditorPage() {
  await requireAdmin();

  const [programs, offerings, mentors, offeringBookings, programBookings] =
    await Promise.all([
      prisma.program.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.supportOffering.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.mentorProfile.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.marketplaceBooking.groupBy({
        by: ["offeringId"],
        where: { offeringId: { not: null } },
        _count: { _all: true },
      }),
      prisma.marketplaceBooking.groupBy({
        by: ["programId"],
        where: { programId: { not: null } },
        _count: { _all: true },
      }),
    ]);

  const bookingsByOffering = new Map(
    offeringBookings.map((b) => [b.offeringId, b._count._all])
  );
  const bookingsByProgram = new Map(
    programBookings.map((b) => [b.programId, b._count._all])
  );
  const groups = SUPPORT_CATEGORIES.map((category) => ({
    category,
    items: offerings.filter((o) => o.category === category),
  })).filter((g) => g.items.length > 0);

  const visibleOfferings = offerings.filter((o) => o.isActive).length;
  const openPrograms = programs.filter((p) => p.status === "OPEN").length;

  return (
    <>
      <HeroBanner
        kicker="Venture Store"
        title="Venture Store Editor"
        subtitle="Programme und Support-Angebote anlegen, bearbeiten, sortieren und ein- oder ausblenden. Änderungen sind sofort live im Venture Store."
        actions={
          <LinkButton href="/venture/marketplace" variant="white" size="sm">
            Venture Store ansehen
          </LinkButton>
        }
      />

      <EditorSection
        number="01"
        label="Programme"
        title={`Programme (${openPrograms} von ${programs.length} offen)`}
        actions={
          <LinkButton href={`${EDITOR_PATH}/programs/new`} size="sm">
            <Plus className="h-4 w-4" />
            Neues Programm
          </LinkButton>
        }
      />
      <Card className="divide-y divide-lv-border">
        {programs.length === 0 && (
          <p className="p-4 text-sm text-lv-secondary">Noch keine Programme.</p>
        )}
        {programs.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`${EDITOR_PATH}/programs/${p.id}`}
                  className="font-semibold text-lv-text hover:text-lv-blue"
                >
                  {p.title}
                </Link>
                <ProgramStatusBadge value={p.status} />
                {p.comingSoon && <Badge tone="yellow">Coming Soon</Badge>}
                {p.fixCreditCost > 0 && (
                  <Badge tone="blue">{p.fixCreditCost} Fix-Credits</Badge>
                )}
                {(bookingsByProgram.get(p.id) ?? 0) > 0 && (
                  <Badge>{bookingsByProgram.get(p.id)} Anmeldungen</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-lv-secondary">{p.summary}</p>
            </div>
            <div className="flex items-start gap-2">
              <EditorRowActions
                kind="program"
                id={p.id}
                isFirst={i === 0}
                isLast={i === programs.length - 1}
              />
              <LinkButton href={`${EDITOR_PATH}/programs/${p.id}`} variant="secondary" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </LinkButton>
            </div>
          </div>
        ))}
      </Card>

      <EditorSection
        number="02"
        label="Support"
        title={`Support-Angebote (${visibleOfferings} von ${offerings.length} sichtbar)`}
        actions={
          <LinkButton href={`${EDITOR_PATH}/offerings/new`} size="sm">
            <Plus className="h-4 w-4" />
            Neues Angebot
          </LinkButton>
        }
      />
      {groups.length === 0 && (
        <Card className="p-4 text-sm text-lv-secondary">Noch keine Support-Angebote.</Card>
      )}
      {groups.map((group) => (
        <section key={group.category} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-lv-secondary">
            {SUPPORT_CATEGORY_LABELS[group.category]} ({group.items.length})
          </h3>
          <Card className="divide-y divide-lv-border">
            {group.items.map((o, i) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${EDITOR_PATH}/offerings/${o.id}`}
                      className="font-semibold text-lv-text hover:text-lv-blue"
                    >
                      {o.title}
                    </Link>
                    <Badge tone={o.isActive ? "mint" : "muted"}>
                      {o.isActive ? "Sichtbar" : "Ausgeblendet"}
                    </Badge>
                    <Badge tone="blue">{credits(o.creditCost)}</Badge>
                    {(bookingsByOffering.get(o.id) ?? 0) > 0 && (
                      <Badge>{bookingsByOffering.get(o.id)} Buchungen</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-lv-secondary">
                    {[o.providerCompany, o.contactPerson, o.format]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <EditorRowActions
                    kind="offering"
                    id={o.id}
                    isFirst={i === 0}
                    isLast={i === group.items.length - 1}
                    isActive={o.isActive}
                  />
                  <LinkButton
                    href={`${EDITOR_PATH}/offerings/${o.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Bearbeiten
                  </LinkButton>
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}

      <EditorSection number="03" label="Mentor:innen" title="Mentor:innen" />
      <Card className="p-6">
        <MentorCreateForm />
      </Card>
      {mentors.length > 0 && (
        <Card className="divide-y divide-lv-border">
          {mentors.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-lv-text">{m.name}</span>
                  <Badge tone={m.isActive ? "mint" : "muted"}>
                    {m.isActive ? "Sichtbar" : "Ausgeblendet"}
                  </Badge>
                  <Badge tone="blue">{credits(m.creditCost)}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-lv-secondary">
                  {[m.role, m.company].filter(Boolean).join(" · ")}
                </p>
              </div>
              <MentorActiveToggle id={m.id} active={m.isActive} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
