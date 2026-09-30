import { ChevronDown, MapPin } from "lucide-react";
import {
  WORKSHOP_FORMAT_LABELS,
  formatWorkshopWhen,
  parseDescription,
  type ProgramWorkshop,
} from "@/lib/program-workshops";

function WorkshopDescription({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-lv-text">
      {parseDescription(text).map((block, i) =>
        block.kind === "heading" ? (
          <p key={i} className="pt-1 font-semibold text-lv-text">
            {block.text}
          </p>
        ) : (
          <p key={i}>
            {block.segments.map((s, j) =>
              s.bold ? (
                <strong key={j} className="font-semibold">
                  {s.text}
                </strong>
              ) : (
                s.text
              )
            )}
          </p>
        )
      )}
    </div>
  );
}

function WorkshopMeta({ workshop }: { workshop: ProgramWorkshop }) {
  const when = formatWorkshopWhen(workshop);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-lv-secondary">
      <span>{when ?? "Termin folgt"}</span>
      {workshop.format && (
        <span className="rounded-full bg-lv-surface px-2 py-0.5 font-medium text-lv-text">
          {WORKSHOP_FORMAT_LABELS[workshop.format]}
        </span>
      )}
    </span>
  );
}

function WorkshopLocation({ workshop }: { workshop: ProgramWorkshop }) {
  if (!workshop.location) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-lv-secondary">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-lv-blue" strokeWidth={2} />
      <span className="font-medium text-lv-text">{workshop.location}</span>
      {workshop.locationUrl && (
        <>
          <span aria-hidden>·</span>
          <a
            href={workshop.locationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-lv-blue hover:underline"
          >
            Anreise
          </a>
        </>
      )}
    </p>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lv-blue-soft text-xs font-semibold text-lv-blue">
      {n}
    </span>
  );
}

/** Numbered workshop series; entries with a description expand on click. */
export function WorkshopList({ workshops }: { workshops: ProgramWorkshop[] }) {
  return (
    <div className="border-t border-lv-border pt-4">
      <p className="text-sm font-semibold text-lv-text">
        {workshops.length} Workshops
      </p>
      <ol className="mt-2 space-y-2">
        {workshops.map((w, i) => {
          const heading = (
            <>
              <StepNumber n={i + 1} />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block font-medium text-lv-text">{w.title}</span>
                <WorkshopMeta workshop={w} />
              </span>
            </>
          );
          if (!w.description && !w.location) {
            return (
              <li key={`${i}-${w.title}`} className="flex items-start gap-3 px-3 py-2 text-sm">
                {heading}
              </li>
            );
          }
          return (
            <li key={`${i}-${w.title}`}>
              <details className="group rounded-lg border border-lv-border">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2 text-sm hover:bg-lv-surface [&::-webkit-details-marker]:hidden">
                  {heading}
                  <ChevronDown
                    className="mt-0.5 h-4 w-4 shrink-0 text-lv-secondary transition-transform group-open:rotate-180"
                    strokeWidth={2}
                  />
                </summary>
                <div className="space-y-3 border-t border-lv-border px-3 py-3 pl-12">
                  <WorkshopLocation workshop={w} />
                  {w.description && <WorkshopDescription text={w.description} />}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
