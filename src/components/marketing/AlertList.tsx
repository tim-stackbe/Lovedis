import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { AlertLevel, MarketingAlert } from "@/lib/marketing/alerts";
import { cn } from "@/lib/utils";

const LEVEL: Record<AlertLevel, { box: string; mark: string; sign: string }> = {
  critical: { box: "border-l-lv-orange bg-lv-orange-soft", mark: "text-lv-orange", sign: "!" },
  warning: { box: "border-l-lv-yellow-deep bg-lv-yellow/40", mark: "text-lv-yellow-deep", sign: "!" },
  info: { box: "border-l-lv-blue bg-lv-blue-soft", mark: "text-lv-blue", sign: "i" },
};

export function AlertList({ alerts }: { alerts: MarketingAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="p-5 text-sm text-lv-mint-deep">
        Alles in Ordnung: keine Zustellprobleme, alle Daten aktuell.
      </Card>
    );
  }
  return (
    <div className="space-y-2.5">
      {alerts.map((a) => {
        const l = LEVEL[a.level];
        return (
          <div key={a.key} className={cn("flex items-start gap-3 rounded-button border-l-4 px-4 py-3", l.box)}>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-button bg-white text-sm font-extrabold",
                l.mark
              )}
            >
              {l.sign}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-lv-text">{a.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-lv-text/75">{a.detail}</p>
            </div>
            {a.href && (
              <Link href={a.href} className="shrink-0 pt-0.5 text-xs font-semibold text-lv-blue hover:underline">
                {a.action ?? "Öffnen"} →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
