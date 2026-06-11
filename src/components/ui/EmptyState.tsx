import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lv-blue-soft text-lv-blue">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-bold text-lv-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-lv-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
