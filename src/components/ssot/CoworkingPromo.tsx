import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { PictogramChip } from "@/components/ui/PictogramChip";

const COWORKING_URL = "https://lovedis.de/de/coworking";
const COWORKING_EMAIL = "info@lovedis.de";

/** Coworking offer shown in Section 02 for startups only (Venture Platform). */
export function CoworkingPromo() {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <PictogramChip icon={Building2} tone="info" size="sm" />
          <div className="min-w-0 space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-lv-text">
              Coworking im LOKSCHUPPEN Marburg
            </h3>
            <p className="text-sm leading-relaxed text-lv-secondary">
              Wir schenken dir 3 Monate gratis einen Flex-Desk im Coworking
              Space im LOKSCHUPPEN Marburg. Interesse?
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton
                href={COWORKING_URL}
                target="_blank"
                rel="noreferrer"
                size="sm"
              >
                Zur Website
              </LinkButton>
              <LinkButton href={`mailto:${COWORKING_EMAIL}`} variant="secondary" size="sm">
                Direkt anfragen
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
