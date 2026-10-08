import Link from "next/link";
import { BookOpen, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { PIPELINE_STAGE_LABELS } from "@/lib/constants";
import type { LogDashboardData } from "@/lib/logbook";
import { lastContactText } from "@/lib/logbook-format";
import { formatDate } from "@/lib/utils";

/** Admin dashboard: open Logbuch follow-ups and stale pipeline startups. */
export function LogDashboardSection({
  data,
  now,
}: {
  data: LogDashboardData;
  now: number;
}) {
  const showFollowUps = data.followUpTotal > 0;
  const showStale = data.staleTotal > 0;
  if (!showFollowUps && !showStale) return null;

  return (
    <section className="space-y-4">
      <SectionLabel
        number="01b"
        label="Logbuch"
        title="Follow-ups und Kontakt"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {showFollowUps && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-lv-text">
              <CalendarClock className="h-4 w-4 text-lv-blue" />
              Offene Follow-ups
              <Badge tone="blue">{data.followUpTotal}</Badge>
            </p>
            <TableCard>
              <THead>
                <tr>
                  <Th>Startup</Th>
                  <Th>Nächster Schritt</Th>
                  <Th>Fällig</Th>
                </tr>
              </THead>
              <tbody>
                {data.followUps.map((f) => (
                  <Tr
                    key={f.id}
                    className={f.overdue ? "bg-lv-orange-soft/30" : undefined}
                  >
                    <Td>
                      <Link
                        href={`/startups/${f.startupId}/logbuch#eintrag-${f.id}`}
                        className="font-semibold hover:text-lv-blue"
                      >
                        {f.startupName}
                      </Link>
                      {f.mine && (
                        <Badge tone="mint" className="ml-2">
                          mir
                        </Badge>
                      )}
                    </Td>
                    <Td className="max-w-xs truncate text-lv-secondary">
                      {f.nextStep}
                    </Td>
                    <Td className="text-lv-secondary">
                      {f.followUpAt ? formatDate(f.followUpAt) : "offen"}
                      {f.overdue && (
                        <span className="ml-1 font-semibold text-lv-orange">
                          überfällig
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
            {data.followUpTotal > data.followUps.length && (
              <p className="text-xs text-lv-secondary">
                Zeigt {data.followUps.length} von {data.followUpTotal}. Weitere
                Einträge im jeweiligen Startup-Logbuch.
              </p>
            )}
          </div>
        )}

        {showStale && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-lv-text">
              <BookOpen className="h-4 w-4 text-lv-blue" />
              Lange kein manueller Kontakt
              <Badge tone="orange">{data.staleTotal}</Badge>
            </p>
            <Card className="divide-y divide-lv-border">
              {data.stale.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/startups/${s.id}`}
                      className="text-sm font-semibold hover:text-lv-blue"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {PIPELINE_STAGE_LABELS[s.pipelineStage]} ·{" "}
                      {lastContactText(s.lastContactAt, now)}
                    </p>
                  </div>
                  <Link
                    href={`/startups/${s.id}/logbuch`}
                    className="text-xs font-semibold text-lv-blue hover:underline"
                  >
                    Logbuch
                  </Link>
                </div>
              ))}
            </Card>
            {data.staleTotal > data.stale.length && (
              <p className="text-xs text-lv-secondary">
                Zeigt {data.stale.length} von {data.staleTotal} aktiven Startups
                ohne Eintrag in den letzten 30 Tagen.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
