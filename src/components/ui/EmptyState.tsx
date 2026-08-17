import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PictogramChip, type PictogramTone } from "@/components/ui/PictogramChip";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  /** Brand tone for the pictogram chip (defaults to the blue "info" tone). */
  tone?: PictogramTone;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "info",
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <PictogramChip icon={icon} tone={tone} size="lg" />
      <h3 className="mt-4 text-base font-bold text-lv-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-lv-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
