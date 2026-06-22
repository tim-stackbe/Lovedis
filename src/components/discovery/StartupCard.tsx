import { MapPin, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/discovery/FollowButton";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { STARTUP_STAGE_LABELS } from "@/lib/constants";
import type { StartupStage } from "@/generated/prisma/enums";
import { formatMillions } from "@/lib/utils";

export interface DiscoverStartup {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  logoUrl: string | null;
  industry: string;
  stage: StartupStage;
  city: string | null;
  country: string | null;
  teamSize: number | null;
  seekingFunding: boolean;
  seekingAmount: number | null;
  lookingFor: string[];
  followerCount: number;
}

export function StartupCard({
  startup,
  following,
}: {
  startup: DiscoverStartup;
  following: boolean;
}) {
  const location = [startup.city, startup.country].filter(Boolean).join(", ");
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <StartupLogo name={startup.name} logoUrl={startup.logoUrl} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/discover/${startup.id}`}
            className="text-base font-bold leading-tight text-lv-text hover:text-lv-blue"
          >
            {startup.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-lv-secondary">
            {startup.tagline || startup.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="pink">{startup.industry}</Badge>
        <Badge tone="blue">{STARTUP_STAGE_LABELS[startup.stage]}</Badge>
        {startup.seekingFunding && (
          <Badge tone="mint">
            <TrendingUp className="h-3 w-3" />
            {startup.seekingAmount
              ? `Raise ${formatMillions(startup.seekingAmount)}`
              : "Sucht Funding"}
          </Badge>
        )}
      </div>

      {(location || startup.teamSize) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-lv-secondary">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {startup.teamSize && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {startup.teamSize} im Team
            </span>
          )}
        </div>
      )}

      {startup.lookingFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {startup.lookingFor.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-lv-surface px-2.5 py-0.5 text-[11px] font-medium text-lv-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-lv-border pt-4">
        <span className="text-xs text-lv-secondary">
          {startup.followerCount}{" "}
          {startup.followerCount === 1 ? "Follower" : "Follower"}
        </span>
        <FollowButton
          startupId={startup.id}
          initialFollowing={following}
          size="sm"
        />
      </div>
    </Card>
  );
}
