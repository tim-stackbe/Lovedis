import { BookOpen, CalendarClock, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LOG_ENTRY_TYPE_LABELS, LOG_ENTRY_TYPE_TONES } from "@/lib/constants";
import type { LogbookTeaser } from "@/lib/logbook";
import {
  FORMER_MEMBER_NAME,
  formatLogDate,
  lastContactText,
} from "@/lib/logbook-format";
import { truncate } from "@/lib/utils";
import { LogDrawerButton } from "./LogDrawer";
import { LogQuickAdd } from "./LogQuickAdd";

/** ADMIN-only Logbuch summary under the startup hero. */
export function LogbookTeaserCard({
  startupId,
  teaser,
}: {
  startupId: string;
  teaser: LogbookTeaser;
}) {
  const href = `/startups/${startupId}/logbuch`;
  // eslint-disable-next-line react-hooks/purity -- per-request server render time
  const now = Date.now();

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            <BookOpen className="h-4 w-4 text-lv-blue" />
            Logbuch
            <Badge tone="muted">nur Admins</Badge>
          </p>
          <p className="mt-2 text-sm font-semibold text-lv-text">
            {lastContactText(teaser.lastContactAt, now)}
          </p>
          {teaser.openFollowUps > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-lv-secondary">
              <CalendarClock className="h-3.5 w-3.5" />
              {teaser.openFollowUps === 1
                ? "1 offenes Follow-up"
                : `${teaser.openFollowUps} offene Follow-ups`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LogDrawerButton startupId={startupId} />
          <LinkButton href={href} variant="secondary" size="sm">
            Logbuch öffnen
          </LinkButton>
          <LinkButton href={href} size="sm">
            <Plus className="h-4 w-4" />
            Eintrag erfassen
          </LinkButton>
        </div>
      </div>

      <LogQuickAdd startupId={startupId} label="Schnell notieren" className="mt-3" />

      {teaser.recent.length > 0 && (
        <ul className="mt-4 divide-y divide-lv-border border-t border-lv-border">
          {teaser.recent.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2.5">
              <Badge tone={LOG_ENTRY_TYPE_TONES[e.type]}>
                {LOG_ENTRY_TYPE_LABELS[e.type]}
              </Badge>
              <Link
                href={`${href}#eintrag-${e.id}`}
                className="min-w-0 flex-1 text-sm text-lv-text hover:text-lv-blue"
              >
                <span className="font-semibold">
                  {e.title ?? truncate(e.body.replace(/\s+/g, " "), 90)}
                </span>
              </Link>
              <span className="shrink-0 text-xs text-lv-secondary">
                {formatLogDate(e.occurredAt)} ·{" "}
                {e.authorName ?? FORMER_MEMBER_NAME}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
