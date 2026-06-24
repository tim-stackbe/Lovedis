import { Inbox, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookingActions } from "@/components/marketplace/BookingActions";
import {
  BookingStatusBadge,
  OfferingTypeBadge,
} from "@/components/shared/badges";
import { BannerStat, Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Marktplatz-Inbox" };

const BOOKING_INCLUDE = {
  startup: { select: { name: true } },
  requestedBy: { select: { name: true } },
  handledBy: { select: { name: true } },
  program: { select: { title: true } },
  mentor: { select: { name: true } },
  offering: { select: { title: true } },
} as const;

function targetName(b: {
  mentor: { name: string } | null;
  offering: { title: string } | null;
  program: { title: string } | null;
}): string {
  return b.mentor?.name ?? b.offering?.title ?? b.program?.title ?? "Angebot";
}

export default async function MarketplaceInboxPage() {
  await requireTeam();

  const bookings = await prisma.marketplaceBooking.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: BOOKING_INCLUDE,
  });

  const active = bookings.filter(
    (b) =>
      b.status === "REQUESTED" ||
      b.status === "IN_COORDINATION" ||
      b.status === "CONFIRMED"
  );
  const history = bookings.filter(
    (b) =>
      b.status === "COMPLETED" ||
      b.status === "DECLINED" ||
      b.status === "CANCELLED"
  );

  const requested = bookings.filter((b) => b.status === "REQUESTED").length;
  const inCoordination = bookings.filter(
    (b) => b.status === "IN_COORDINATION"
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Marktplatz"
        title="Marktplatz-Koordination"
        subtitle="Koordiniere Matching & Termine mit Partnern/Mentor:innen. „Bestätigen“ löst die Venture Credits über den Ledger ein."
        actions={
          <LinkButton href="/marketplace/catalog" variant="white" size="sm">
            <Store className="h-4 w-4" />
            Katalog pflegen
          </LinkButton>
        }
      >
        <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
          <BannerStat label="Offen" value={requested} />
          <BannerStat label="In Koordination" value={inCoordination} />
          <BannerStat label="Gesamt" value={bookings.length} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Posteingang" title="Aktive Anfragen" />
      {active.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Keine offenen Anfragen"
          description="Sobald ein Startup ein Angebot anfragt, landet es hier zur Koordination."
        />
      ) : (
        <div className="space-y-3">
          {active.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <OfferingTypeBadge value={b.offeringType} />
                    <BookingStatusBadge value={b.status} />
                    <span className="text-sm font-bold text-lv-text">
                      {targetName(b)}
                    </span>
                    <span className="text-xs text-lv-secondary">
                      ← {b.startup.name}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-lv-secondary">
                    „{b.message}“
                  </p>
                  <p className="mt-1 text-xs text-lv-secondary">
                    Kontakt: {b.contactName} · {b.contactEmail}
                    {b.preferredAt && ` · Wunsch: ${b.preferredAt}`}
                  </p>
                  <p className="mt-1 text-xs text-lv-secondary">
                    {b.creditCost > 0
                      ? `${b.creditCost} Credits`
                      : "Inklusive (0 Credits)"}{" "}
                    · angefragt {formatDate(b.createdAt)}
                    {b.handledBy && ` · bearbeitet von ${b.handledBy.name}`}
                  </p>
                </div>
                <BookingActions bookingId={b.id} status={b.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section className="space-y-4">
          <SectionLabel number="02" label="Verlauf" title="Abgeschlossen" />
          <Card className="divide-y divide-lv-border">
            {history.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-lv-text">
                    {targetName(b)}
                    <span className="ml-1.5 font-normal text-lv-secondary">
                      ← {b.startup.name}
                    </span>
                  </p>
                  <p className="text-xs text-lv-secondary">
                    {b.creditCost > 0
                      ? `${b.creditCost} Credits`
                      : "Inklusive"}{" "}
                    · {formatDate(b.createdAt)}
                  </p>
                </div>
                <BookingStatusBadge value={b.status} />
              </div>
            ))}
          </Card>
        </section>
      )}

      {bookings.length === 0 && (
        <p className="text-center text-sm text-lv-secondary">
          Noch keine Buchungen.{" "}
          <Link href="/marketplace/catalog" className="font-semibold text-lv-blue hover:underline">
            Pflege zuerst den Katalog.
          </Link>
        </p>
      )}
    </>
  );
}
