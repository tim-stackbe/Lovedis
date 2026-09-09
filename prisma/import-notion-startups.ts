/**
 * Idempotent import of the REAL program startups from Notion into an existing
 * database WITHOUT a reseed. Mirrors the spirit of prisma/apply-marketplace-notion.ts:
 * a standalone, re-runnable script driven by DATABASE_URL that never duplicates
 * rows (find-or-create by normalized name; contacts guarded by email; batch
 * membership via upsert).
 *
 * Source of truth is the embedded NOTION_STARTUPS list below, transcribed 1:1
 * from the two Notion databases:
 *   - "Teilnehmende Startups am Accelerator"  → The Mission Construction 2026
 *   - "Teilnehmende Startups am online Pitch Event" → Industrie / Online Pitch
 *
 * Startups appearing in both programs (Genow, Folivora Solutions) are a single
 * Startup row with membership in BOTH batches.
 *
 * Usage (point DATABASE_URL at the target DB first):
 *   export PATH="$PWD/.tools/node/bin:$PATH"
 *   DATABASE_URL=postgres://…  npx tsx prisma/import-notion-startups.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { StartupStage } from "../src/generated/prisma/client";
import { ensureBatch } from "../src/lib/match-matrix-import";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Program = "ACCELERATOR" | "INDUSTRIE";

interface Founder {
  name: string;
  email?: string;
}

interface NotionStartup {
  name: string;
  website: string;
  description: string;
  foundedYear?: number;
  stageRaw: string;
  industry: string;
  founders: Founder[];
  programs: Program[];
}

// --- Batch (program) definitions -------------------------------------------
const ACCELERATOR_BATCH = {
  name: "The Mission Construction 2026",
  type: "ACCELERATOR" as const,
  description: "Accelerator-Batch (Bau/Construction), Quelle: Notion.",
};
const INDUSTRIE_BATCH = {
  name: "Industrie – Online Pitch 2026",
  type: "INDUSTRIEPROGRAMM" as const,
  description: "Online-Pitch-Batch (Industrie), Quelle: Notion.",
};

// --- Data (transcribed from Notion) ----------------------------------------
const NOTION_STARTUPS: NotionStartup[] = [
  // ===== Accelerator — The Mission Construction 2026 (Bau) =====
  {
    name: "PreserviTec",
    website: "https://preservitec.ai",
    description:
      "Frühzeitig Bauwerksschäden erkennen: PreserviTec nutzt Drohnen, Satellitendaten und KI, um Schäden frühzeitig zu erkennen und Handlungsempfehlungen sofort sichtbar zu machen. PreserviTec liefert strukturierte Datensätze, reduziert manuelle Inspektionen und macht Entscheidungen schnell und verlässlich. PreserviTec schafft transparente Zustandsinformationen, zeigt Risiken und Entwicklungstrends für präzise Planung und sichere Maßnahmen auf.",
    foundedYear: 2024,
    stageRaw: "Frühphasig, MVP",
    industry: "Bau / Construction",
    founders: [{ name: "Claudia Rougoor", email: "claudia@preservitec.ai" }],
    programs: ["ACCELERATOR"],
  },
  {
    name: "VSight",
    website: "https://vsight.de",
    description:
      "VSight ist ein führender Anbieter innovativer Lösungen für digitale Industrieprozesse und unterstützt Unternehmen weltweit dabei, Wissen schneller zu teilen, Arbeitsabläufe zu optimieren und technische Teams effizienter zu vernetzen. Mit modernster Remote-Support-Technologie (AR), KI-gestützten Workflows und intelligenten Assistenzsystemen ermöglicht VSight eine neue Qualität der Zusammenarbeit in Service, Produktion und Instandhaltung.",
    foundedYear: 2019,
    stageRaw: "Wachstumsphase",
    industry: "Bau / Construction",
    founders: [{ name: "Marcus Lange", email: "marcus.lange@vsight.de" }],
    programs: ["ACCELERATOR"],
  },
  {
    name: "ContainerGrid",
    website: "https://containergrid.de",
    description:
      "ContainerGrid ist eine Recycling-Plattform für industrielle Hersteller, Bauunternehmen und Recyclingkonzerne für die skalierbare Abwicklung des Handels mit Sekundärrohstoffen zwischen Abfallproduktion, Recycling und Wiederaufbereitung. ContainerGrid optimiert dabei, welcher Abfall wo recycelt wird, digitalisiert das B2B-Fulfillment und ermöglicht so den Zugang zur Wiederaufbereitung.",
    foundedYear: 2021,
    stageRaw: "Seed",
    industry: "Bau / Construction",
    founders: [{ name: "Burkhard Ohs", email: "burkhard.ohs@containergrid.de" }],
    programs: ["ACCELERATOR"],
  },
  {
    name: "flinq",
    website: "https://www.flinq.ai",
    description:
      "Datenbasierte Risikoanalyse schon in der frühen Projektphase. Flinq ist die erste IFC-native Kostenschätzung für Bauprojekte. Eigene Erfahrungsdaten für präzise Go/No-Go-Entscheidungen können in Sekunden genutzt werden, von der Frühphase bis zur Ausführung. flinq verknüpft vergangene Projektdaten zu einem intelligenten Wissensnetzwerk und macht sie über KI-gestützte Analysen nutzbar. Statt auf Schätzwerte angewiesen zu sein, gewinnen Entwickler, Investoren und Planer fundierte und datenbasierte Entscheidungsgrundlagen durch präzise Referenzwerte.",
    foundedYear: 2024,
    stageRaw: "Frühphasig, MVP",
    industry: "Bau / Construction",
    founders: [
      { name: "Valentina Mayer-Steudte", email: "valentina.ms@flinq.ai" },
      { name: "Matthias Hornung", email: "matthias.h@flinq.ai" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Procuras",
    website: "https://www.procuras.io",
    description:
      "Procuras steht für die intelligente Digitalisierung des Einkaufs im Mittelstand. Mittels KI-Agenten werden Beschaffungsprozesse effizienter gestaltet und mehr Zeit für strategische Aufgaben geschaffen. KI-Agenten erledigen Routineaufgaben, bedienen Prozesse & Systeme und schaffen Transparenz im Einkauf.",
    foundedYear: 2025,
    stageRaw: "Frühphasig, erste Kunden",
    industry: "Bau / Construction",
    founders: [
      { name: "Markus Herold", email: "markus@lumos-agent.com" },
      { name: "Jonas Bremer", email: "jonas.bremer@lumos-agent.com" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Tymba",
    website: "https://tymba.net",
    description:
      "Tymba bietet neues, biotechnologisch optimiertes Zellulose-Material, welches nicht beschichtet oder laminiert ist. Tymba ist spezialisiert auf Hochleistungs-Zellulosematerialien, die leichter als Glasfaser, stärker als Stahl und CO2-negativ sind und für verschiedene industrielle Anwendungen geeignet sind.",
    foundedYear: 2023,
    stageRaw: "Frühphasig, MVP",
    industry: "Bau / Construction",
    founders: [
      { name: "Pierre Munzel", email: "pierre@tymba.net" },
      { name: "Sebastian Hinz", email: "atti@tymba.net" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "parallelum",
    website: "https://parallelum.de",
    description:
      "parallelum ist spezialisiert auf die dreidimensionale Erfassung, Dokumentation und Visualisierung von Gebäuden. Mithilfe von modernsten Technologien wie Laserscannern und Drohnen werden in einem ersten Schritt die Gebäude erfasst und gescannt, um dann im nächsten Schritt KI-gestützt in kürzester Zeit präzise und übersichtliche Planungsgrundlagen in Form von 2D-CAD-Plänen oder 3D/BIM-Modellen zu erstellen.",
    foundedYear: 2021,
    stageRaw: "Wachstumsphase",
    industry: "Bau / Construction",
    founders: [
      { name: "Lars Beckmann", email: "lb@parallelum.de" },
      { name: "Tim Thiele", email: "tt@parallelum.de" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Folivora Solutions",
    website: "https://folivorasolutions.com",
    description:
      "Folivora entwickelt domänenspezifische Betriebssysteme zur Optimierung komplexer Systeme in Wirtschaft und Industrie mit dem Fokus auf Energieversorgung, Prozesse & Logistik sowie Strategie & Planung. Durch die Verknüpfung von mathematischen Optimierungsalgorithmen, Prognose- und Simulationsmodellen sowie Echtzeit-Prozessdaten ermöglichen sie die adaptive und kontinuierliche Optimierung hochvernetzter Systeme.",
    foundedYear: 2022,
    stageRaw: "Wachstumsphase",
    industry: "Industrie",
    founders: [
      { name: "Daniel Wethmar", email: "wethmar@folivoraanalytics.com" },
      { name: "Maximilian Roth", email: "roth@folivorasolutions.com" },
    ],
    programs: ["ACCELERATOR", "INDUSTRIE"],
  },
  {
    name: "Genow",
    website: "https://genow.ai",
    description:
      "Genow ist eine KI-Plattform für komplexes und verteiltes Unternehmenswissen. Genow entwickelt spezialisierte Wissensagenten, die präziseste Erkenntnisse über fragmentierte Datenquellen hinweg liefern, um die Performance bei komplexen Aufgaben zu steigern und eine präzise Entscheidungsgrundlage zu bilden. Für weniger Suchaufwand, erfolgreichere Prozesse und datengetriebene Entscheidungen.",
    foundedYear: 2021,
    stageRaw: "Seed",
    industry: "Wissensmanagement / KI",
    founders: [{ name: "Sara Jourdan", email: "sara.jourdan@genow.ai" }],
    programs: ["ACCELERATOR", "INDUSTRIE"],
  },
  {
    name: "Green Mama Solutions",
    website: "https://greenmama.solutions",
    description:
      "Ein Fassadenmodul, das Begrünung, Wassermanagement und Materialkreisläufe verbindet – langlebig, modular auch für den Bestand entwickelt. Rahmen, Textil, Substrat, Pflanzen und Sensorik bilden in Kombination mit einer objektspezifischen Regenwasserbewirtschaftung ein abgestimmtes Gesamtsystem mit messbaren ökologischen Effekten.",
    foundedYear: 2021,
    stageRaw: "Frühphasig, erste Pilotprojekte",
    industry: "Bau / Construction",
    founders: [
      { name: "Barbara Buth", email: "barbara.buth@gms-mainz.de" },
      { name: "Jonas Tillmann", email: "jonas.tillmann@gms-mainz.de" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Baurion",
    website: "https://baurion.de",
    description:
      "Baurion ist eine KI-gestützte Plattform, die die Lücke zwischen der Suche nach Ausschreibungen und der Baukalkulation schließt. Das Startup automatisiert das Scouting über alle deutschen Vergabeportale hinweg und liefert datenbasierte Go/No-Go-Entscheidungen sowie Risikoanalysen für komplexe Leistungsverzeichnisse. Durch automatisiertes Mapping und einen digitalen QA-Check verhindert die Lösung formale Fehler und reduziert den administrativen Aufwand von über zehn Stunden auf wenige Minuten.",
    foundedYear: 2026,
    stageRaw: "Frühphasig, MVP",
    industry: "Bau / Construction",
    founders: [
      { name: "Philipp Niemeier", email: "philipp.niemeier@procycons.com" },
      { name: "Arash Javanmard", email: "arash.javanmard@procycons.com" },
    ],
    programs: ["ACCELERATOR"],
  },
  {
    name: "flexxter",
    website: "https://www.flexxter.com",
    description:
      "Flexxter vernetzt als cloudbasierte Plattform sämtliche Projektbeteiligte von der Bauleitung bis zum Handwerksbetrieb in einem zentralen digitalen Arbeitsraum. Über interaktive Bauzeitenpläne und mobile Dokumentation vor Ort werden Abstimmungsprozesse sowie der Informationsfluss zwischen Büro und Baustelle in Echtzeit synchronisiert. Die Anwendung automatisiert wesentliche Aufgaben der Bauüberwachung, indem sie Funktionen für digitale Bautagebücher, KI-gestütztes Mängelmanagement und eine gewerbeübergreifende Ressourcenplanung bündelt.",
    foundedYear: 2019,
    stageRaw: "Wachstumsphase",
    industry: "Bau / Construction",
    founders: [{ name: "Jonas Habel", email: "jonas.habel@flexxter.de" }],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Neobim",
    website: "https://neobim.ai",
    description:
      "neoBIM.ai entwickelt eine KI-gestützte End-to-End-Plattform für das Building Information Modeling (BIM), die den architektonischen Entwurfs- und Planungsprozess radikal beschleunigt. Durch den Einsatz generativer Künstlicher Intelligenz ermöglicht die Software das automatisierte Erstellen von 3D-Modellen, die automatisierte Überprüfung von Bauvorschriften sowie die schnelle Generierung zahlreicher Designvarianten in Echtzeit. Ein wesentlicher Schwerpunkt liegt auf der direkten Integration von Ökobilanzen (LCA) in den BIM-Workflow.",
    foundedYear: 2024,
    stageRaw: "Seed",
    industry: "Bau / Construction",
    founders: [{ name: "Florian Marthaler", email: "flo@neobim.ai" }],
    programs: ["ACCELERATOR"],
  },
  {
    name: "Scho & Müller",
    website: "https://scho-mueller.com",
    description:
      "Die Scho & Müller GmbH verknüpft als interdisziplinäres Ingenieurunternehmen klassische Entwicklungsarbeit mit den hocheffizienten Prinzipien der angewandten Bionik. Durch die Übertragung natürlicher Kreislauf- und Struktursysteme auf technische Fragestellungen entstehen nachhaltige Industrielösungen mit optimierter Materialwahl und reduziertem Energieverbrauch. Das Portfolio bündelt angewandte Auftragsforschung, die agile Entwicklung zukunftssicherer Produkte sowie eine umfassende Nachhaltigkeitsberatung.",
    foundedYear: 2025,
    stageRaw: "Frühphasig, erste Pilotprojekte",
    industry: "Bau / Construction",
    founders: [
      { name: "Florian Scho", email: "florian.scho@scho-mueller.com" },
      { name: "Lena Müller", email: "lena.mueller@scho-mueller.com" },
    ],
    programs: ["ACCELERATOR"],
  },

  // ===== Online Pitch — Industrie (new, not in Accelerator) =====
  {
    name: "lytra",
    website: "https://www.lytra.ai",
    description:
      "lytra ist das KI-Betriebssystem für den After-Sales im Maschinenbau. Die KI-Agenten automatisieren die Bearbeitung von Servicefällen: In Echtzeit identifiziert lytra ähnliche Servicefälle, technische Dokumente, findet passende Ersatzteile und relevante Daten aus bestehenden IT-Systemen und stellt den Lösungsweg direkt bereit. Mittelständische Maschinenbauer im DACH-Raum sparen im Schnitt 10 Stunden pro Woche pro Servicemitarbeiter. Betrieb 100 % DSGVO-konform mit Servern in Deutschland.",
    foundedYear: 2025,
    stageRaw: "Frühphasig, erste Kunden",
    industry: "Industrie",
    founders: [{ name: "Etienne Fieg", email: "etienne@lytra.ai" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "Summetix",
    website: "https://summetix.com",
    description:
      "SUMMETIX ist eine KI-gestützte Analysesoftware-Plattform für die Verarbeitung qualitativer Daten und Textanalysen. Sie transformiert komplexe Texte und Kundenfeedback in strukturierte Erkenntnisse und automatisierte Antwortentwürfe. Kerninhalte: Argument-Mining, automatisierte datenschutzkonforme KI-Kommunikationsassistenten (IRIS) und ein Analytics-Dashboard (PRO) für Kundenservice, Marktforschung und Qualitätsmanagement.",
    foundedYear: 2021,
    stageRaw: "Wachstumsphase",
    industry: "Industrie",
    founders: [{ name: "Erik Kaiser", email: "kaiser@summetix.com" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "ai-omatic solutions",
    website: "https://www.ai-omatic.com",
    description:
      "Ai-omatic ist eine KI-basierte Software für vorausschauende Instandhaltung, die Maschinen in Echtzeit überwacht. Zu den Kerninhalten gehören die automatisierte Erkennung von Datenabweichungen, ein übersichtliches Dashboard mit einem Zustandsindex sowie automatisierte frühzeitige Warnmeldungen, damit Maschinen nicht zum Stillstand kommen.",
    foundedYear: 2022,
    stageRaw: "Wachstumsphase",
    industry: "Industrie",
    founders: [{ name: "Lena Weirauch", email: "lena@ai-omatic.com" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "Novo AI",
    website: "https://novoai.de",
    description:
      "Novo AI ist eine KI-gestützte Plattform für Maschinendatenerfassung an Bestandsmaschinen, ohne Eingriff in die SPS. Über externe KI-Sensorik (Vibration, Akustik) und Edge Processing macht die WatchMen-Plattform Laufzeit, Leerlauf, Stillstand und OEE bestehender Maschinenparks in Echtzeit sichtbar. Retrofit-Sensorik für CNC-Maschinen, Laser, Pressen und Sondermaschinen, Shopfloor-Dashboards mit Schichtvergleichen und historischen Auswertungen.",
    foundedYear: 2021,
    stageRaw: "Wachstumsphase",
    industry: "Industrie",
    founders: [{ name: "Dimitrij Lewin", email: "lewin@novoai.de" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "CLINKTWIN",
    website: "https://clinktwin.de",
    description:
      '"Industrial Wearables" für Maschinen: CLINKTWIN bietet eine industrielle IoT-Lösung an, die als eine Art „Fitness-Tracker für Maschinen“ fungiert. Über nachrüstbare Sensorik werden bestehende, oft ältere Maschinen einfach anschlussfähig gemacht. Das System erfasst und überträgt Live-Sensorsignale und Umgebungsbedingungen als Basis für datengetriebene Anwendungen, ohne dabei sensible oder cyberkritische Steuerungen ans Netz bringen zu müssen.',
    foundedYear: 2021,
    stageRaw: "Seed",
    industry: "Industrie",
    founders: [{ name: "Alexander Quast", email: "alexander.quast@clinktwin.com" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "Stryza",
    website: "https://de.stryza.com",
    description:
      "Stryza ist eine KI-basierte Plattform für operatives Workflow- und Kompetenzmanagement in der Produktion. Die Plattform vereint drei Bausteine des Shopfloor-Managements in einem Werkzeug: Arbeitsanweisungen und technische Dokumentation, Workflow-Steuerung mit trigger-basierten Automatisierungen sowie Kompetenz- und Skill-Management.",
    foundedYear: 2022,
    stageRaw: "Wachstumsphase",
    industry: "Industrie",
    founders: [{ name: "Max Steinhoff", email: "max@stryza.com" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "Sightwise",
    website: "https://www.sightwise.ai",
    description:
      "Sightwise ist eine KI-gestützte Software-Plattform für die industrielle Bildverarbeitung und Qualitätssicherung. Sie erzeugt synthetische Bilddaten von digitalen Zwillingen, um KI-Modelle ohne reale Fehlerbilder virtuell zu trainieren. Kerninhalte: fotorealistische Datengenerierung, automatisiertes Modelltraining innerhalb von 24 Stunden und Anwendungsbereiche wie die automatische Defekt- und Montageprüfung.",
    foundedYear: 2024,
    stageRaw: "Frühphasig, erste Kunden",
    industry: "Industrie",
    founders: [{ name: "Philipp Middendorf", email: "middendorf@sightwise.ai" }],
    programs: ["INDUSTRIE"],
  },
  {
    name: "Epinoia",
    website: "https://epinoia.ai",
    description:
      "EPINOIA ist eine KI-gestützte Wissensmanagement-Software mit Fokus auf den technischen Mittelstand. Sie erfasst Erfahrungswissen von Fachleuten, strukturiert es asynchron und macht es im Unternehmen teilbar. Kerninhalte: adaptive Interviews, DSGVO-konforme Datenspeicherung und konkrete Anwendungsbereiche.",
    foundedYear: 2025,
    stageRaw: "Frühphasig, erste Kunden",
    industry: "Industrie",
    founders: [{ name: "Friedrich-Wilhelm Reese", email: "friwi@epinoia.ai" }],
    programs: ["INDUSTRIE"],
  },
];

// --- Helpers ---------------------------------------------------------------

/** Normalized key for name matching: lowercase, strip diacritics + non-alnum. */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "und")
    .replace(/\b(gmbh|ug|ag|se|kg|ohg|mbh|co|inc|ltd)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Map free-text German stage → StartupStage enum. */
function mapStage(raw: string): StartupStage {
  const s = raw.toLowerCase();
  if (s.includes("wachstum")) return "GROWTH";
  if (s.includes("series a")) return "SERIES_A";
  if (s.includes("series b")) return "SERIES_B";
  if (s.includes("seed") && !s.includes("pre")) return "SEED";
  if (s.includes("frühphas") || s.includes("fruhphas") || s.includes("mvp") || s.includes("pre"))
    return "PRE_SEED";
  return "SEED";
}

async function main() {
  console.log("Notion-Startup-Import (idempotent) startet…");

  const acceleratorBatchId = await ensureBatch(
    prisma,
    ACCELERATOR_BATCH.name,
    ACCELERATOR_BATCH.type,
    ACCELERATOR_BATCH.description
  );
  const industrieBatchId = await ensureBatch(
    prisma,
    INDUSTRIE_BATCH.name,
    INDUSTRIE_BATCH.type,
    INDUSTRIE_BATCH.description
  );

  // Preload existing startups for normalized-name matching.
  const existing = await prisma.startup.findMany({
    select: { id: true, name: true },
  });
  const byNorm = new Map<string, { id: string; name: string }>();
  for (const s of existing) byNorm.set(normalizeName(s.name), s);

  let created = 0;
  let enriched = 0;
  let contactsAdded = 0;
  const membershipCounts = { accelerator: 0, industrie: 0 };

  for (const item of NOTION_STARTUPS) {
    const norm = normalizeName(item.name);
    const stage = mapStage(item.stageRaw);
    let record = byNorm.get(norm);

    if (record) {
      // Enrich: authoritative descriptive fields from Notion; keep pipeline/
      // screening decisions untouched. sourceType/detail only set if empty.
      const cur = await prisma.startup.findUnique({
        where: { id: record.id },
        select: { sourceType: true, sourceDetail: true, industry: true },
      });
      await prisma.startup.update({
        where: { id: record.id },
        data: {
          website: item.website,
          description: item.description,
          foundedYear: item.foundedYear ?? undefined,
          stage,
          industry: cur?.industry?.trim() ? cur.industry : item.industry,
          sourceType: cur?.sourceType ?? "INBOUND",
          sourceDetail: cur?.sourceDetail ?? "Notion – Programm-Bewerbung",
        },
      });
      enriched++;
    } else {
      const createdStartup = await prisma.startup.create({
        data: {
          name: item.name,
          website: item.website,
          description: item.description,
          industry: item.industry,
          foundedYear: item.foundedYear ?? null,
          stage,
          pipelineStage: "SCREENING",
          sourceType: "INBOUND",
          sourceDetail: "Notion – Programm-Bewerbung",
        },
        select: { id: true, name: true },
      });
      record = createdStartup;
      byNorm.set(norm, createdStartup);
      created++;
    }

    // Contacts — guarded by email per startup (or by name if no email).
    const existingContacts = await prisma.contact.findMany({
      where: { startupId: record.id },
      select: { email: true, name: true },
    });
    const haveEmails = new Set(
      existingContacts.map((c) => (c.email ?? "").toLowerCase()).filter(Boolean)
    );
    const haveNames = new Set(existingContacts.map((c) => c.name.toLowerCase()));
    for (const f of item.founders) {
      const emailKey = (f.email ?? "").toLowerCase();
      const dup = emailKey ? haveEmails.has(emailKey) : haveNames.has(f.name.toLowerCase());
      if (dup) continue;
      await prisma.contact.create({
        data: {
          startupId: record.id,
          name: f.name,
          email: f.email ?? null,
          position: "Gründer:in / Kontakt",
        },
      });
      if (emailKey) haveEmails.add(emailKey);
      haveNames.add(f.name.toLowerCase());
      contactsAdded++;
    }

    // Batch membership (upsert; idempotent).
    for (const program of item.programs) {
      const batchId = program === "ACCELERATOR" ? acceleratorBatchId : industrieBatchId;
      await prisma.batchStartup.upsert({
        where: { batchId_startupId: { batchId, startupId: record.id } },
        update: {},
        create: { batchId, startupId: record.id },
      });
      if (program === "ACCELERATOR") membershipCounts.accelerator++;
      else membershipCounts.industrie++;
    }
  }

  console.log(
    `Fertig: ${created} Startups neu, ${enriched} angereichert, ${contactsAdded} Kontakte ergänzt.`
  );
  console.log(
    `Batch-Mitgliedschaften: Accelerator ${membershipCounts.accelerator}, Industrie ${membershipCounts.industrie}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
