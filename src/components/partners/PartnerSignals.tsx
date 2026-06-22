import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Timeline, TimelineItem } from "@/components/ui/Timeline";
import type { NextAction, PartnerSignals } from "@/lib/partners";

/** Compact health verdict derived from a partner's open signals. */
export function PartnerHealthBadge({ signals }: { signals: PartnerSignals }) {
  const openActions =
    signals.pendingApplications + signals.stalePoCs + signals.expiringChallenges;

  if (openActions > 0) {
    return (
      <Badge tone="yellow">
        <AlertTriangle className="h-3 w-3" />
        Handlungsbedarf
      </Badge>
    );
  }
  if (signals.runningPoCs > 0) {
    return (
      <Badge tone="mint">
        <CheckCircle2 className="h-3 w-3" />
        Aktiv
      </Badge>
    );
  }
  return (
    <Badge tone="muted">
      <Clock className="h-3 w-3" />
      Ruhig
    </Badge>
  );
}

/** The prominent "Nächste Aktion"-Liste / health summary for one partner. */
export function NextActionList({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-6 text-sm text-lv-secondary">
        <CheckCircle2 className="h-5 w-5 text-lv-mint-deep" />
        Alles im grünen Bereich — keine offenen Aktionen für diesen Partner.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Timeline>
        {actions.map((action, i) => {
          const body = (
            <span className={action.href ? "hover:text-lv-blue" : undefined}>
              {action.text}
            </span>
          );
          return (
            <TimelineItem key={i} marker={action.marker} title={body}>
              {action.href && (
                <Link
                  href={action.href}
                  className="text-xs font-semibold text-lv-blue hover:underline"
                >
                  Ansehen →
                </Link>
              )}
            </TimelineItem>
          );
        })}
      </Timeline>
    </Card>
  );
}
