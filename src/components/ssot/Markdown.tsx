import { Fragment } from "react";

/**
 * Deliberately tiny, dependency-free Markdown renderer for SSOT content pages.
 * Supports headings (#, ##, ###), unordered lists (-), bold (**…**) and
 * paragraphs. Builds React nodes (no dangerouslySetInnerHTML) so it is safe by
 * construction. Rich Markdown is a documented follow-up.
 */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = [...list];
    blocks.push(
      <ul key={`ul-${key++}`} className="ml-4 list-disc space-y-1">
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h4 key={key++} className="mt-4 text-sm font-bold text-lv-text">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h3 key={key++} className="mt-5 text-base font-bold text-lv-text">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h2 key={key++} className="mt-5 text-lg font-bold text-lv-text">
          {renderInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-lv-text">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

/** Renders inline **bold** segments; everything else stays plain text. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
