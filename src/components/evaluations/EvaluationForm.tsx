"use client";

import { useActionState, useMemo, useState } from "react";
import { updateEvaluation } from "@/app/actions/evaluations";
import { QuadrantBadge, RecommendationBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Label, SuccessChip, Textarea } from "@/components/ui/Field";
import type { ScoreDimension } from "@/generated/prisma/enums";
import {
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
  MAX_SCORE,
  QUADRANT_DESCRIPTIONS,
  SCORE_DIMENSIONS,
} from "@/lib/constants";
import { evaluateScores, normalizeWeights } from "@/lib/scoring";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

interface EvaluationFormProps {
  evaluationId: string;
  initialScores: Partial<Record<ScoreDimension, number>>;
  initialNotes: string;
}

export function EvaluationForm({
  evaluationId,
  initialScores,
  initialNotes,
}: EvaluationFormProps) {
  const action = updateEvaluation.bind(null, evaluationId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const weights = useAppStore((s) => s.weights);

  const [scores, setScores] = useState<Record<ScoreDimension, number>>(
    () =>
      Object.fromEntries(
        SCORE_DIMENSIONS.map((d) => [d, initialScores[d] ?? 0])
      ) as Record<ScoreDimension, number>
  );

  const result = useMemo(() => evaluateScores(scores, weights), [scores, weights]);
  const normalized = useMemo(() => normalizeWeights(weights), [weights]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-6 sm:p-8">
        <div className="space-y-6">
          {SCORE_DIMENSIONS.map((dimension) => (
            <div key={dimension}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {DIMENSION_LABELS[dimension]}
                    <span className="ml-2 text-xs font-normal text-lv-secondary">
                      Gewicht {(normalized[dimension] * 100).toFixed(0)} %
                    </span>
                  </p>
                  <p className="text-xs text-lv-secondary">
                    {DIMENSION_DESCRIPTIONS[dimension]}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-lv-blue">
                  {scores[dimension]}
                </span>
              </div>
              <input type="hidden" name={dimension} value={scores[dimension]} />
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: MAX_SCORE + 1 }, (_, v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setScores((s) => ({ ...s, [dimension]: v }))
                    }
                    className={cn(
                      "h-9 flex-1 rounded-button border text-sm font-semibold transition-colors",
                      scores[dimension] === v
                        ? "border-lv-blue bg-lv-blue text-white"
                        : v <= scores[dimension]
                          ? "border-lv-blue-soft bg-lv-blue-soft text-lv-blue"
                          : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialNotes}
              placeholder="Begründung, offene Fragen, nächste Schritte…"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="relative bg-lv-cover p-5 text-white">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lv-orange/40 blur-2xl pointer-events-none" />
            <p className="lv-wordmark relative text-[10px] text-white/70">
              Live-Ergebnis
            </p>
            <p className="relative mt-2 text-4xl font-bold tabular-nums">
              {result.overallScore.toFixed(2)}
              <span className="ml-1 text-base font-medium text-white/60">
                / 5
              </span>
            </p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-lv-secondary">Potenzial</span>
              <span className="font-bold tabular-nums">
                {result.potential.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lv-secondary">Machbarkeit</span>
              <span className="font-bold tabular-nums">
                {result.feasibility.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lv-secondary">Quadrant</span>
              <QuadrantBadge value={result.quadrant} />
            </div>
            <p className="text-xs text-lv-secondary">
              {QUADRANT_DESCRIPTIONS[result.quadrant]}
            </p>
            <div className="flex items-center justify-between border-t border-lv-border pt-3">
              <span className="text-lv-secondary">Empfehlung</span>
              <RecommendationBadge value={result.recommendation} />
            </div>
          </div>
        </Card>

        <p className="text-xs text-lv-secondary">
          Das Live-Ergebnis nutzt deine persönlichen Gewichtungen aus den
          Einstellungen. Gespeicherte Scores verwenden die Standard-Gewichte der
          Plattform.
        </p>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Speichern…" : "Bewertung speichern"}
        </Button>
      </div>
    </form>
  );
}
