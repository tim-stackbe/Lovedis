"use client";

import { Button } from "@/components/ui/Button";
import {
  DEFAULT_WEIGHTS,
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
  SCORE_DIMENSIONS,
} from "@/lib/constants";
import { normalizeWeights } from "@/lib/scoring";
import { useAppStore } from "@/stores/useAppStore";

export function WeightsEditor() {
  const weights = useAppStore((s) => s.weights);
  const setWeight = useAppStore((s) => s.setWeight);
  const resetWeights = useAppStore((s) => s.resetWeights);

  const normalized = normalizeWeights(weights);
  const isDefault = SCORE_DIMENSIONS.every(
    (d) => Math.abs((weights[d] ?? 0) - DEFAULT_WEIGHTS[d]) < 0.001
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-lv-secondary">
        Deine persönliche Gewichtung wird in diesem Browser gespeichert und auf
        Live-Vorschauen, die Vergleichsansicht und Dashboards angewendet —
        gespeicherte Bewertungen behalten immer die Plattform-Standards.
      </p>
      {SCORE_DIMENSIONS.map((d) => (
        <div key={d}>
          <div className="flex items-baseline justify-between text-sm">
            <div>
              <span className="font-medium">{DIMENSION_LABELS[d]}</span>
              <span className="ml-2 text-xs text-lv-secondary">
                {DIMENSION_DESCRIPTIONS[d]}
              </span>
            </div>
            <span className="font-bold tabular-nums text-lv-blue">
              {(normalized[d] * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={weights[d] ?? 0}
            onChange={(e) => setWeight(d, Number(e.target.value))}
            className="mt-1.5 w-full accent-lv-blue"
            aria-label={`Gewicht für ${DIMENSION_LABELS[d]}`}
          />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-lv-border pt-4">
        <p className="text-xs text-lv-secondary">
          Gewichte werden automatisch auf 100 % normalisiert.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetWeights}
          disabled={isDefault}
        >
          Auf Standard zurücksetzen
        </Button>
      </div>
    </div>
  );
}
