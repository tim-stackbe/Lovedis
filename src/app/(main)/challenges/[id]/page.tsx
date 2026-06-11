import { Check, FlaskConical, Trash2, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  decideApplication,
  deleteChallenge,
} from "@/app/actions/challenges";
import { ApplyForm } from "@/components/challenges/ApplyForm";
import { ChallengeForm } from "@/components/challenges/ChallengeForm";
import {
  ApplicationStatusBadge,
  ChallengeStatusBadge,
} from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER", "STARTUP"]);
  const { id } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, company: true } },
      applications: {
        include: {
          startup: { select: { id: true, name: true, industry: true } },
          poc: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!challenge) notFound();

  const role = session.user.role;
  const isManager =
    role === "ADMIN" ||
    (role === "BUSINESS_PARTNER" && challenge.createdById === session.user.id);

  // Startup view: hide draft challenges entirely.
  if (role === "STARTUP" && challenge.status === "DRAFT") notFound();

  const myStartup =
    role === "STARTUP"
      ? await prisma.startup.findUnique({
          where: { ownerUserId: session.user.id },
          select: { id: true },
        })
      : null;
  const myApplication = myStartup
    ? challenge.applications.find((a) => a.startupId === myStartup.id)
    : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="lv-wordmark text-xs text-lv-blue">Challenge</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {challenge.title}
          </h1>
          <p className="mt-1 text-sm text-lv-secondary">
            by {challenge.createdBy.company ?? challenge.createdBy.name}
            {challenge.deadline && ` · deadline ${formatDate(challenge.deadline)}`}
          </p>
        </div>
        <ChallengeStatusBadge value={challenge.status} />
      </div>

      <Card className="p-6">
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {challenge.description}
        </p>
        {challenge.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {challenge.tags.map((t) => (
              <Badge key={t} tone="blue">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {role === "STARTUP" && (
        <section className="space-y-4">
          <SectionLabel number="02" label="Apply" title="Your application" />
          {myApplication ? (
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">
                  Submitted {formatDate(myApplication.createdAt)}
                </p>
                <ApplicationStatusBadge value={myApplication.status} />
              </div>
              <p className="mt-3 whitespace-pre-line rounded-button bg-lv-surface p-4 text-sm text-lv-secondary">
                {myApplication.pitch}
              </p>
            </Card>
          ) : challenge.status === "OPEN" ? (
            <Card className="p-6">
              <ApplyForm challengeId={challenge.id} />
            </Card>
          ) : (
            <Card className="p-6 text-sm text-lv-secondary">
              This challenge is not accepting applications right now.
            </Card>
          )}
        </section>
      )}

      {isManager && (
        <>
          <section className="space-y-4">
            <SectionLabel
              number="02"
              label="Review"
              title={`Applications (${challenge.applications.length})`}
            />
            {challenge.applications.length === 0 ? (
              <Card className="p-6 text-sm text-lv-secondary">
                No applications yet. Open the challenge to start receiving
                pitches.
              </Card>
            ) : (
              <div className="space-y-3">
                {challenge.applications.map((a) => (
                  <Card key={a.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          {a.startup.name}
                          <span className="ml-2 font-normal text-lv-secondary">
                            {a.startup.industry}
                          </span>
                        </p>
                        <p className="text-xs text-lv-secondary">
                          Applied {formatDate(a.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ApplicationStatusBadge value={a.status} />
                        {a.poc && (
                          <Link
                            href={`/pocs/${a.poc.id}`}
                            className="inline-flex items-center gap-1 rounded-button bg-lv-blue-soft px-2.5 py-1 text-xs font-semibold text-lv-blue hover:bg-lv-blue hover:text-white transition-colors"
                          >
                            <FlaskConical className="h-3 w-3" />
                            PoC
                          </Link>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line rounded-button bg-lv-surface p-4 text-sm">
                      {a.pitch}
                    </p>
                    {a.status === "PENDING" && (
                      <div className="mt-4 flex gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await decideApplication(a.id, "ACCEPTED");
                          }}
                        >
                          <Button type="submit" size="sm">
                            <Check className="h-4 w-4" />
                            Accept & spawn PoC
                          </Button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await decideApplication(a.id, "REJECTED");
                          }}
                        >
                          <Button type="submit" variant="danger" size="sm">
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                        </form>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionLabel number="03" label="Manage" title="Edit challenge" />
            <ChallengeForm challenge={challenge} />
            <div className="flex justify-end">
              <form action={deleteChallenge.bind(null, challenge.id)}>
                <Button type="submit" variant="danger" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Delete challenge
                </Button>
              </form>
            </div>
          </section>
        </>
      )}
    </>
  );
}
