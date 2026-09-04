import {
  Camera,
  Contact,
  Download,
  ExternalLink,
  Globe,
  Hash,
  Heart,
  Link2,
  Mail,
  Newspaper,
  Palette,
  Share2,
  Sparkles,
  SquarePlay,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PictogramChip } from "@/components/ui/PictogramChip";

/**
 * Static LOVEDIS MediaKit content, rendered inside the shared "Material /
 * Media-Kit" section of {@link HubContent}. Because HubContent is shared by the
 * partner hub and the startup venture platform, both roles see the same kit.
 *
 * Logos, templates and photos are linked out to Google Drive rather than
 * embedded — the source (Notion) only exposes short-lived signed URLs.
 * Content source: LOVEDIS MediaKit (Notion), Juni 2026.
 */

const CONTACT_EMAIL = "hannah.freese@lovedis.de";

const INTRO =
  "Auf dieser Seite findet ihr ein MediaKit, welches euch mit Logos, " +
  "Kurzbeschreibung, unseren Claims und Hashtags sowie ausgewählten Fotos " +
  "ausstattet. Euch fehlt etwas oder ihr habt Fragen, dann wendet euch an ";

const LOVEDIS_DE = {
  about:
    "Wir treiben Innovation und Disruption dort voran, wo das Herz des " +
    "deutschen Mittelstands schlägt, und stärken so die Regionen, die das " +
    "Rückgrat unserer Wirtschaft bilden. Durch unseren Accelerator bringen " +
    "wir etablierte Marktführer und Startups direkt in die Umsetzung. In " +
    "strukturierten Pilotprojekten lösen wir echte Probleme aus der Praxis " +
    "und bauen so ein lebendiges Innovations-Ökosystem auf, das weit über " +
    "das reine Matchmaking hinausgeht.",
  pitch:
    "Wir sind der Accelerator für Regionen, die das Rückgrat der deutschen " +
    "Wirtschaft bilden. Als Innovationsplattform fungieren wir als " +
    "Schnittstelle zwischen Startups und mittelständischen Unternehmen.",
};

const LOVEDIS_EN = {
  about:
    "We drive innovation and disruption right where the heart of the German " +
    "Mittelstand beats, strengthening the regions that form the backbone of " +
    "our economy. Through our accelerator, we move established market leaders " +
    "and startups directly into implementation. In structured pilot projects, " +
    "we solve real-world problems and build a vibrant innovation ecosystem " +
    "that goes far beyond simple matchmaking.",
  pitch:
    "We are the accelerator for regions that form the backbone of the German " +
    "economy. As an innovation platform, we bridge the gap between " +
    "future-driven startups and strong SMEs and globally active champions.",
};

const LOGO_TEXT =
  "Unser Logo ist der direkte Ausdruck dessen, wofür wir stehen: die Liebe " +
  "zur Disruption. Der Schriftzug bricht das Wort „LOVE“ auf, ohne es zu " +
  "zerstören. So wird Disruption zu etwas Bewusstem und Konstruktivem. Ein " +
  "dreidimensionales Herz unterstreicht unsere Leidenschaft für Innovation " +
  "und echten Fortschritt. Es macht Disruption menschlich, optimistisch und " +
  "zeigt: Wir verändern Dinge mit Sinn und Verstand.";

const LOGO_USAGE = [
  "Blaues Logo auf weissem oder hellem Hintergrund.",
  "Weisses Logo auf dunklem Hintergrund.",
  "Nutzt unser Herz-Icon nur als Add-On – ohne Kontext ist es schwerer der " +
    "Brand zuzuordnen.",
];

const SOCIAL_TEMPLATES = [
  "Für Unternehmenspartner",
  "Für Ökosystem-Partner",
  "Für Startups",
  "Für Mentor:innen oder Expert:innen",
];

const HASHTAGS_LOVE = ["#lovedis", "#welovedis", "#lovedisruption"];
const HASHTAGS_COMBINE = ["#innovation", "#accelerator", "#startups"];

const LINKS = {
  event:
    "https://drive.google.com/drive/folders/16TaDugsyb2h2Phpgpwj-dhqXryXMbBcb",
  logos:
    "https://drive.google.com/drive/folders/1yeEwBkr49UpQsFhJDjp2nvUrE12a90zf?usp=drive_link",
  linkedin: "https://www.linkedin.com/company/lovedisfactory/",
  templates:
    "https://drive.google.com/drive/folders/1450_MiqCgN1m4Y1sygRWhLYB3j6GY4ik?usp=sharing",
  teaser: "https://www.youtube.com/watch?v=mupXOZrg418",
  photos:
    "https://drive.google.com/drive/folders/1JgNJvjqPUMmjCC8li2T5G4VGdjS533wc",
  photosPixieset: "https://markuslaubvogel.pixieset.com/lovedisruption2026/",
  newsletter: "https://www.lovedis.de/lovedis-newsletter",
  news: "https://lovedis.de/de/news",
  website: "https://lovedis.de/de",
} as const;

/** Inline link that always opens safely in a new tab. */
function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-lv-blue hover:underline"
    >
      {children}
    </a>
  );
}

/** Button-style link to an external resource (Drive / video / web). */
function LinkPill({
  href,
  icon: Icon = ExternalLink,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-button border border-lv-border px-3 py-2 text-sm font-semibold text-lv-text transition-colors hover:border-lv-blue/40 hover:bg-lv-surface hover:text-lv-blue"
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </a>
  );
}

