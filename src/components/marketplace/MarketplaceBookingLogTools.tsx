"use client";

import type { LogListMeta } from "@/lib/logbook";
import { LogIndicator } from "@/components/logbook/LogIndicator";
import { LogQuickAdd } from "@/components/logbook/LogQuickAdd";

/** ADMIN-only Logbuch affordances on a marketplace booking row. */
export function MarketplaceBookingLogTools({
  startupId,
  bookingId,
  meta,
  now,
  contextName,
}: {
  startupId: string;
  bookingId: string;
  meta?: LogListMeta | null;
  now: number;
  contextName: string;
}) {
  const quickAdd = {
    refType: "MarketplaceBooking" as const,
    refId: bookingId,
    contextName,
    defaultType: "NOTE" as const,
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-2 lg:items-end">
      <LogIndicator
        startupId={startupId}
        meta={meta}
        now={now}
        quickAdd={quickAdd}
        className="self-end"
      />
      <LogQuickAdd
        startupId={startupId}
        refType="MarketplaceBooking"
        refId={bookingId}
        contextName={contextName}
        label="Koordination notieren"
      />
    </div>
  );
}
