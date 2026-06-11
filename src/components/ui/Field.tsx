import { cn } from "@/lib/utils";

const INPUT_CLASSES =
  "w-full rounded-button border border-lv-border bg-white px-3.5 py-2.5 text-sm text-lv-text placeholder:text-lv-secondary/60 outline-none focus:ring-2 focus:ring-lv-blue/40 focus:border-lv-blue transition-shadow";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_CLASSES, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(INPUT_CLASSES, "min-h-24 resize-y", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(INPUT_CLASSES, "bg-white", className)} {...props} />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-xs font-semibold uppercase tracking-wider text-lv-secondary mb-1.5",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-lv-secondary">{hint}</p>}
    </div>
  );
}

export function ErrorChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-lv-orange bg-lv-orange-soft rounded-button px-3 py-2 text-sm font-medium">
      {children}
    </div>
  );
}

export function SuccessChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-lv-mint-deep bg-lv-mint/50 rounded-button px-3 py-2 text-sm font-medium">
      {children}
    </div>
  );
}
