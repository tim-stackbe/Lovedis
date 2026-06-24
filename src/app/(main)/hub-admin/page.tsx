import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import {
  deleteContentPage,
  deleteMediaAsset,
  deleteRoadmapItem,
} from "@/app/actions/ssot";
import {
  ContentAudienceBadge,
  RoadmapStatusBadge,
} from "@/components/shared/badges";
import { ContentPageForm } from "@/components/ssot/ContentPageForm";
import { MediaAssetForm } from "@/components/ssot/MediaAssetForm";
import { RoadmapItemForm } from "@/components/ssot/RoadmapItemForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "SSOT-Pflege" };

function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-button p-1.5 text-lv-secondary transition-colors hover:bg-lv-orange-soft hover:text-lv-orange"
        aria-label="Löschen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

export default async function HubAdminPage() {
  await requireTeam();

  const [roadmap, pages, media] = await Promise.all([
    prisma.roadmapItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.contentPage.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <HeroBanner
        kicker="Screening & SSOT"
        title="SSOT-Pflege"
        subtitle="Pflege Roadmap, Wissensseiten und Media-Kit zentral — Partner und Startups sehen je nach Sichtbarkeit ihre kuratierte Lesesicht."
      />

      <section className="space-y-4">
        <SectionLabel number="01" label="Roadmap" title="Roadmap-Einträge" />
        <Card className="space-y-3 divide-y divide-lv-border p-0">
          {roadmap.map((item) => (
            <details key={item.id} className="group p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lv-text">
                    {item.title}
                  </span>
                  {item.phase && (
                    <span className="text-xs text-lv-secondary">
                      {item.phase}
                    </span>
                  )}
                  <RoadmapStatusBadge value={item.status} />
                  <ContentAudienceBadge value={item.audience} />
                </div>
                <DeleteButton action={deleteRoadmapItem.bind(null, item.id)} />
              </summary>
              <div className="mt-4">
                <RoadmapItemForm item={item} />
              </div>
            </details>
          ))}
          {roadmap.length === 0 && (
            <p className="p-4 text-sm text-lv-secondary">
              Noch keine Roadmap-Einträge.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Neuer Roadmap-Eintrag
          </p>
          <RoadmapItemForm />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Wissen" title="Inhaltsseiten" />
        <Card className="space-y-3 divide-y divide-lv-border p-0">
          {pages.map((page) => (
            <details key={page.id} className="group p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lv-text">
                    {page.title}
                  </span>
                  <span className="text-xs text-lv-secondary">/{page.slug}</span>
                  <ContentAudienceBadge value={page.audience} />
                  <Badge tone={page.isPublished ? "mint" : "muted"}>
                    {page.isPublished ? "Veröffentlicht" : "Entwurf"}
                  </Badge>
                </div>
                <DeleteButton action={deleteContentPage.bind(null, page.id)} />
              </summary>
              <div className="mt-4">
                <ContentPageForm page={page} />
              </div>
            </details>
          ))}
          {pages.length === 0 && (
            <p className="p-4 text-sm text-lv-secondary">
              Noch keine Inhaltsseiten.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Neue Inhaltsseite
          </p>
          <ContentPageForm />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="03" label="Material" title="Media-Kit" />
        <Card className="divide-y divide-lv-border">
          {media.map((asset) => (
            <div key={asset.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold hover:text-lv-blue"
                >
                  {asset.name}
                </a>
                <p className="text-xs text-lv-secondary">{asset.type}</p>
              </div>
              <ContentAudienceBadge value={asset.audience} />
              <DeleteButton action={deleteMediaAsset.bind(null, asset.id)} />
            </div>
          ))}
          {media.length === 0 && (
            <p className="p-4 text-sm text-lv-secondary">Noch keine Assets.</p>
          )}
        </Card>
        <Card className="p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Neues Asset
          </p>
          <MediaAssetForm />
        </Card>
      </section>
    </>
  );
}
