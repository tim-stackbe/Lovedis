interface SectionLabelProps {
  number: string;
  label: string;
  title: string;
  actions?: React.ReactNode;
}

/** Editorial numbered section header with a rule line. */
export function SectionLabel({
  number,
  label,
  title,
  actions,
}: SectionLabelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="lv-wordmark text-xs text-lv-blue shrink-0">
          Section {number} — {label}
        </span>
        <span className="h-px flex-1 bg-lv-border" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
          {title}
        </h2>
        {actions}
      </div>
    </div>
  );
}
