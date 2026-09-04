import { CalendarRange, Check, Layers, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PictogramChip } from "@/components/ui/PictogramChip";

/**
 * Static LOVEDIS Roadmap content, rendered inside the shared "Roadmap" section
 * of {@link HubContent}. Because HubContent is shared by the partner hub and the
 * startup venture platform, both roles see the same roadmap.
 *
 * The batch context line, the phase-grouped milestone timeline and the
 * dual-track accelerator callout come straight from the LOVEDIS Roadmap
 * (Notion). The milestone detail lived in an embedded Notion database and is
 * kept static (like the MediaKit) to render identically for both audiences
 * with no DB mutation.
 *
 * Status note: the Notion DB lists every milestone as "Ausstehend"; Phase 1
 * (Kick-off) is intentionally shown as done/green per LOVEDIS.
 * Content source: LOVEDIS Roadmap (Notion), 2026.
 */

const BATCH_CONTEXT =
  "Industry Accelerator – Wissensmanagement: Batch 1 – " +
  "September bis Dezember 2026";

interface Milestone {
  date: string;
  title: string;
  type: string;
  details: string;
}

interface Phase {
  title: string;
  period: string;
  status: string;
  tone: BadgeTone;
  done?: boolean;
  milestones: Milestone[];
}

/**
 * Phase-grouped milestone timeline. Each phase carries its status badge (Phase
 * 1 = green "Erledigt", the rest muted "Ausstehend") and its dated milestones.
 */
const PHASES: Phase[] = [
  {
    title: "Phase 1 — Kick-off",
    period: "1. September",
    status: "Erledigt",
    tone: "mint",
    done: true,
    milestones: [
      {
        date: "31.08.",
        title: "Roadshow bei Unternehmenspartnern",
        type: "Event vor Ort",
        details:
          "Wir bringen die Startups direkt zu unseren drei großen Industry " +
          "Partnern, in die Produktion und in direkten Kontakt mit " +
          "Geschäftsführung und Verantwortlichen.",
      },
      {
        date: "01.09.",
        title: "Demo Day & Kick-off des Accelerators",
        type: "Event vor Ort",
        details:
          "LOVE DISRUPTION '26 und Startschuss des Industry Accelerators im " +
          "Lokschuppen Marburg: Startup-Pitches und Netzwerken.",
      },
    ],
  },
  {
    title: "Phase 2 — Matching",
    period: "September",
    status: "Ausstehend",
    tone: "muted",
    milestones: [
      {
        date: "07.09. – 17.09.",
        title: "Feedback zu Partnern / Startups / Expert:innen",
        type: "To Do Startup / Partner",
        details:
          "Wir sammeln jeweils Feedback zu den Startups und unseren " +
          "Unternehmenspartnern und möglichen use-cases. Als Startup liefert " +
          "ihr uns außerdem Feedback zu weiteren Bedarfen.",
      },
      {
        date: "September",
        title: "Matchmaking durch LOVEDIS",
        type: "To Do LOVEDIS",
        details:
          "Auf Basis des Feedbacks von Startups und Unternehmenspartnern " +
          "nehmen wir ein erstes Matchmaking vor.",
      },
    ],
  },
  {
    title: "Phase 3 — Deep Dive",
    period: "Okt – Dez",
    status: "Ausstehend",
    tone: "muted",
    milestones: [
      {
        date: "Oktober",
        title: "Folgegespräche Startups ↔ Unternehmenspartner",
        type: "Online Calls",
        details:
          "Wir initiieren Gespräche, um über mögliche use-cases und konkrete " +
          "Anknüpfungspunkte zu sprechen.",
      },
      {
        date: "Oktober – Dezember",
        title: "Mentoring & Sparring durch LOVEDIS und Unternehmenspartner",
        type: "Online Calls",
        details:
          "LOVEDIS sowie ausgewählte Mentor:innen der Unternehmenspartner " +
          "begleiten die Startups durch den Accelerator und stehen für " +
          "Sparring zur Verfügung.",
      },
      {
        date: "Oktober – Dezember",
        title: "Experten-Sessions nach Bedarf",
        type: "Online Workshops",
        details:
          "Als Startups könnt ihr euch über unsere Notion-Marketplace Seite " +
          "mögliche Sessions mit ausgewählten Expert:innen aus den Bereichen " +
          "Legal, Fundraising, Product & Tech, Marketing, Sales, HR und " +
          "Pricing einsehen und anfragen.",
      },
    ],
  },
  {
    title: "Phase 4 — Closing",
    period: "Januar",
    status: "Ausstehend",
    tone: "muted",
    milestones: [
      {
        date: "Mitte Januar",
        title: "Closing des Industry Accelerators",
        type: "Event vor Ort",
        details: "Closing des Industry Accelerators.",
      },
    ],
  },
];

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

/** A single dated milestone card on the phase timeline. */
function MilestoneCard({ item, done }: { item: Milestone; done?: boolean }) {
  return (
    <div className="relative">
      <span
        className={
          "absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white " +
          (done ? "bg-lv-mint-deep" : "bg-lv-blue")
        }
      />
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {done && (
              <Check
                className="h-3.5 w-3.5 shrink-0 text-lv-mint-deep"
                strokeWidth={2.5}
              />
            )}
            <span className="text-xs font-semibold text-lv-blue">
              {item.date}
            </span>
            <h4 className="text-sm font-bold text-lv-text">{item.title}</h4>
          </div>
          <Badge tone="muted">{item.type}</Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-lv-secondary">
          {item.details}
        </p>
      </Card>
    </div>
  );
}

/** The full static LOVEDIS Roadmap (Batch 1 industry accelerator). */
export function Roadmap() {
  return (
    <div className="space-y-6">
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

      {/* Phase-grouped milestone timeline */}
      <div className="space-y-6">
        {PHASES.map((phase) => (
          <div key={phase.title} className="space-y-3">
            {/* Phase header with status badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-base font-bold tracking-tight text-lv-text">
                  {phase.title}
                </h3>
                <span className="text-xs font-medium text-lv-secondary">
                  · {phase.period}
                </span>
              </div>
              <Badge tone={phase.tone}>
                {phase.done && (
                  <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                )}
                {phase.status}
              </Badge>
            </div>

            {/* Milestones for this phase */}
            <div className="relative space-y-3 border-l-2 border-lv-border pl-6">
              {phase.milestones.map((m) => (
                <MilestoneCard
                  key={`${m.date}-${m.title}`}
                  item={m}
                  done={phase.done}
                />
              ))}
            </div>
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
                <CalendarRange
                  className="h-4 w-4 shrink-0 text-lv-blue"
                  strokeWidth={1.75}
                />
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
