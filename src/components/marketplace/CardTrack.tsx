"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CardTrackProps {
  /** Accessible label for the scrollable region (e.g. the section title). */
  ariaLabel: string;
  children: React.ReactNode;
}

/**
 * Horizontally scrollable "Netflix-row" track with scroll-snap, a thin
 * scrollbar and desktop chevron affordances. Degrades to native horizontal
 * swipe on touch/mobile (chevrons hidden). The scroll region is focusable and
 * responds to Arrow keys for keyboard users; the cards inside are links and
 * remain individually focusable.
 */
export function CardTrack({ ariaLabel, children }: CardTrackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateAffordances = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateAffordances();
    const el = ref.current;
    if (!el) return;
    window.addEventListener("resize", updateAffordances);
    return () => window.removeEventListener("resize", updateAffordances);
  }, [updateAffordances]);

  const scrollByAmount = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByAmount(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByAmount(-1);
      }
    },
    [scrollByAmount]
  );

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        aria-label="Zurück scrollen"
        tabIndex={-1}
        className={
          "absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-lv-border bg-white text-lv-text shadow-card transition hover:bg-lv-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 md:flex " +
          (canPrev ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={updateAffordances}
        onKeyDown={onKeyDown}
        className="lv-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        aria-label="Weiter scrollen"
        tabIndex={-1}
        className={
          "absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-lv-border bg-white text-lv-text shadow-card transition hover:bg-lv-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 md:flex " +
          (canNext ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
