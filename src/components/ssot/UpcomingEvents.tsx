import { CalendarRange, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PictogramChip } from "@/components/ui/PictogramChip";

/**
 * Static upcoming-event cards for the shared "Wissenswertes" section of
 * {@link HubContent}. Partner-Hub and Startup-Übersicht (Venture Platform) both
 * render the same content.
 */

interface HubEvent {
  title: string;
  date?: string;
  location?: string;
  guests?: string;
  body?: React.ReactNode;
  upcoming?: boolean;
}

const EVENTS: HubEvent[] = [
  {
    title: "LOVEDIS CONNECT | FOKUSTHEMA: HUMANOIDE ROBOTIK",
    date: "20.10.2026",
    location: "Lokschuppen Marburg",
    body: (
      <>
        Exklusive Veranstaltung als Side-Event der Disrupt from the Core mit
        Industrieunternehmen aus Mittelhessen, Startups aus dem Industry Badge
        sowie ausgewählten Gästen.{" "}
        <a
          href="https://luma.com/ihgvfxo9"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-lv-blue hover:underline"
        >
          Jetzt anmelden
        </a>
      </>
    ),
    upcoming: true,
  },
  {
    title: "Disrupt from the Core",
    date: "21.10.2026",
    location: "Lokschuppen Marburg",
    body: (
      <>
        Digitale Technologien und Künstliche Intelligenz verändern
        Geschäftsmodelle, Prozesse und Wertschöpfung grundlegend. Genau hier
        setzt Disrupt from the Core an: Das neue Festival macht Innovation und
        Transformation erlebbar, bringt neue Perspektiven zusammen und schafft
        Raum für Austausch, konkrete Anwendungen und gemeinsame Projekte.{" "}
        <a
          href="https://lovedis.de/de/events/disrupt-from-the-core"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-lv-blue hover:underline"
        >
          Zum Event
        </a>
      </>
    ),
    upcoming: true,
  },
];

function EventCard({ event }: { event: HubEvent }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <PictogramChip icon={CalendarRange} tone="pink" size="sm" />
          <div className="min-w-0 space-y-2">
            <h3 className="text-lg font-bold tracking-tight text-lv-text">
              {event.title}
            </h3>
            {event.location && (
              <p className="flex items-center gap-1.5 text-sm text-lv-secondary">
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-lv-blue"
                  strokeWidth={2}
                />
                {event.location}
              </p>
            )}
            {event.guests && (
              <p className="text-sm leading-relaxed text-lv-secondary">
                <span className="font-semibold text-lv-text">Gäste: </span>
                {event.guests}
              </p>
            )}
            {event.body && (
              <p className="text-sm leading-relaxed text-lv-secondary">
                {event.body}
              </p>
            )}
          </div>
        </div>
        {event.upcoming && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone="orange">Demnächst</Badge>
            {event.date && (
              <span className="text-xs text-lv-secondary">{event.date}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Upcoming LOVEDIS events shown in the Partner-Hub and Startup-Übersicht. */
export function UpcomingEvents() {
  return (
    <div className="space-y-4">
      {EVENTS.map((event) => (
        <EventCard key={event.title} event={event} />
      ))}
    </div>
  );
}
