import type {
  ApplicationStatus,
  ChallengeStatus,
  PipelineStage,
  PoCStatus,
  Recommendation,
} from "@/generated/prisma/enums";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  APPLICATION_STATUS_LABELS,
  CHALLENGE_STATUS_LABELS,
  PIPELINE_STAGE_LABELS,
  POC_STATUS_LABELS,
  QUADRANT_LABELS,
  RECOMMENDATION_LABELS,
  type Quadrant,
} from "@/lib/constants";
import { cn, formatScore } from "@/lib/utils";

const RECOMMENDATION_TONES: Record<Recommendation, BadgeTone> = {
  STRONG_YES: "mint",
  YES: "mint",
  MAYBE: "yellow",
  NO: "orange",
  STRONG_NO: "orange",
};

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return (
    <Badge tone={RECOMMENDATION_TONES[value]}>
      {RECOMMENDATION_LABELS[value]}
    </Badge>
  );
}

const PIPELINE_TONES: Record<PipelineStage, BadgeTone> = {
  DISCOVERED: "muted",
  SCREENING: "blue",
  IN_EVALUATION: "yellow",
  PILOT: "pink",
  PARTNERED: "mint",
  PASSED: "orange",
};

export function PipelineStageBadge({ value }: { value: PipelineStage }) {
  return (
    <Badge tone={PIPELINE_TONES[value]}>{PIPELINE_STAGE_LABELS[value]}</Badge>
  );
}

const CHALLENGE_TONES: Record<ChallengeStatus, BadgeTone> = {
  DRAFT: "muted",
  OPEN: "mint",
  IN_REVIEW: "yellow",
  CLOSED: "orange",
};

export function ChallengeStatusBadge({ value }: { value: ChallengeStatus }) {
  return (
    <Badge tone={CHALLENGE_TONES[value]}>{CHALLENGE_STATUS_LABELS[value]}</Badge>
  );
}

const APPLICATION_TONES: Record<ApplicationStatus, BadgeTone> = {
  PENDING: "yellow",
  ACCEPTED: "mint",
  REJECTED: "orange",
};

export function ApplicationStatusBadge({
  value,
}: {
  value: ApplicationStatus;
}) {
  return (
    <Badge tone={APPLICATION_TONES[value]}>
      {APPLICATION_STATUS_LABELS[value]}
    </Badge>
  );
}

const POC_TONES: Record<PoCStatus, BadgeTone> = {
  PLANNED: "blue",
  RUNNING: "yellow",
  COMPLETED: "mint",
  CANCELLED: "orange",
};

export function PoCStatusBadge({ value }: { value: PoCStatus }) {
  return <Badge tone={POC_TONES[value]}>{POC_STATUS_LABELS[value]}</Badge>;
}

export const QUADRANT_TONES: Record<Quadrant, BadgeTone> = {
  MONEY_MAKER: "mint",
  DREAMER: "pink",
  SOLID_BET: "blue",
  PASS: "orange",
};

export function QuadrantBadge({ value }: { value: Quadrant }) {
  return <Badge tone={QUADRANT_TONES[value]}>{QUADRANT_LABELS[value]}</Badge>;
}

export function ScorePill({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const tone =
    score == null
      ? "bg-lv-surface text-lv-secondary"
      : score >= 3.4
        ? "bg-lv-mint text-lv-mint-deep"
        : score >= 2.4
          ? "bg-lv-yellow text-lv-yellow-deep"
          : "bg-lv-orange-soft text-lv-orange";
  return (
    <span
      className={cn(
        "inline-flex min-w-11 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
        tone,
        className
      )}
    >
      {formatScore(score)}
    </span>
  );
}