/** A titled sub-card block within the MediaKit. */
function Block({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <PictogramChip icon={icon} tone="info" size="sm" />
        <h4 className="text-base font-bold tracking-tight text-lv-text">
          {title}
        </h4>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-lv-secondary">
        {children}
      </div>
    </Card>
  );
}

/** A labelled paragraph (e.g. "Über uns" / "Pitch"). */
function LabelledText({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary/80">
        {label}
      </p>
      <p className="mt-1 text-lv-text/90">{text}</p>
    </div>
  );
}

/** The full static LOVEDIS MediaKit. */
export function MediaKit() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <PictogramChip icon={Heart} tone="pink" size="lg" />
          <div>
            <p className="lv-wordmark text-xs text-lv-blue">Juni 2026</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-lv-text">
              MediaKit LOVEDIS
            </h3>
          </div>
        </div>

        {/* Intro callout */}
        <div className="mt-5 rounded-card border border-lv-blue-soft bg-lv-blue-soft px-4 py-3 text-sm leading-relaxed text-lv-blue">
          <p>
            {INTRO}
            <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
          </p>
        </div>

        {/* Event communication */}
        <div className="mt-4">
          <LinkPill href={LINKS.event} icon={Download}>
            Event-Kommunikation der LOVE DISRUPTION &apos;26
          </LinkPill>
        </div>
      </Card>

      {/* Das ist LOVEDIS (DE) */}
      <Block icon={Sparkles} title="Das ist LOVEDIS">
        <LabelledText label="Über uns" text={LOVEDIS_DE.about} />
        <LabelledText label="Pitch" text={LOVEDIS_DE.pitch} />
      </Block>

      {/* This is LOVEDIS (EN) */}
      <Block icon={Globe} title="This is LOVEDIS">
        <LabelledText label="About us" text={LOVEDIS_EN.about} />
        <LabelledText label="Pitch" text={LOVEDIS_EN.pitch} />
      </Block>

      {/* Logo Design & CI */}
      <Block icon={Palette} title="Logo Design & CI">
        <p className="text-lv-text/90">{LOGO_TEXT}</p>
        <ul className="list-disc space-y-1.5 pl-5">
          {LOGO_USAGE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div>
          <LinkPill href={LINKS.logos} icon={Download}>
            Logos herunterladen
          </LinkPill>
        </div>
      </Block>

      {/* Social Media */}
      <Block icon={Share2} title="Social Media">
        <div>
          <LinkPill href={LINKS.linkedin} icon={Link2}>
            Zur LinkedIn-Seite
          </LinkPill>
          <p className="mt-2 text-lv-secondary">
            Liked, teilt oder kommentiert gerne Beiträge, so schaffen wir
            Reichweite und Sichtbarkeit.
          </p>
        </div>

        <div>
          <p className="text-lv-text/90">
            Für eigene Beiträge zu eurer Partnerschaft mit LOVEDIS nutzt gerne
            folgende Templates.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {SOCIAL_TEMPLATES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <div className="mt-3">
            <LinkPill href={LINKS.templates} icon={Download}>
              Templates herunterladen
            </LinkPill>
          </div>
        </div>

        <div>
          <LinkPill href={LINKS.teaser} icon={SquarePlay}>
            Teaser-Video über LOVEDIS
          </LinkPill>
        </div>
      </Block>

      {/* Hashtags */}
      <Block icon={Hash} title="Unsere Hashtags">
        <div>
          <p className="text-lv-text/90">Hashtags, die wir lieben:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HASHTAGS_LOVE.map((tag) => (
              <Badge key={tag} tone="blue">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-lv-text/90">Gerne in Verbindung mit:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HASHTAGS_COMBINE.map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Block>

      {/* Bilderpool */}
      <Block icon={Camera} title="Bilderpool">
        <p className="text-lv-text/90">
          Fotos und Videos von unseren Events.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkPill href={LINKS.photos} icon={Camera}>
            Zu Fotos & Videos
          </LinkPill>
          <LinkPill href={LINKS.photosPixieset} icon={Camera}>
            LOVE DISRUPTION 2026 (Pixieset)
          </LinkPill>
        </div>
      </Block>

      {/* Stay up to date */}
      <Block icon={Newspaper} title="Stay up to date">
        <div className="flex flex-col gap-3">
          <div>
            <LinkPill href={LINKS.newsletter} icon={Mail}>
              Newsletter abonnieren
            </LinkPill>
            <p className="mt-2 text-lv-secondary">
              Hier könnt ihr euch zu unserem Newsletter anmelden.
            </p>
          </div>
          <div>
            <LinkPill href={LINKS.news} icon={Newspaper}>
              News
            </LinkPill>
            <p className="mt-2 text-lv-secondary">
              Aktuelle News aus dem Ökosystem.
            </p>
          </div>
          <div>
            <LinkPill href={LINKS.website} icon={Globe}>
              Webseite
            </LinkPill>
            <p className="mt-2 text-lv-secondary">
              Alle weiteren Infos auf unserer Webseite.
            </p>
          </div>
        </div>
      </Block>

      {/* Kontakt */}
      <Block icon={Contact} title="Kontakt">
        <div className="flex items-center gap-3">
          <PictogramChip icon={Mail} tone="pink" size="md" />
          <div>
            <p className="text-sm font-bold text-lv-text">Hannah Freese</p>
            <p className="text-xs text-lv-secondary">Head of Marketing</p>
            <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>
          </div>
        </div>
      </Block>
    </div>
  );
}
