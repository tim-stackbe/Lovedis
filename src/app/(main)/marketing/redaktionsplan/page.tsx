import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { dayString } from "@/components/insights/format";
import { ContentForm, ContentItemControls, type ContentValues } from "@/components/marketing/ContentForms";
import { fmtDateTime, fmtDay } from "@/components/marketing/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_CONFIG,
  CONTENT_STATUSES,
  type ContentChannel,
  type ContentFormat,
  type ContentStatus,
} from "@/lib/marketing/constants";
import { loadContent } from "@/lib/marketing/data";
import { isoWeek, weekStart } from "@/lib/marketing/metrics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketing · Redaktionsplan" };

const DAY = 86_400_000;
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Item = Awaited<ReturnType<typeof loadContent>>["items"][number];

function values(i: Item): ContentValues {
  return {
    id: i.id,
    title: i.title,
    body: i.body,
    channel: i.channel,
    format: i.format,
    plannedFor: dayString(i.plannedFor),
    assigneeId: i.assigneeId,
    campaign: i.campaign,
    publishedUrl: i.publishedUrl,
  };
}

export default async function RedaktionsplanPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const offset = Number.isInteger(Number(w)) ? Number(w) : 0;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(weekStart(now).getTime() + offset * 7 * DAY);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY));

  const { items, admins, nameById } = await loadContent();
  const sameDay = (a: Date | null, b: Date) => a !== null && dayString(a) === dayString(b);

  const inReview = items.filter((i) => i.status === "IN_REVIEW");
  const backlog = items.filter((i) => !i.plannedFor && i.status !== "PUBLISHED");
  const openPlanned = items.filter((i) => i.plannedFor && i.status !== "PUBLISHED");
  const published = items
    .filter((i) => i.status === "PUBLISHED")
    .sort((a, b) => (b.plannedFor?.getTime() ?? 0) - (a.plannedFor?.getTime() ?? 0))
    .slice(0, 10);

  const meta = (i: Item) =>
    [
      fmtDay(i.plannedFor),
      CONTENT_CHANNEL_LABELS[i.channel as ContentChannel] ?? i.channel,
      i.format && (CONTENT_FORMAT_LABELS[i.format as ContentFormat] ?? i.format),
      i.assigneeId && nameById.get(i.assigneeId),
      i.campaign && `Kampagne: ${i.campaign}`,
    ]
      .filter(Boolean)
      .join(" · ");

  const row = (i: Item) => {
    const st = CONTENT_STATUS_CONFIG[i.status as ContentStatus];
    return (
      <Card key={i.id} className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-lv-text">{i.title}</p>
            <p className="text-xs text-lv-secondary">{meta(i)}</p>
          </div>
          {st && <Badge tone={st.tone}>{st.label}</Badge>}
        </div>
        {i.body && <p className="line-clamp-3 whitespace-pre-line text-sm text-lv-text/80">{i.body}</p>}
        {i.reviewNote && (
          <p className={cn("rounded-button px-3 py-2 text-xs", i.status === "DRAFT" ? "bg-lv-orange-soft text-lv-orange" : "bg-lv-surface text-lv-secondary")}>
            {i.status === "DRAFT" ? "Zurückgegeben: " : "Freigabe-Kommentar: "}
            {i.reviewNote}
          </p>
        )}
        {i.approvedAt && (
          <p className="text-xs text-lv-secondary">
            Freigegeben von {nameById.get(i.approvedById ?? "") ?? "Admin"} am {fmtDateTime(i.approvedAt)}
          </p>
        )}
        {i.publishedUrl && (
          <a href={i.publishedUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-lv-blue hover:underline">
            {i.publishedUrl}
          </a>
        )}
        <ContentItemControls item={values(i)} status={i.status} admins={admins} />
      </Card>
    );
  };

  return (
    <>
      <HeroBanner
        kicker="Marketing · Planung"
        title="Redaktionsplan"
        subtitle="Beiträge planen, von einem Admin freigeben lassen und nach Veröffentlichung verlinken. Verlinkte LinkedIn-Beiträge bekommen ihre Kennzahlen automatisch aus dem Import."
      >
        <div className="flex flex-wrap gap-2">
          {CONTENT_STATUSES.map((s) => (
            <span key={s} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
              {CONTENT_STATUS_CONFIG[s].label}: {items.filter((i) => i.status === s).length}
            </span>
          ))}
        </div>
      </HeroBanner>

      <SectionLabel
        number="01"
        label="Woche"
        title={`KW ${isoWeek(start)} · ${fmtDay(days[0], false)} bis ${fmtDay(days[6])}`}
        actions={
          <div className="flex items-center gap-1">
            <Link href={`/marketing/redaktionsplan?w=${offset - 1}`} aria-label="Vorherige Woche" className="rounded-button border border-lv-border p-1.5 hover:bg-lv-surface">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {offset !== 0 && (
              <Link href="/marketing/redaktionsplan" className="rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold hover:bg-lv-surface">
                Heute
              </Link>
            )}
            <Link href={`/marketing/redaktionsplan?w=${offset + 1}`} aria-label="Nächste Woche" className="rounded-button border border-lv-border p-1.5 hover:bg-lv-surface">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d, idx) => {
          const dayItems = items.filter((i) => sameDay(i.plannedFor, d));
          const isToday = dayString(d) === dayString(today);
          return (
            <div key={idx} className={cn("min-h-36 rounded-card p-2.5", isToday ? "bg-lv-blue-soft" : "bg-lv-surface")}>
              <p className={cn("mb-2 flex justify-between text-[11px] font-bold uppercase tracking-wider", isToday ? "text-lv-blue" : "text-lv-secondary")}>
                <span>
                  {WEEKDAYS[idx]} {fmtDay(d, false)}
                </span>
                {isToday && <span>heute</span>}
              </p>
              <div className="space-y-2">
                {dayItems.map((i) => {
                  const st = CONTENT_STATUS_CONFIG[i.status as ContentStatus];
                  return (
                    <div key={i.id} className="rounded-button border border-lv-border bg-white p-2 text-xs">
                      {st && <Badge tone={st.tone} className="text-[10px]">{st.label}</Badge>}
                      <p className="mt-1 font-semibold leading-snug text-lv-text">{i.title}</p>
                      <p className="mt-0.5 text-lv-secondary">
                        {CONTENT_CHANNEL_LABELS[i.channel as ContentChannel] ?? i.channel}
                        {i.assigneeId && nameById.get(i.assigneeId) ? ` · ${nameById.get(i.assigneeId)}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <SectionLabel number="02" label="Neu" title="Beitrag anlegen" />
      <Card className="p-5">
        <ContentForm admins={admins} />
      </Card>

      {inReview.length > 0 && (
        <>
          <SectionLabel number="03" label="Freigabe" title={`Warten auf Freigabe (${inReview.length})`} />
          <div className="space-y-3">{inReview.map(row)}</div>
        </>
      )}

      <SectionLabel number="04" label="Geplant" title="Offene Beiträge mit Datum" />
      {openPlanned.filter((i) => i.status !== "IN_REVIEW").length === 0 ? (
        <Card className="p-5 text-sm text-lv-secondary">Keine offenen Beiträge mit Datum.</Card>
      ) : (
        <div className="space-y-3">{openPlanned.filter((i) => i.status !== "IN_REVIEW").map(row)}</div>
      )}

      {backlog.filter((i) => i.status !== "IN_REVIEW").length > 0 && (
        <>
          <SectionLabel number="05" label="Ideen" title="Ohne Datum" />
          <div className="space-y-3">{backlog.filter((i) => i.status !== "IN_REVIEW").map(row)}</div>
        </>
      )}

      {published.length > 0 && (
        <>
          <SectionLabel number="06" label="Archiv" title="Zuletzt veröffentlicht" />
          <div className="space-y-3">{published.map(row)}</div>
        </>
      )}
    </>
  );
}
