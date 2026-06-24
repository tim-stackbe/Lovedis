import { Bell, Check } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ReminderStatusBadge } from "@/components/shared/badges";
import { markReminderDoneForm } from "@/app/actions/pushes";
import { Button } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requirePartner } from "@/lib/auth-guards";
import { getOpenPartnerCheckIns } from "@/lib/reminders";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Check-ins" };

export default async function CheckInsPage() {
  const session = await requirePartner();
  const { items, overdue } = await getOpenPartnerCheckIns(session.user.id);

  return (
    <>
      <HeroBanner
        kicker="Deine Check-ins"
        title="Check-in-Erinnerungen"
        subtitle="Startups, die das Lovedis-Team dir zugewiesen hat — mit Erinnerung, dranzubleiben."
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <BannerStat label="Offen" value={items.length} />
          <BannerStat label="Überfällig" value={overdue} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="To-do" title="Anstehende Check-ins" />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Keine offenen Check-ins"
          description="Sobald dir das Team ein Startup zuweist, erscheint es hier."
        />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {r.startup ? (
                      <Link
                        href={`/startups/${r.startup.id}`}
                        className="font-semibold text-lv-text hover:text-lv-blue"
                      >
                        {r.startup.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-lv-text">
                        Check-in
                      </span>
                    )}
                    <ReminderStatusBadge value={r.status} />
                  </div>
                  {r.startup?.tagline && (
                    <p className="mt-0.5 text-sm text-lv-secondary">
                      {r.startup.tagline}
                    </p>
                  )}
                  {r.push?.context && (
                    <p className="mt-2 max-w-2xl text-sm text-lv-text">
                      {r.push.context}
                    </p>
                  )}
                  <p
                    className={
                      "mt-2 text-xs " +
                      (r.isOverdue
                        ? "font-semibold text-lv-orange"
                        : "text-lv-secondary")
                    }
                  >
                    Fällig {formatDate(r.dueAt)}
                    {r.isOverdue && " · überfällig"}
                  </p>
                </div>
                <form action={markReminderDoneForm.bind(null, r.id)}>
                  <Button type="submit" variant="secondary" size="sm">
                    <Check className="h-3.5 w-3.5" />
                    Erledigt
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
