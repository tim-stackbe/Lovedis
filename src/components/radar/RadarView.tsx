"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { RadarQuadrant, RadarRing } from "@/generated/prisma/enums";
import {
  RADAR_QUADRANTS,
  RADAR_QUADRANT_LABELS,
  RADAR_RINGS,
  RADAR_RING_DESCRIPTIONS,
  RADAR_RING_LABELS,
} from "@/lib/constants";
import { cn, formatScore } from "@/lib/utils";

export interface RadarStartup {
  id: string;
  name: string;
  quadrant: RadarQuadrant;
  ring: RadarRing;
  /** Team-consensus weighted total (0–5) for context (null = not yet scored). */
  consensusScore: number | null;
}

const SIZE = 640;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 40;

// One colour per technology field. Placement stays manual and is independent of
// the weighted score.
const QUADRANT_COLORS: Record<RadarQuadrant, string> = {
  AI_DATA: "#2926E5",
  CLIMATE_ENERGY: "#0E7C4A",
  CONSTRUCTION: "#7A5A00",
  HEALTH_TECH: "#FF5736",
  INDUSTRY: "#8A2BE2",
};

const SECTOR_COUNT = RADAR_QUADRANTS.length;
const SECTOR_SPAN = 360 / SECTOR_COUNT;

/** Deterministic hash → [0, 1) so blips keep stable positions. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Point on the circle at `degrees` (0° = top, clockwise) and `radius`. */
function polar(degrees: number, radius: number): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

function blipPosition(startup: RadarStartup): { x: number; y: number } {
  const qIndex = RADAR_QUADRANTS.indexOf(startup.quadrant);
  const rIndex = RADAR_RINGS.indexOf(startup.ring);

  const pad = SECTOR_SPAN * 0.12;
  const angleStart = qIndex * SECTOR_SPAN + pad;
  const angleSpan = SECTOR_SPAN - pad * 2;
  const angle = angleStart + hash01(startup.id) * angleSpan;

  const ringWidth = RADIUS / RADAR_RINGS.length;
  const rInner = rIndex * ringWidth + ringWidth * 0.2;
  const rSpan = ringWidth * 0.6;
  const radius = rInner + hash01(startup.id + startup.name) * rSpan;

  return polar(angle, radius);
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
          aria-label="Technologie-Radar"
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

          {/* Sector dividers */}
          {RADAR_QUADRANTS.map((q, i) => {
            const { x, y } = polar(i * SECTOR_SPAN, RADIUS);
            return (
              <line
                key={`divider-${q}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="#E5E5EE"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Sector labels (placed just outside each sector's mid-angle) */}
          {RADAR_QUADRANTS.map((q, i) => {
            const mid = (i + 0.5) * SECTOR_SPAN;
            const { x, y } = polar(mid, RADIUS + 18);
            const anchor =
              Math.abs(Math.sin((mid * Math.PI) / 180)) < 0.35
                ? "middle"
                : mid < 180
                  ? "start"
                  : "end";
            return (
              <text
                key={`label-${q}`}
                x={x}
                y={y}
                fontSize={12}
                fontWeight={700}
                fill={QUADRANT_COLORS[q]}
                textAnchor={anchor}
                dominantBaseline="middle"
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
              <Link
                key={s.id}
                href={`/startups/${s.id}`}
                aria-label={s.name}
                className="focus:outline-none"
                onFocus={() => setHovered(s.id)}
                onBlur={() => setHovered(null)}
              >
                <g
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(s.id)}
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
                      {s.consensusScore != null
                        ? ` · ${formatScore(s.consensusScore)}`
                        : ""}
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
          <p className="lv-wordmark mb-3 text-[10px] text-lv-blue">
            Technologiefelder
          </p>
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
              Alle Felder ({startups.length})
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
            Ringe — so liest du sie
          </p>
          <ul className="space-y-2">
            {RADAR_RINGS.map((ring, i) => (
              <li key={ring} className="flex gap-2 text-xs">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lv-blue-soft text-[9px] font-bold text-lv-blue">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-lv-text">
                    {RADAR_RING_LABELS[ring]}
                  </span>
                  <span className="text-lv-secondary">
                    {" "}
                    — {RADAR_RING_DESCRIPTIONS[ring]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <p className="lv-wordmark mb-3 text-[10px] text-lv-blue">
            {hoveredStartup ? "Ausgewählt" : "Im Radar"}
          </p>
          {hoveredStartup ? (
            <div>
              <p className="text-sm font-bold">{hoveredStartup.name}</p>
              <p className="mt-1 text-xs text-lv-secondary">
                {RADAR_QUADRANT_LABELS[hoveredStartup.quadrant]} ·{" "}
                {RADAR_RING_LABELS[hoveredStartup.ring]}
              </p>
              <p className="mt-1 text-xs text-lv-secondary">
                Konsens-Score:{" "}
                <span className="font-semibold text-lv-text">
                  {hoveredStartup.consensusScore != null
                    ? `${formatScore(hoveredStartup.consensusScore)} / 5`
                    : "—"}
                </span>
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
                      {s.consensusScore != null
                        ? formatScore(s.consensusScore)
                        : RADAR_RING_LABELS[s.ring]}
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
