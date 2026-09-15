import { Check, Send, X } from "lucide-react";
import type { Metadata } from "next";
import {
  ReminderStatusBadge,
  SourceTypeBadge,
} from "@/components/shared/badges";
import { PushCreateForm } from "@/components/pushes/PushCreateForm";
import { Button } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { markReminderDoneForm, cancelReminderForm } from "@/app/actions/pushes";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pushes" };

export default async function PushesPage() {
  await requireTeam();

  const [pushes, partners, startups] = await Promise.all([
    prisma.startupPush.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        partner: { select: { name: true, company: true } },
        startup: { select: { name: true, sourceType: true } },
        pushedBy: { select: { name: true } },
        reminders: { orderBy: { dueAt: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "BUSINESS_PARTNER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true },
    }),
    prisma.startup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const openReminders = pushes
    .flatMap((p) => p.reminders)
    .filter((r) => r.status === "SCHEDULED" || r.status === "SENT").length;

  const partnerOptions = partners.map((p) => ({
    id: p.id,
    label: p.company ? `${p.name} · ${p.company}` : p.name,
  }));
  const startupOptions = startups.map((s) => ({ id: s.id, label: s.name }));

  return (
    <>
      <HeroBanner
        kicker="Acc-unabhängig"
        title="Startup-Pushes"
        subtitle="Weise Partnern gezielt Startups zu — mit Kontext und optionaler Check-in-Erinnerung. Keine Bewertungspflicht."
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <BannerStat label="Pushes" value={pushes.length} />
          <BannerStat label="Offene Check-ins" value={openReminders} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Neu" title="Startup pushen" />
      <Card className="p-6">
        <PushCreateForm partners={partnerOptions} startups={startupOptions} />
      </Card>

      <SectionLabel number="02" label="Verlauf" title="Gepushte Startups" />
      {pushes.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Noch keine Pushes"
          description="Weise oben einem Partner ein Startup zu, um zu starten."
        />
      ) : (
        <div className="space-y-3">
          {pushes.map((push) => (
            <Card key={push.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lv-text">
                      {push.startup.name}
                    </span>
                    {push.startup.sourceType && (
                      <SourceTypeBadge value={push.startup.sourceType} />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-lv-secondary">
                    an {push.partner.company ?? push.partner.name} · von{" "}
                    {push.pushedBy.name} · {formatDate(push.createdAt)}
                  </p>
                  {push.context && (
                    <p className="mt-2 max-w-2xl text-sm text-lv-text">
                      {push.context}
                    </p>
                  )}
                </div>
              </div>

              {push.reminders.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-lv-border pt-3">
                  {push.reminders.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <ReminderStatusBadge value={r.status} />
                        <span className="text-lv-secondary">
                          fällig {formatDate(r.dueAt)}
                          {r.sentAt && ` · versendet ${formatDate(r.sentAt)}`}
                        </span>
                      </div>
                      {(r.status === "SCHEDULED" || r.status === "SENT") && (
                        <div className="flex items-center gap-2">
                          <form action={markReminderDoneForm.bind(null, r.id)}>
                            <Button type="submit" variant="secondary" size="sm">
                              <Check className="h-3.5 w-3.5" />
                              Erledigt
                            </Button>
                          </form>
                          <form action={cancelReminderForm.bind(null, r.id)}>
                            <Button type="submit" variant="ghost" size="sm">
                              <X className="h-3.5 w-3.5" />
                              Abbrechen
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
