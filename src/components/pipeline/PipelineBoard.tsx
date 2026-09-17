"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { updatePipelineStage } from "@/app/actions/startups";
import { ScorePill } from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import type { PipelineStage } from "@/generated/prisma/enums";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PipelineStartup {
  id: string;
  name: string;
  industry: string;
  pipelineStage: PipelineStage;
  /** Team-consensus weighted total (0–5), null when not yet scored. */
  consensusScore: number | null;
}

const STAGE_ACCENTS: Record<PipelineStage, string> = {
  DISCOVERED: "bg-lv-surface text-lv-secondary",
  SCREENING: "bg-lv-blue-soft text-lv-blue",
  IN_EVALUATION: "bg-lv-yellow text-lv-yellow-deep",
  PILOT: "bg-lv-pink text-lv-text",
  PARTNERED: "bg-lv-mint text-lv-mint-deep",
  PASSED: "bg-lv-orange-soft text-lv-orange",
};

function StartupCard({
  startup,
  dragging,
}: {
  startup: PipelineStartup;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-button border border-lv-border bg-white p-3 shadow-card",
        dragging && "rotate-2 opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/startups/${startup.id}`}
          className="text-sm font-semibold leading-tight hover:text-lv-blue"
        >
          {startup.name}
        </Link>
        <ScorePill score={startup.consensusScore} />
      </div>
      <Badge tone="pink" className="mt-2">
        {startup.industry}
      </Badge>
    </div>
  );
}

function DraggableCard({
  startup,
  onMove,
}: {
  startup: PipelineStartup;
  onMove: (id: string, stage: PipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: startup.id,
  });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      {/* Drag handle: touch-none only here so vertical page scroll still works elsewhere */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <StartupCard startup={startup} />
      </div>
      {/* Non-drag fallback for touch / small screens */}
      <label className="mt-1.5 block md:hidden">
        <span className="sr-only">Phase ändern</span>
        <select
          value={startup.pipelineStage}
          onChange={(e) => onMove(startup.id, e.target.value as PipelineStage)}
          className="w-full rounded-button border border-lv-border bg-lv-surface px-2 py-1.5 text-xs font-medium text-lv-text"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {PIPELINE_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Column({
  stage,
  startups,
  onMove,
}: {
  stage: PipelineStage;
  startups: PipelineStartup[];
  onMove: (id: string, stage: PipelineStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-card border bg-lv-surface/60 transition-colors",
        isOver ? "border-lv-blue bg-lv-blue-soft/60" : "border-lv-border"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            STAGE_ACCENTS[stage]
          )}
        >
          {PIPELINE_STAGE_LABELS[stage]}
        </span>
        <span className="text-xs font-semibold text-lv-secondary">
          {startups.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2 pt-0">
        {startups.map((s) => (
          <DraggableCard key={s.id} startup={s} onMove={onMove} />
        ))}
        {startups.length === 0 && (
          <div className="rounded-button border border-dashed border-lv-border p-4 text-center text-xs text-lv-secondary">
            Hier ablegen
          </div>
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({ startups }: { startups: PipelineStartup[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    startups,
    (current, update: { id: string; stage: PipelineStage }) =>
      current.map((s) =>
        s.id === update.id ? { ...s, pipelineStage: update.stage } : s
      )
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const moveStartup = (id: string, stage: PipelineStage) => {
    if (!PIPELINE_STAGES.includes(stage)) return;
    const startup = optimistic.find((s) => s.id === id);
    if (!startup || startup.pipelineStage === stage) return;

    startTransition(async () => {
      applyOptimistic({ id: startup.id, stage });
      await updatePipelineStage(startup.id, stage);
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    moveStartup(String(active.id), String(over.id) as PipelineStage);
  };

  const active = optimistic.find((s) => s.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 lv-scroll">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            startups={optimistic.filter((s) => s.pipelineStage === stage)}
            onMove={moveStartup}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <StartupCard startup={active} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
