import { Eye } from "lucide-react";

/**
 * "Admin-Sicht / Vorschau" banner shown when an internal team member (ADMIN /
 * MEMBER) is viewing a startup-facing Venture-Platform surface. Makes the
 * persona switch explicit so the team knows they see exactly what startups see.
 */
export function PreviewBanner({
  title = "Admin-Sicht",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-lv-blue-soft bg-lv-blue-soft px-4 py-3 text-sm text-lv-blue">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">{title} · </span>
        {children}
      </p>
    </div>
  );
}
