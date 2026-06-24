import type {
  ApplicationStatus,
  BookingStatus,
  ChallengeStatus,
  ContentAudience,
  CreditTxType,
  EngagementStatus,
  IntroStatus,
  MarketplaceOfferingType,
  PartnerVerdict,
  PipelineStage,
  PoCStatus,
  ProgramStatus,
  Recommendation,
  ReminderStatus,
  RoadmapStatus,
  SourceType,
  SupportCategory,
  UpdateCategory,
} from "@/generated/prisma/enums";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  APPLICATION_STATUS_LABELS,
  BOOKING_STATUS_LABELS,
  CHALLENGE_STATUS_LABELS,
  CONTENT_AUDIENCE_LABELS,
  CREDIT_TX_TYPE_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  INTRO_STATUS_LABELS,
  MARKETPLACE_OFFERING_TYPE_LABELS,
  PARTNER_VERDICT_LABELS,
  PIPELINE_STAGE_LABELS,
  POC_STATUS_LABELS,
  PROGRAM_STATUS_LABELS,
  QUADRANT_LABELS,
  RECOMMENDATION_LABELS,
  REMINDER_STATUS_LABELS,
  ROADMAP_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SUPPORT_CATEGORY_LABELS,
  UPDATE_CATEGORY_LABELS,
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

export const UPDATE_CATEGORY_TONES: Record<UpdateCategory, BadgeTone> = {
  MILESTONE: "mint",
  FUNDING: "blue",
  PRODUCT: "pink",
  TEAM: "yellow",
  PRESS: "blue",
  GENERAL: "muted",
};

export function UpdateCategoryBadge({ value }: { value: UpdateCategory }) {
  return (
    <Badge tone={UPDATE_CATEGORY_TONES[value]}>
      {UPDATE_CATEGORY_LABELS[value]}
    </Badge>
  );
}

const INTRO_STATUS_TONES: Record<IntroStatus, BadgeTone> = {
  PENDING: "yellow",
  APPROVED: "blue",
  DECLINED: "orange",
  CONNECTED: "mint",
};

export function IntroStatusBadge({ value }: { value: IntroStatus }) {
  return (
    <Badge tone={INTRO_STATUS_TONES[value]}>{INTRO_STATUS_LABELS[value]}</Badge>
  );
}

const PARTNER_VERDICT_TONES: Record<PartnerVerdict, BadgeTone> = {
  PENDING: "muted",
  CONTINUE: "mint",
  PASS: "orange",
};

export function PartnerVerdictBadge({ value }: { value: PartnerVerdict }) {
  return (
    <Badge tone={PARTNER_VERDICT_TONES[value]}>
      {PARTNER_VERDICT_LABELS[value]}
    </Badge>
  );
}

const SOURCE_TYPE_TONES: Record<SourceType, BadgeTone> = {
  INBOUND: "blue",
  OUTBOUND: "pink",
};

export function SourceTypeBadge({ value }: { value: SourceType }) {
  return (
    <Badge tone={SOURCE_TYPE_TONES[value]}>{SOURCE_TYPE_LABELS[value]}</Badge>
  );
}

const REMINDER_STATUS_TONES: Record<ReminderStatus, BadgeTone> = {
  SCHEDULED: "yellow",
  SENT: "blue",
  DONE: "mint",
  CANCELLED: "muted",
};

export function ReminderStatusBadge({ value }: { value: ReminderStatus }) {
  return (
    <Badge tone={REMINDER_STATUS_TONES[value]}>
      {REMINDER_STATUS_LABELS[value]}
    </Badge>
  );
}

const ENGAGEMENT_STATUS_TONES: Record<EngagementStatus, BadgeTone> = {
  ACTIVE: "mint",
  PAUSED: "yellow",
  COMPLETED: "blue",
  CANCELLED: "orange",
};

export function EngagementStatusBadge({ value }: { value: EngagementStatus }) {
  return (
    <Badge tone={ENGAGEMENT_STATUS_TONES[value]}>
      {ENGAGEMENT_STATUS_LABELS[value]}
    </Badge>
  );
}

const ROADMAP_STATUS_TONES: Record<RoadmapStatus, BadgeTone> = {
  PLANNED: "muted",
  IN_PROGRESS: "yellow",
  DONE: "mint",
};

export function RoadmapStatusBadge({ value }: { value: RoadmapStatus }) {
  return (
    <Badge tone={ROADMAP_STATUS_TONES[value]}>
      {ROADMAP_STATUS_LABELS[value]}
    </Badge>
  );
}

const CONTENT_AUDIENCE_TONES: Record<ContentAudience, BadgeTone> = {
  PARTNER: "blue",
  STARTUP: "pink",
  BOTH: "mint",
};

export function ContentAudienceBadge({ value }: { value: ContentAudience }) {
  return (
    <Badge tone={CONTENT_AUDIENCE_TONES[value]}>
      {CONTENT_AUDIENCE_LABELS[value]}
    </Badge>
  );
}

const CREDIT_TX_TYPE_TONES: Record<CreditTxType, BadgeTone> = {
  GRANT: "mint",
  SPEND: "orange",
  ADJUSTMENT: "yellow",
};

export function CreditTxTypeBadge({ value }: { value: CreditTxType }) {
  return (
    <Badge tone={CREDIT_TX_TYPE_TONES[value]}>
      {CREDIT_TX_TYPE_LABELS[value]}
    </Badge>
  );
}

const BOOKING_STATUS_TONES: Record<BookingStatus, BadgeTone> = {
  REQUESTED: "yellow",
  IN_COORDINATION: "blue",
  CONFIRMED: "mint",
  COMPLETED: "mint",
  DECLINED: "orange",
  CANCELLED: "muted",
};

export function BookingStatusBadge({ value }: { value: BookingStatus }) {
  return (
    <Badge tone={BOOKING_STATUS_TONES[value]}>
      {BOOKING_STATUS_LABELS[value]}
    </Badge>
  );
}

const OFFERING_TYPE_TONES: Record<MarketplaceOfferingType, BadgeTone> = {
  PROGRAM: "pink",
  MENTOR_SESSION: "blue",
  SUPPORT: "mint",
};

export function OfferingTypeBadge({
  value,
}: {
  value: MarketplaceOfferingType;
}) {
  return (
    <Badge tone={OFFERING_TYPE_TONES[value]}>
      {MARKETPLACE_OFFERING_TYPE_LABELS[value]}
    </Badge>
  );
}

export function SupportCategoryBadge({ value }: { value: SupportCategory }) {
  return <Badge tone="blue">{SUPPORT_CATEGORY_LABELS[value]}</Badge>;
}

const PROGRAM_STATUS_TONES: Record<ProgramStatus, BadgeTone> = {
  DRAFT: "muted",
  OPEN: "mint",
  CLOSED: "orange",
};

export function ProgramStatusBadge({ value }: { value: ProgramStatus }) {
  return (
    <Badge tone={PROGRAM_STATUS_TONES[value]}>
      {PROGRAM_STATUS_LABELS[value]}
    </Badge>
  );
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
