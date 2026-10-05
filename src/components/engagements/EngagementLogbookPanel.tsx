import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogDrawerButton } from "@/components/logbook/LogDrawer";
import { LogIndicator } from "@/components/logbook/LogIndicator";
import { LogQuickAdd } from "@/components/logbook/LogQuickAdd";
import type { LogListMeta } from "@/lib/logbook";
import { lastContactText } from "@/lib/logbook-format";

/** ADMIN-only Logbuch panel on an engagement (startup-scoped, engagement context). */
export function EngagementLogbookPanel({
  startupId,
  startupName,
  engagementId,
  engagementTitle,
  partnerLabel,
  meta,
  now,
}: {
  startupId: string;
  startupName: string;
  engagementId: string;
  engagementTitle: string;
  partnerLabel: string;
  meta: LogListMeta | null;
  now: number;
}) {
  const contextName = `${engagementTitle} (${partnerLabel})`;
  const quickAdd = {
    refType: "Engagement" as const,
    refId: engagementId,
    contextName,
  };

  return (
    <section className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              <BookOpen className="h-4 w-4 text-lv-blue" />
              Logbuch · {startupName}
              <Badge tone="muted">nur Admins</Badge>
            </p>
            <p className="mt-2 text-sm font-semibold text-lv-text">
              {lastContactText(meta?.lastContactAt ?? null, now)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LogIndicator
              startupId={startupId}
              meta={meta}
              now={now}
              quickAdd={quickAdd}
            />
            <LogDrawerButton startupId={startupId} quickAdd={quickAdd} />
          </div>
        </div>
        <LogQuickAdd
          startupId={startupId}
          refType="Engagement"
          refId={engagementId}
          contextName={contextName}
          label="Engagement notieren"
          className="mt-3"
        />
      </Card>
    </section>
  );
}
