import {
  parseChallengeDescription,
  type ChallengeDescriptionBlock,
} from "@/lib/challenge-description";

function Block({ block }: { block: ChallengeDescriptionBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="mt-6 border-b border-lv-border pb-1.5 text-sm font-bold uppercase tracking-wide text-lv-text first:mt-0">
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p className="mt-3 text-sm leading-relaxed text-lv-text/90 first:mt-0">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-lv-text/90">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-lv-text/90">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
  }
}

/** Structured challenge body with bold section headings and list formatting. */
export function ChallengeDescription({ description }: { description: string }) {
  const blocks = parseChallengeDescription(description);

  if (blocks.length === 0) {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-lv-text/90">
        {description}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => (
        <Block key={`${block.type}-${i}`} block={block} />
      ))}
    </div>
  );
}
