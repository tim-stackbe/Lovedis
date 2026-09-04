import { CircleCheck, CircleDashed, Clock, Coins, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ApplicationStatusBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { deriveCreditBudget } from "@/lib/credit-buckets";
import { prisma } from "@/lib/prisma";
import { isStartupMarketplaceHiddenForAlpha } from "@/lib/roles";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Startup-Dashboard" };

export default async function StartupDashboard() {
  const session = await requireRole(["STARTUP", "ADMIN", "MEMBER"]);

  const [startup, openChallenges] = await Promise.all([
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      include: {
        creditAccount: {
          select: { balance: true, fixBalance: true, flexBalance: true },
        },
        applications: {
          include: {
            challenge: { select: { id: true, title: true } },
            poc: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.challenge.findMany({
      where: { status: "OPEN" },
      include: { createdBy: { select: { name: true, company: true } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const applications = startup?.applications ?? [];
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
  const pending = applications.filter((a) => a.status === "PENDING").length;
  const creditBalance = startup?.creditAccount?.balance ?? 0;
  const creditBudget = deriveCreditBudget(startup?.creditAccount);

  const profileChecks = [
    { label: "Unternehmensprofil erstellt", done: Boolean(startup) },
    {
      label: "Beschreibung hinzugefügt",
      done: (startup?.description?.length ?? 0) >= 10,
    },
    { label: "Website verlinkt", done: Boolean(startup?.website) },
    { label: "Teamgröße angegeben", done: Boolean(startup?.teamSize) },
  ];
  const completeness = Math.round(
    (profileChecks.filter((c) => c.done).length / profileChecks.length) * 100
  );

  // Alpha: hide the body "Zum Marktplatz" CTA in exact sync with the Marktplatz
  // sidebar nav item. Both read the same flag/list in @/lib/roles, so
  // re-enabling Marktplatz there brings this button back with no extra change.
  const marketplaceHidden = isStartupMarketplaceHiddenForAlpha();

  return (
    <>
      <HeroBanner
        kicker="Sektion 00 — Startup"
        title={
          startup
            ? `${startup.name}, willkommen zurück`
            : "Lass uns dein Profil aufsetzen"
        }
        subtitle="Entdecke Corporate-Challenges, hol dir Support über den Venture-Marktplatz und tracke deine Bewerbungen."
        actions={
          startup ? (
            <>
              {!marketplaceHidden && (
                <LinkButton href="/venture/marketplace" variant="white">
                  Zum Marktplatz
                </LinkButton>
              )}
              <LinkButton href="/challenges" variant="white">
                Challenges
              </LinkButton>
            </>
          ) : (
            <LinkButton href="/profile" variant="white">
              Profil anlegen
            </LinkButton>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <BannerStat label="Profil" value={`${completeness}%`} />
          <BannerStat
            label="Guthaben"
            value={`${creditBudget.remaining} von ${creditBudget.total}`}
          />
          <BannerStat label="Bewerbungen" value={applications.length} />
          <BannerStat label="Angenommen" value={accepted} />
          <BannerStat label="Offene Challenges" value={openChallenges.length} />
        </div>
      </HeroBanner>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="01" label="Profil" title="Profil-Vollständigkeit" />
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-lv-surface">
                <div
                  className="h-full rounded-full bg-lv-blue transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums text-lv-blue">
                {completeness}%
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {profileChecks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.done ? (
                    <CircleCheck className="h-4 w-4 text-lv-mint-deep" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-lv-secondary" />
                  )}
                  <span className={c.done ? "" : "text-lv-secondary"}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
            <LinkButton
              href="/profile"
              variant="secondary"
              size="sm"
              className="mt-5"
            >
              Profil bearbeiten
            </LinkButton>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionLabel number="02" label="Status" title="Deine Bewerbungen" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ToneCard
              tone={pending > 0 ? "attention" : "muted"}
              icon={Clock}
              label="Ausstehend"
              value={pending}
              sub="in Prüfung"
            />
            <ToneCard
              tone="success"
              icon={CircleCheck}
              label="Angenommen"
              value={accepted}
              sub="PoCs in Bewegung"
            />
          </div>
          {applications.length > 0 && (
            <TableCard>
              <THead>
                <tr>
                  <Th>Challenge</Th>
                  <Th>Eingereicht</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </THead>
              <tbody>
                {applications.slice(0, 5).map((a) => (
                  <Tr key={a.id}>
                    <Td>
                      <Link
                        href={`/challenges/${a.challenge.id}`}
                        className="font-semibold hover:text-lv-blue"
                      >
                        {a.challenge.title}
                      </Link>
                    </Td>
                    <Td className="text-lv-secondary">
                      {formatDate(a.createdAt)}
                    </Td>
                    <Td className="text-right">
                      <ApplicationStatusBadge value={a.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="03"
          label="Venture Platform"
          title="Marktplatz & Guthaben"
        />
        {startup ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/venture/credits" className="block transition-transform hover:-translate-y-0.5">
              <ToneCard
                tone={creditBalance > 0 ? "success" : "muted"}
                icon={Coins}
                label="Venture-Guthaben"
                value={`${creditBudget.remaining} von ${creditBudget.total}`}
                sub={`Fix ${creditBudget.fixRemaining}/${creditBudget.fixTotal} · Flexibel ${creditBudget.flexRemaining}/${creditBudget.flexTotal} · Historie →`}
              />
            </Link>
            <Link href="/venture/marketplace" className="block transition-transform hover:-translate-y-0.5">
              <ToneCard
                tone="info"
                icon={Store}
                label="Marktplatz"
                value="Support finden"
                sub="Programme, Mentor:innen & Angebote →"
              />
            </Link>
          </div>
        ) : (
          <Card className="flex flex-col items-start gap-3 p-6 text-sm text-lv-secondary">
            <span>
              Lege zuerst dein Startup-Profil an, um Venture-Credits zu erhalten
              und den Marktplatz zu nutzen.
            </span>
            <LinkButton href="/profile" size="sm" variant="secondary">
              Profil anlegen
            </LinkButton>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="04"
          label="Chancen"
          title="Offene Challenges für dich"
        />
        {openChallenges.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Gerade keine offenen Challenges — schau bald wieder vorbei.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {openChallenges.map((c) => (
              <Card key={c.id} className="flex flex-col p-5">
                <Link
                  href={`/challenges/${c.id}`}
                  className="text-base font-bold leading-snug hover:text-lv-blue"
                >
                  {c.title}
                </Link>
                <p className="mt-2 flex-1 text-sm text-lv-secondary">
                  {truncate(c.description, 140)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-lv-secondary">
                    {c.createdBy.company ?? c.createdBy.name}
                  </span>
                  <Badge tone="mint">Offen</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
