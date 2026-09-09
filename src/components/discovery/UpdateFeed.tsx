import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import {
  UPDATE_CATEGORY_TONES,
  UpdateCategoryBadge,
} from "@/components/shared/badges";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Timeline, TimelineItem } from "@/components/ui/Timeline";
import type { UpdateCategory } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/utils";

export interface FeedUpdate {
  id: string;
  title: string;
  body: string;
  category: UpdateCategory;
  createdAt: Date | string;
  /** Official Lovedis-team broadcast — shown to everyone, no follow needed. */
  official?: boolean;
  startup?: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
}

export function UpdateFeed({ updates }: { updates: FeedUpdate[] }) {
  return (
    <Card className="p-6 sm:p-7">
      <Timeline>
        {updates.map((u) => (
          <TimelineItem
            key={u.id}
            marker={u.official ? "blue" : UPDATE_CATEGORY_TONES[u.category]}
            leading={
              u.official ? (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-lv-blue-soft text-lv-blue"
                  aria-hidden
                >
                  <BadgeCheck className="h-5 w-5" />
                </div>
              ) : (
                u.startup && (
                  <StartupLogo
                    name={u.startup.name}
                    logoUrl={u.startup.logoUrl}
                    size="sm"
                  />
                )
              )
            }
            meta={
              <>
                {u.official ? (
                  <>
                    <span className="text-sm font-bold text-lv-text">
                      Lovedis-Team
                    </span>
                    <Badge tone="blue">
                      <BadgeCheck className="h-3 w-3" />
                      Offiziell
                    </Badge>
                  </>
                ) : (
                  u.startup && (
                    <Link
                      href={`/discover/${u.startup.id}`}
                      className="text-sm font-bold text-lv-text hover:text-lv-blue"
                    >
                      {u.startup.name}
                    </Link>
                  )
                )}
                <UpdateCategoryBadge value={u.category} />
                <span className="text-xs text-lv-secondary">
                  {formatDate(u.createdAt)}
                </span>
              </>
            }
            title={u.title}
          >
            <p className="whitespace-pre-wrap">{u.body}</p>
          </TimelineItem>
        ))}
      </Timeline>
    </Card>
  );
}
