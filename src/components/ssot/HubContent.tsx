import { BookOpen, Download, FileText, Lightbulb, Map } from "lucide-react";
import type {
  ContentPageModel,
  KnowledgeResourceModel,
  MediaAssetModel,
  RoadmapItemModel,
} from "@/generated/prisma/models";
import { Badge } from "@/components/ui/Badge";
import { RoadmapStatusBadge } from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Markdown } from "@/components/ssot/Markdown";
import { KNOWLEDGE_RESOURCE_TYPE_LABELS } from "@/lib/constants";

interface HubContentProps {
  roadmap: RoadmapItemModel[];
  pages: ContentPageModel[];
  media: MediaAssetModel[];
  knowledge?: KnowledgeResourceModel[];
  /** Section numbers start here (so callers can compose multiple sections). */
  startNumber?: number;
}

/** Read-only SSOT presentation shared by the partner hub and startup venture. */
export function HubContent({
  roadmap,
  pages,
  media,
  knowledge = [],
  startNumber = 1,
}: HubContentProps) {
  const n = (offset: number) => String(startNumber + offset).padStart(2, "0");

  return (
    <>
      <section className="space-y-4">
        <SectionLabel number={n(0)} label="Roadmap" title="Was als Nächstes kommt" />
        {roadmap.length === 0 ? (
          <EmptyState
            icon={Map}
            title="Noch keine Roadmap"
            description="Sobald Meilensteine geplant sind, erscheinen sie hier."
          />
        ) : (
          <div className="relative space-y-4 border-l-2 border-lv-border pl-6">
            {roadmap.map((item) => (
              <div key={item.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-lv-blue" />
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-lv-text">
                        {item.title}
                      </h3>
                      {item.phase && (
                        <span className="text-xs font-medium text-lv-secondary">
                          · {item.phase}
                        </span>
                      )}
                    </div>
                    <RoadmapStatusBadge value={item.status} />
                  </div>
                  {item.body && (
                    <p className="mt-2 text-sm text-lv-secondary">{item.body}</p>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel number={n(1)} label="Wissen" title="Infos & Wissensseiten" />
        {pages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Noch keine Inhalte"
            description="Hier erscheinen veröffentlichte Wissensseiten."
          />
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <Card key={page.id} className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-lv-text">
                  {page.title}
                </h3>
                <div className="mt-3">
                  <Markdown source={page.body} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel number={n(2)} label="Material" title="Media-Kit & Downloads" />
        {media.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Keine Assets"
            description="Hier erscheinen Logos, Vorlagen und Downloads."
          />
        ) : (
          <Card className="divide-y divide-lv-border">
            {media.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-pink text-lv-text">
                  <Download className="h-4 w-4" />
                </div>
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
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel
          number={n(3)}
          label="Knowledge-Board"
          title="Empfehlungen: Bücher, Videos & mehr"
        />
        {knowledge.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="Noch keine Empfehlungen"
            description="Hier erscheinen kuratierte Bücher, Videos, Artikel und Tools."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {knowledge.map((res) => {
              const Title = res.url ? "a" : "span";
              return (
                <Card key={res.id} className="flex flex-col gap-2 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="blue">
                      {KNOWLEDGE_RESOURCE_TYPE_LABELS[res.type]}
                    </Badge>
                    <BookOpen className="h-4 w-4 shrink-0 text-lv-secondary" />
                  </div>
                  <Title
                    {...(res.url
                      ? {
                          href: res.url,
                          target: "_blank",
                          rel: "noreferrer",
                        }
                      : {})}
                    className={
                      "text-sm font-bold text-lv-text" +
                      (res.url ? " hover:text-lv-blue" : "")
                    }
                  >
                    {res.title}
                  </Title>
                  {res.author && (
                    <p className="text-xs text-lv-secondary">{res.author}</p>
                  )}
                  {res.note && (
                    <p className="text-sm text-lv-secondary">{res.note}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
