"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { RadarQuadrant, RadarRing } from "@/generated/prisma/enums";
import {
  RADAR_QUADRANTS,
  RADAR_QUADRANT_LABELS,
  RADAR_RINGS,
  RADAR_RING_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface RadarStartup {
  id: string;
  name: string;
  quadrant: RadarQuadrant;
  ring: RadarRing;
  latestScore: number | null;
}

const SIZE = 640;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 40;

const QUADRANT_COLORS: Record<RadarQuadrant, string> = {
  AI_DATA: "#2926E5",
  CLIMATE_ENERGY: "#0E7C4A",
  HEALTH_BIO: "#FF5736",
  INDUSTRY_40: "#7A5A00",
};

/** Deterministic hash → [0, 1) so blips keep stable positions. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function blipPosition(startup: RadarStartup): { x: number; y: number } {
  const qIndex = RADAR_QUADRANTS.indexOf(startup.quadrant);
  const rIndex = RADAR_RINGS.indexOf(startup.ring);

  const angleStart = qIndex * 90 + 8;
  const angleSpan = 90 - 16;
  const angle =
    ((angleStart + hash01(startup.id) * angleSpan) * Math.PI) / 180;

  const ringWidth = RADIUS / RADAR_RINGS.length;
  const rInner = rIndex * ringWidth + ringWidth * 0.2;
  const rSpan = ringWidth * 0.6;
  const radius = rInner + hash01(startup.id + startup.name) * rSpan;

  return {
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
}

export function RadarView({ startups }: { startups: RadarStartup[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<RadarQuadrant | null>(
    null
  );

  const visible = useMemo(
    () =>
      activeQuadrant
        ? startups.filter((s) => s.quadrant === activeQuadrant)
        : startups,
    [startups, activeQuadrant]
  );

  const hoveredStartup = startups.find((s) => s.id === hovered);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card className="p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto w-full max-w-2xl"
          role="img"
          aria-label="Technology radar"
        >
          {/* Rings */}
          {RADAR_RINGS.map((ring, i) => {
            const r = ((i + 1) * RADIUS) / RADAR_RINGS.length;
            return (
              <g key={ring}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={r}
                  fill="none"
                  stroke="#E5E5EE"
                  strokeWidth={1.5}
                />
                <text
                  x={CENTER + 6}
                  y={CENTER - r + 16}
                  fontSize={11}
                  fill="#6B6B7B"
                  className="uppercase"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {RADAR_RING_LABELS[ring]}
                </text>
              </g>
            );
          })}

          {/* Quadrant axes */}
          <line
            x1={CENTER}
            y1={CENTER - RADIUS}
            x2={CENTER}
            y2={CENTER + RADIUS}
            stroke="#E5E5EE"
            strokeWidth={1.5}
          />
          <line
            x1={CENTER - RADIUS}
            y1={CENTER}
            x2={CENTER + RADIUS}
            y2={CENTER}
            stroke="#E5E5EE"
            strokeWidth={1.5}
          />

          {/* Quadrant labels */}
          {RADAR_QUADRANTS.map((q, i) => {
            const positions = [
              { x: CENTER + RADIUS * 0.55, y: CENTER - RADIUS - 14 },
              { x: CENTER + RADIUS * 0.55, y: CENTER + RADIUS + 26 },
              { x: CENTER - RADIUS * 0.55, y: CENTER + RADIUS + 26 },
              { x: CENTER - RADIUS * 0.55, y: CENTER - RADIUS - 14 },
            ];
            return (
              <text
                key={q}
                x={positions[i].x}
                y={positions[i].y}
                fontSize={13}
                fontWeight={700}
                fill={QUADRANT_COLORS[q]}
                textAnchor="middle"
                style={{ letterSpacing: "0.05em" }}
              >
                {RADAR_QUADRANT_LABELS[q].toUpperCase()}
              </text>
            );
          })}

          {/* Blips */}
          {visible.map((s) => {
            const { x, y } = blipPosition(s);
            const isHovered = hovered === s.id;
            return (
              <Link key={s.id} href={`/startups/${s.id}`}>
                <g
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 10 : 7}
                    fill={QUADRANT_COLORS[s.quadrant]}
                    fillOpacity={isHovered ? 1 : 0.85}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  {isHovered && (
                    <text
                      x={x}
                      y={y - 16}
                      fontSize={12}
                      fontWeight={600}
                      fill="#0A0A0F"
                      textAnchor="middle"
                    >
                      {s.name}
                    </text>
                  )}
                </g>
              </Link>
            );
          })}
        </svg>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <p className="lv-wordmark mb-3 text-[10px] text-lv-blue">Quadrants</p>
          <div className="space-y-1">
            <button
              onClick={() => setActiveQuadrant(null)}
              className={cn(
                "w-full rounded-button px-3 py-2 text-left text-sm transition-colors",
                activeQuadrant === null
                  ? "bg-lv-blue-soft font-semibold text-lv-blue"
                  : "hover:bg-lv-surface"
              )}
            >
              All quadrants ({startups.length})
            </button>
            {RADAR_QUADRANTS.map((q) => {
              const count = startups.filter((s) => s.quadrant === q).length;
              return (
                <button
                  key={q}
                  onClick={() =>
                    setActiveQuadrant((cur) => (cur === q ? null : q))
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-button px-3 py-2 text-left text-sm transition-colors",
                    activeQuadrant === q
                      ? "bg-lv-blue-soft font-semibold text-lv-blue"
                      : "hover:bg-lv-surface"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: QUADRANT_COLORS[q] }}
                  />
                  <span className="flex-1">{RADAR_QUADRANT_LABELS[q]}</span>
                  <span className="text-xs text-lv-secondary">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <p className="lv-wordmark mb-3 text-[10px] text-lv-blue">
            {hoveredStartup ? "Selected" : "On the radar"}
          </p>
          {hoveredStartup ? (
            <div>
              <p className="text-sm font-bold">{hoveredStartup.name}</p>
              <p className="mt-1 text-xs text-lv-secondary">
                {RADAR_QUADRANT_LABELS[hoveredStartup.quadrant]} ·{" "}
                {RADAR_RING_LABELS[hoveredStartup.ring]}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {visible.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/startups/${s.id}`}
                    className="flex items-center gap-2 hover:text-lv-blue"
                    onMouseEnter={() => setHovered(s.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: QUADRANT_COLORS[s.quadrant] }}
                    />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-xs text-lv-secondary">
                      {RADAR_RING_LABELS[s.ring]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
