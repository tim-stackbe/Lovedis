import { CalendarRange, Layers, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PictogramChip } from "@/components/ui/PictogramChip";

/**
 * Static LOVEDIS Roadmap content, rendered inside the shared "Roadmap" section
 * of {@link HubContent}. Because HubContent is shared by the partner hub and the
 * startup venture platform, both roles see the same roadmap.
 *
 * The 4 phases, the batch context line and the dual-track accelerator callout
 * come straight from the LOVEDIS Roadmap (Notion). Only the phases map to the
 * DB RoadmapItem model, so the whole block is kept static (like the MediaKit)
 * to render identically for both audiences with no DB mutation.
 * Content source: LOVEDIS Roadmap (Notion), 2026.
 */

const BATCH_CONTEXT =
  "Industry Accelerator – Daten, KI & Automatisierung: Batch 1 – " +
  "September bis Dezember 2026";

/** Phase overview table: title, timeframe (Zeitraum) and status. */
const PHASES = [
  { title: "1 — Kick-off", period: "1. September", status: "Ausstehend" },
  { title: "2 — Matching", period: "September", status: "Ausstehend" },
  { title: "3 — Deep Dive", period: "Okt – Dez", status: "Ausstehend" },
  { title: "4 — Closing", period: "Januar", status: "Ausstehend" },
] as const;

/** Dual-track accelerator: Basis + optionaler 1:1-Accelerator. */
const TRACKS = [
  {
    name: "Basis-Accelerator",
    lead: "Anbahnung",
    body:
      "Fundament für die Zusammenarbeit. Definition möglicher Use Cases & " +
      "allgemeines Sparring mit Insights aus der Industrie, sowie Zugang zu " +
      "Expert:innen aus dem branchenübergreifenden Ökosystem.",
    duration: "3 Monate",
  },
  {
    name: "1:1-Accelerator (optional)",
    lead: "Verlängerung",
    body:
      "Konkrete Zusammenarbeit mit den Partnern in realen Industrieumgebungen " +
      "mittels Pilotierung, Validierung, Co-Entwicklung, LOI etc.",
    duration: "3–6 Monate (im Anschluss an den Basis-Accelerator)",
  },
] as const;

/** The full static LOVEDIS Roadmap (Batch 1 industry accelerator). */
export function Roadmap() {
  return (
    <div className="space-y-4">
      {/* Batch context header */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <PictogramChip icon={Rocket} tone="pink" size="lg" />
          <div>
            <p className="lv-wordmark text-xs text-lv-blue">Batch 1 · 2026</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-lv-text">
              {BATCH_CONTEXT}
            </h3>
          </div>
        </div>
      </Card>

      {/* Phase overview — timeline of the 4 phases */}
      <div className="relative space-y-4 border-l-2 border-lv-border pl-6">
        {PHASES.map((phase) => (
          <div key={phase.title} className="relative">
            <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-lv-blue" />
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-lv-text">
                    {phase.title}
                  </h3>
                  <span className="text-xs font-medium text-lv-secondary">
                    · {phase.period}
                  </span>
                </div>
                <Badge tone="muted">{phase.status}</Badge>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Dualer Accelerator callout */}
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <PictogramChip icon={Layers} tone="info" size="sm" />
          <h4 className="text-base font-bold tracking-tight text-lv-text">
            Dualer Accelerator
          </h4>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-lv-secondary">
          Der Accelerator besteht aus zwei aufeinander aufbauenden Tracks: einem
          gemeinsamen Basis-Accelerator und einer optionalen 1:1-Vertiefung.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TRACKS.map((track) => (
            <div
              key={track.name}
              className="flex flex-col gap-3 rounded-card border border-lv-border bg-lv-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-sm font-bold text-lv-text">{track.name}</h5>
                <Badge tone="blue">{track.lead}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-lv-secondary">
                {track.body}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-lv-secondary">
                <CalendarRange className="h-4 w-4 shrink-0 text-lv-blue" strokeWidth={1.75} />
                <span>
                  <span className="font-semibold text-lv-text">Dauer:</span>{" "}
                  {track.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
