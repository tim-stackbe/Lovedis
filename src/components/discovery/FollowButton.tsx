"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/discovery";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  startupId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function FollowButton({
  startupId,
  initialFollowing,
  size = "md",
  className,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !following;
    setFollowing(next); // optimistic
    startTransition(async () => {
      const res = await toggleFollow(startupId);
      if (res.error) {
        setFollowing(!next); // revert
        return;
      }
      if (typeof res.following === "boolean") setFollowing(res.following);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-button font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        following
          ? "bg-lv-mint text-lv-mint-deep hover:bg-lv-orange-soft hover:text-lv-orange"
          : "bg-lv-blue text-white hover:bg-lv-blue-dark",
        className
      )}
    >
      {following ? (
        <>
          <Check className="h-4 w-4" />
          Folge ich
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Folgen
        </>
      )}
    </button>
  );
}
