"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
  latestScore: number | null;
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
        <ScorePill score={startup.latestScore} />
      </div>
      <Badge tone="pink" className="mt-2">
        {startup.industry}
      </Badge>
    </div>
  );
}

function DraggableCard({ startup }: { startup: PipelineStartup }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: startup.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <StartupCard startup={startup} />
    </div>
  );
}

function Column({
  stage,
  startups,
}: {
  stage: PipelineStage;
  startups: PipelineStartup[];
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
          <DraggableCard key={s.id} startup={s} />
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const stage = String(over.id) as PipelineStage;
    if (!PIPELINE_STAGES.includes(stage)) return;
    const startup = optimistic.find((s) => s.id === String(active.id));
    if (!startup || startup.pipelineStage === stage) return;

    startTransition(async () => {
      applyOptimistic({ id: startup.id, stage });
      await updatePipelineStage(startup.id, stage);
    });
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
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <StartupCard startup={active} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
