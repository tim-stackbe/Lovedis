import {
  EvaluationStatusBadge,
  RecommendationBadge,
} from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import type { Recommendation, ScoreDimension } from "@/generated/prisma/enums";
import {
  CHALLENGE_FIT_GATE_MIN,
  DIMENSION_LABELS,
  GATE_STATUS_LABEL,
  MAX_SCORE,
  SCORE_DIMENSIONS,
} from "@/lib/constants";
import { isChallengeFitGated } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ScoringReadOnlyProps {
  startupName: string;
  industry: string;
  scores: Partial<Record<ScoreDimension, number>>;
  overallScore: number;
  recommendation: Recommendation;
  notes?: string | null;
}

/** Read-only scoring view shown to shared-scoring recipients. */
export function ScoringReadOnly({
  startupName,
  industry,
  scores,
  overallScore,
  recommendation,
  notes,
}: ScoringReadOnlyProps) {
  const gated = isChallengeFitGated(scores);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="p-6">
        <p className="lv-wordmark text-xs text-lv-blue">Scoring</p>
        <h2 className="mt-1 text-xl font-bold">{startupName}</h2>
        <p className="text-sm text-lv-secondary">{industry}</p>

        <div className="mt-6 space-y-4">
          {SCORE_DIMENSIONS.map((d) => {
            const v = scores[d] ?? 0;
            return (
              <div key={d}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{DIMENSION_LABELS[d]}</span>
                  <span className="font-bold tabular-nums text-lv-blue">
                    {v}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-lv-surface">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      v >= 4
                        ? "bg-lv-mint-deep"
                        : v >= 2.5
                          ? "bg-lv-blue"
                          : "bg-lv-orange"
                    )}
                    style={{ width: `${(v / MAX_SCORE) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {notes && (
          <div className="mt-6 rounded-button bg-lv-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Notizen der Bewertung
            </p>
            <p className="mt-2 whitespace-pre-line text-sm">{notes}</p>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden self-start">
        <div className="relative bg-lv-cover p-5 text-white">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lv-orange/40 blur-2xl pointer-events-none" />
          <p className="lv-wordmark relative text-[10px] text-white/70">
            Gesamt
          </p>
          <p className="relative mt-2 text-4xl font-bold tabular-nums">
            {overallScore.toFixed(2)}
            <span className="ml-1 text-base font-medium text-white/60">/ 5</span>
          </p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-lv-secondary">Status</span>
            <EvaluationStatusBadge
              recommendation={recommendation}
              gated={gated}
            />
          </div>
          {gated && (
            <p className="text-xs text-lv-orange">
              {GATE_STATUS_LABEL}: „Challenge Fit“ liegt unter{" "}
              {CHALLENGE_FIT_GATE_MIN}.
            </p>
          )}
          <div className="flex items-center justify-between border-t border-lv-border pt-3">
            <span className="text-lv-secondary">Empfehlung</span>
            <RecommendationBadge value={recommendation} />
          </div>
        </div>
      </Card>
    </div>
  );
}
