import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export function TableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-x-auto lv-scroll", className)}>
      <table className="w-full text-sm">{children}</table>
    </Card>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-lv-surface text-lv-secondary uppercase tracking-wide text-xs">
      {children}
    </thead>
  );
}

export function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-4 py-3 text-left font-semibold", className)}
      {...props}
    />
  );
}

export function Tr({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-t border-lv-border hover:bg-lv-surface/50 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
