import { Coins, Inbox } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookingCancelButton } from "@/components/marketplace/BookingCancelButton";
import {
  BookingStatusBadge,
  OfferingTypeBadge,
} from "@/components/shared/badges";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireVentureView } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Meine Anfragen" };

export default async function MyBookingsPage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const startup = teamMode
    ? null
    : await prisma.startup.findUnique({
        where: { ownerUserId: session.user.id },
        select: { id: true },
      });

  const bookings =
    teamMode || startup
      ? await prisma.marketplaceBooking.findMany({
          where: teamMode ? undefined : { startupId: startup!.id },
          orderBy: { createdAt: "desc" },
          include: {
            program: { select: { title: true } },
            mentor: { select: { name: true } },
            offering: { select: { title: true } },
            startup: { select: { name: true } },
          },
        })
      : [];

  const open = bookings.filter(
    (b) => b.status === "REQUESTED" || b.status === "IN_COORDINATION"
  ).length;
  const confirmed = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "COMPLETED"
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title={teamMode ? "Anfragen & Buchungen (alle Startups)" : "Meine Anfragen & Buchungen"}
        subtitle="Status der Marktplatz-Anfragen. Credits werden erst nach Bestätigung durch das Lovedis-Team eingelöst."
        actions={
          <LinkButton href="/venture/marketplace" variant="white" size="sm">
            Zum Marktplatz
          </LinkButton>
        }
      >
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <BannerStat label="Offen" value={open} />
          <BannerStat label="Bestätigt" value={confirmed} />
          <BannerStat label="Gesamt" value={bookings.length} />
        </div>
      </HeroBanner>

      {teamMode && (
        <PreviewBanner>
          Startup-Sicht auf alle Anfragen. Zum Bestätigen, Ablehnen oder
          Abschließen nutze die{" "}
          <Link
            href="/marketplace"
            className="font-semibold underline underline-offset-2"
          >
            Marktplatz-Koordination
          </Link>
          .
        </PreviewBanner>
      )}

      <SectionLabel number="01" label="Übersicht" title="Anfragen" />
      {bookings.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Noch keine Anfragen"
          description="Wähle im Marktplatz ein Programm, eine:n Mentor:in oder ein Support-Angebot und sende eine Anfrage."
          action={
            <Link
              href="/venture/marketplace"
              className="text-sm font-semibold text-lv-blue hover:underline"
            >
              Zum Marktplatz
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const targetName =
              b.mentor?.name ??
              b.offering?.title ??
              b.program?.title ??
              "Angebot";
            const canCancel =
              b.status === "REQUESTED" || b.status === "IN_COORDINATION";
            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <OfferingTypeBadge value={b.offeringType} />
                      <BookingStatusBadge value={b.status} />
                      {b.creditCost > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-lv-secondary">
                          <Coins className="h-3 w-3" />
                          {b.creditCost} Credits
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-lv-mint-deep">
                          Inklusive
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-lv-text">
                      {targetName}
                      {teamMode && b.startup?.name && (
                        <span className="ml-1.5 font-normal text-lv-secondary">
                          ← {b.startup.name}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 max-w-2xl text-sm text-lv-secondary">
                      „{b.message}“
                    </p>
                    <p className="mt-1 text-xs text-lv-secondary">
                      Angefragt {formatDate(b.createdAt)}
                      {b.preferredAt && ` · Wunschtermin: ${b.preferredAt}`}
                    </p>
                    {b.coordinatorNote && (
                      <p className="mt-2 rounded-button bg-lv-surface px-3 py-2 text-sm text-lv-text">
                        Notiz vom Team: {b.coordinatorNote}
                      </p>
                    )}
                  </div>
                  {!teamMode && canCancel && (
                    <BookingCancelButton bookingId={b.id} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
