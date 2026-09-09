import {
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  Coins,
  Compass,
  Download,
  FileText,
  FlaskConical,
  GitCompare,
  Handshake,
  Inbox,
  Layers,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Map as MapIcon,
  Newspaper,
  Radar,
  Rocket,
  Send,
  Share2,
  Target,
} from "lucide-react";

import {
  CreditsIcon,
  GraduationCapIcon,
  InboxIcon,
  UsersIcon,
  VentureIcon,
  type IconRenderer,
} from "@/components/icons/lovedis";
import {
  PopArtIllustration,
  type PopArtIllustrationName,
} from "@/components/illustrations/popart";
import { Card } from "@/components/ui/Card";

/**
 * Maps the legacy `icon` component that a call site already passes to the
 * closest large Pop-Art illustration. Keys are component identities (stable for
 * both lucide-react and the bespoke Lovedis glyphs), so existing call sites keep
 * working untouched — they simply render a richer illustration now.
 */
const ICON_TO_ILLUSTRATION = new Map<IconRenderer, PopArtIllustrationName>([
  // Startups / discovery / launch
  [Compass, "rocket"],
  [Rocket, "rocket"],
  // Inbox / requests / notifications / sends
  [Inbox, "inbox"],
  [InboxIcon, "inbox"],
  [Bell, "inbox"],
  [Send, "inbox"],
  // Roadmap / map
  [MapIcon, "roadmap"],
  // Data / charts / comparisons
  [BarChart3, "chart"],
  [GitCompare, "chart"],
  [Share2, "chart"],
  [LayoutGrid, "chart"],
  // People / collaboration
  [Handshake, "people"],
  [UsersIcon, "people"],
  // Documents / lists / applications
  [FileText, "documents"],
  [Newspaper, "documents"],
  [ListChecks, "documents"],
  [ClipboardCheck, "documents"],
  [Download, "documents"],
  [Building2, "documents"],
  [GraduationCapIcon, "documents"],
  // Wallet / credits
  [Coins, "wallet"],
  [CreditsIcon, "wallet"],
  // Target / radar / goals
  [Target, "target"],
  [Radar, "target"],
  // Generic "nothing here"
  [Layers, "empty"],
  [FlaskConical, "empty"],
  [Lightbulb, "empty"],
  [VentureIcon, "empty"],
]);

function resolveIllustration(
  illustration: PopArtIllustrationName | undefined,
  icon: IconRenderer | undefined
): PopArtIllustrationName {
  if (illustration) return illustration;
  if (icon) return ICON_TO_ILLUSTRATION.get(icon) ?? "empty";
  return "empty";
}

interface EmptyStateProps {
  /**
   * Legacy pictogram component. Still accepted for backward compatibility: when
   * `illustration` isn't set it's mapped to the closest Pop-Art illustration.
   */
  icon?: IconRenderer;
  /** Explicitly pick the large Pop-Art illustration (wins over `icon`). */
  illustration?: PopArtIllustrationName;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Shared empty state. Renders a LARGE, bold Pop-Art illustration (thick black
 * keylines + halftone + brand blue/coral + coral-heart signature) on the light
 * card surface. The illustration is chosen from the explicit `illustration`
 * prop, otherwise mapped from the legacy `icon` component, defaulting to a
 * generic "nothing here" box.
 */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
}: EmptyStateProps) {
  const name = resolveIllustration(illustration, icon);
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <PopArtIllustration name={name} size={132} title={title} />
      <h3 className="mt-5 text-base font-bold text-lv-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-lv-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
