import { CREDIT_BUCKET_LABELS } from "@/lib/credit-buckets";
import type { CreditBudgetView } from "@/lib/credit-buckets";

interface Props {
  budget: CreditBudgetView;
  /**
   * "text" = inline "Fix 6/6 · Flexibel 3/6"; "pills" = two coloured chips;
   * "bar" = segmented Fix/Flex progress bar with the text line beneath.
   */
  variant?: "text" | "pills" | "bar";
  className?: string;
}

/**
 * Renders the fix/flex breakdown of a startup's 12-credit budget as
 * remaining/total per bucket, e.g. "Fix 6/6 · Flexibel 3/6".
 */
export function CreditBudgetBreakdown({
  budget,
  variant = "text",
  className = "",
}: Props) {
  if (variant === "bar") {
    // Widths are shares of the total budget, so the mint (Fix) + blue (Flex)
    // filled segments read as "remaining out of total" against the track.
    const total = budget.total || 1;
    const fixPct = Math.max(0, Math.min(100, (budget.fixRemaining / total) * 100));
    const flexPct = Math.max(
      0,
      Math.min(100 - fixPct, (budget.flexRemaining / total) * 100)
    );
    return (
      <div className={className}>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-lv-surface"
          role="img"
          aria-label={`${CREDIT_BUCKET_LABELS.FIX} ${budget.fixRemaining} von ${budget.fixTotal}, ${CREDIT_BUCKET_LABELS.FLEX} ${budget.flexRemaining} von ${budget.flexTotal} Credits verfügbar`}
        >
          <div
            className="h-full bg-lv-mint-deep/70"
            style={{ width: `${fixPct}%` }}
          />
          <div className="h-full bg-lv-blue" style={{ width: `${flexPct}%` }} />
        </div>
        <p className="mt-2 text-sm text-lv-secondary">
          <span className="font-semibold text-lv-mint-deep">
            {CREDIT_BUCKET_LABELS.FIX} {budget.fixRemaining}/{budget.fixTotal}
          </span>{" "}
          ·{" "}
          <span className="font-semibold text-lv-blue">
            {CREDIT_BUCKET_LABELS.FLEX} {budget.flexRemaining}/{budget.flexTotal}
          </span>
        </p>
      </div>
    );
  }
  if (variant === "pills") {
    return (
      <div className={"flex flex-wrap gap-2 " + className}>
        <span className="inline-flex items-center gap-1 rounded-full bg-lv-mint/50 px-2.5 py-0.5 text-xs font-semibold text-lv-mint-deep">
          {CREDIT_BUCKET_LABELS.FIX} {budget.fixRemaining}/{budget.fixTotal}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-lv-blue-soft px-2.5 py-0.5 text-xs font-semibold text-lv-blue">
          {CREDIT_BUCKET_LABELS.FLEX} {budget.flexRemaining}/{budget.flexTotal}
        </span>
      </div>
    );
  }
  return (
    <p className={"text-sm text-lv-secondary " + className}>
      {CREDIT_BUCKET_LABELS.FIX} {budget.fixRemaining}/{budget.fixTotal} ·{" "}
      {CREDIT_BUCKET_LABELS.FLEX} {budget.flexRemaining}/{budget.flexTotal}
    </p>
  );
}
