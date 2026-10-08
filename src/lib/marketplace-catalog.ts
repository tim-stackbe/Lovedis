import type { SupportCategory } from "@/generated/prisma/enums";
import type { ProgramWorkshop } from "@/lib/program-workshops";

// ---------------------------------------------------------------------------
// Marktplatz-Katalog — 1:1 aus der Notion-Seite „LOVEDIS Startup Support
// Marketplace" (Stand Juli 2026, re-verifiziert gegen die Notion-Datenbanken).
// Single source of truth für den Seed (prisma/seed.ts) UND das idempotente
// Sync-Script (prisma/apply-marketplace-notion.ts).
//
// ⚠️ NICHT die Quelle für den LIVE Venture Store: Live wird über den Venture
// Store Editor (/venture-store-editor, nur ADMIN) direkt in der Datenbank
// gepflegt. Änderungen hier landen NICHT automatisch live, und weder Deploy
// noch migrate-db-push.sh spielen diese Datei ein. Diese Datei dient nur für
// lokale Seeds und Tests.
//
// Guardrails:
//   • NUR echte Notion-Einträge — keine erfundenen Angebote, Programme oder
//     Mentor:innen-Metadaten. Fehlt ein Wert in Notion, bleibt das Feld leer
//     (null), statt Platzhalter zu erfinden.
//   • Credit-Skala (seit 28.09.2026): 2 Credits für alles, was ~2h dauert oder
//     extern kostet (GAL Digital, Aulinger, Momentum-2h-Workshops); 1 Credit
//     für Sparrings mit Investor:innen, Berater:innen oder LOVEDIS. Programme
//     sind kostenlos (keine Credits).
//   • Anbieter/Kontakt/Website/Termin liegen in DEDIZIERTEN Feldern (nicht im
//     Freitext description/bio): SupportOffering.providerCompany/contactPerson/
//     website/sessionDate, MentorProfile.company/role/website, Program.
//     contactPerson/sessionDate.
//   • Website-URLs stammen aus den Notion-„Website"-Feldern der jeweiligen
//     Einträge (echte Links). Wo Notion keinen Link führt, bleibt das Feld leer.
//   • „Individual Expert Session" existiert in Notion NUR in Legal, Marketing
//     und AI/Product & Tech — dort echt gelistet. Fundraising nutzt stattdessen
//     die echte Investor-Sparring-Datenbank. Sales hatte ursprünglich kein
//     Fallback-Angebot; am 14.09.2026 wurden drei aus dem Programm-Bereich
//     verschobene Sessions plus ein generisches „Sales"-Angebot ergänzt.
//   • Natürliche Schlüssel für Idempotenz: Program.title, MentorProfile.name,
//     SupportOffering (title + category).
// ---------------------------------------------------------------------------

export interface ProgramSeed {
  title: string;
  summary: string;
  description: string;
  focusTags: string[];
  status: "DRAFT" | "OPEN" | "CLOSED";
  contactPerson?: string;
  sessionDate?: string;
  /** Duration/format line, e.g. "4 Wochen · Online". */
  format?: string;
  /** Workshop series titles, in order. */
  sessions?: string[];
  /** Per-workshop details (date, format, location, expandable text). */
  workshops?: ProgramWorkshop[];
  /** Shows a "Coming Soon" sticker; enrolment stays possible. */
  comingSoon?: boolean;
  /** Optional sticker copy (default: „Coming Soon“, rendered uppercase on the card). */
  comingSoonLabel?: string;
  /** FIX credits an enrolment consumes (always 0 since programs are free). */
  fixCreditCost: number;
  sortOrder: number;
}

export interface MentorSeed {
  name: string;
  /** Unternehmen laut Notion (LOVEDIS-Unternehmenspartner). */
  company: string;
  /** Position/Rolle laut Notion. */
  role: string;
  /** Notion liefert keine Expertise-Tags → leer. */
  expertise: string[];
  /** Notion liefert keine Bio → optional/leer (kein Platzhalter). */
  bio?: string;
  /** Unternehmens-Link laut Notion („URL"-Feld). */
  website?: string;
  /** Local (public/) path to the mentor photo; null → initials fallback. */
  photoUrl?: string;
  creditCost: number;
  sortOrder: number;
}

export interface OfferingSeed {
  title: string;
  category: SupportCategory;
  summary: string;
  description: string;
  format: string;
  providerCompany?: string;
  contactPerson?: string;
  website?: string;
  sessionDate?: string;
  creditCost: number;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Programme (0 Credits — im Programm enthalten, „nur anmelden")
// ---------------------------------------------------------------------------

const LOKSCHUPPEN_MARBURG = {
  location: "Lokschuppen Marburg",
  locationUrl: "https://share.google/HRxApqBa5BIyx23tN",
};

// Workshop-Reihe der KI & Tech Journey (Stand 30.09.2026).
export const KI_TECH_WORKSHOPS: ProgramWorkshop[] = [
  {
    title: "KI Trends & Modellvergleich",
    date: "2026-11-12",
    startTime: "11:00",
    format: "ONLINE",
    description:
      "Was bewegt den Markt, welche Modelle setzen sich durch, wohin geht die Entwicklung in den nächsten 12 bis 24 Monaten.\n\n" +
      "Im zweiten Teil steht der Modellvergleich im Mittelpunkt. Die Startups analysieren gemeinsam, welche Modelle sie selbst einsetzen oder evaluieren, und stellen diese gegenüber: Leistung, Kosten, Einsatzbereich und On-Premise-Fähigkeit. Mittelständische Unternehmenskunden stellen die On-Prem-Anforderung regelmäßig, deshalb werden Vor- und Nachteile von Cloud- vs. On-Prem-Lösungen direkt an konkreten Modellen durchgespielt. Ein zentrales Thema dabei: Durch den Wechsel auf ein alternatives Modell lassen sich in vielen Fällen erhebliche Kosten einsparen, ohne Leistungseinbußen hinnehmen zu müssen.\n\n" +
      "**Output:** Startups kennen die relevanten Markttrends und alle sind auf dem gleichen Wissensstand, können ihre Modellwahl kritisch einordnen und wissen, wo Optimierungspotenzial bei Kosten und Infrastruktur liegt.",
  },
  {
    title: "KI Resilience Day",
    date: "2026-11-23",
    startTime: "15:00",
    format: "ON_SITE",
    ...LOKSCHUPPEN_MARBURG,
    description:
      "### Teil 1: KI Security in der Praxis\n\n" +
      "Ein CISO oder KI-Security-Verantwortlicher aus einem führenden deutschen Konzern gibt Einblicke in den Umgang mit KI-Sicherheit auf Enterprise-Ebene: Welche Angriffe auf KI-Systeme sind in der Praxis relevant, wie reagieren große Unternehmen darauf und was bedeutet das für Startups, die KI-Lösungen an Unternehmenskunden verkaufen?\n\n" +
      "Im Anschluss folgen Roundtables mit erfahrenen Pentestern. In kleinen Gruppen können die Startups ihre eigenen Lösungen auf Schwachstellen testen lassen, konkrete Angriffsvektoren durchspielen und direkte Fragen stellen.\n\n" +
      "Speaker werden in Kürze bekannt gegeben.\n\n" +
      "### Teil 2: Ask Founder anything\n\n" +
      "Ein offenes Netzwerken mit Getränken und Snacks zum Abschluss des Tages. Gründer und KI-Experten, die den Weg bereits gegangen sind, berichten aus der Praxis: Was hat funktioniert, wo lagen die echten Stolpersteine und welche Entscheidungen würden sie heute anders treffen?\n\n" +
      "Raum für die Fragen, die im Tagesgeschäft selten gestellt werden.\n\n" +
      "Speaker werden in Kürze bekannt gegeben.",
  },
  {
    title: "KI Skalieren",
    date: "2026-12-01",
    startTime: "11:00",
    format: "ONLINE",
    description:
      "### KI skalieren, ohne dass die Firma daran zerbricht\n\n" +
      "Viele große Unternehmen scheitern daran, KI zu skalieren. Das liegt selten an der Technologie. Sie behandeln KI wie ein klassisches IT-Projekt, mit festem Scope, langen Planungszyklen und einem Go-live, nach dem das Thema abgehakt ist. KI funktioniert anders: Modelle altern, Daten verändern sich, und der Wert entsteht erst durch ständiges Lernen und Nachjustieren im laufenden Betrieb.\n\n" +
      "Genau hier sind Startups im Vorteil. Sie bauen ihre Prozesse, Teams und Produkte von Anfang an rund um KI auf, statt sie nachträglich in gewachsene Strukturen einzupassen. Wir gehen der Frage nach, warum Startups so stark von KI profitieren, während etablierte Unternehmen oft auf der Strecke bleiben, und wie ihr diesen Vorsprung gezielt zu euren Kunden bringt.\n\n" +
      "Ein KI-Business-Experte zeigt euch, wie Produkt und Organisation zusammenwachsen. Wann solltet ihr euer Modell neu trainieren oder wechseln? Wie verändert sich eure Unternehmensstruktur, wenn KI vom Feature zur Kerninfrastruktur wird? Welche organisatorischen Entscheidungen, etwa beim Team-Aufbau, trefft ihr heute, die sich morgen kaum noch rückgängig machen lassen?\n\n" +
      "**Euer Ergebnis:** ein konkreter Skalierungsrahmen für euer Produkt und euer Unternehmen, dazu ein klares Verständnis dafür, wie ihr eure KI-Erfahrung für eure Kunden in echten Mehrwert übersetzt.",
  },
  { title: "AI Act (optional)" },
];

export const MARKETPLACE_PROGRAMS: ProgramSeed[] = [
  // „Exclusive"-Sessions. Ursprünglich vier forensisch wiederhergestellte
  // Sessions (prisma/restore-venture-store-20260914.sql). Am 14.09.2026 wurden
  // drei davon — „Community / Ökosystem Sales", „Aufbau strukturierter
  // Pipelines" und „Nightmare Competitor" — aus dem Programm-Bereich in die
  // Support-Angebote (Kategorie SALES) verschoben (siehe MARKETPLACE_OFFERINGS
  // und prisma/backups/venture-store-move-20260914T135212Z.sql). Seit
  // 28.09.2026: die zwei Journeys „KI & Tech" und „Sales & Growth" plus
  // „SaaS Contracting".
  // Die beiden themenspezifischen Journeys (seit 28.09.2026). Kostenlos für
  // Startups im Programm; Anbieter/Personen folgen, daher kein contactPerson.
  {
    title: "KI & Tech Journey",
    summary:
      "Nimm an unserem themenspezifischen Programm teil und arbeite gemeinsam mit Expert:innen an deiner KI-Weiterentwicklung von Modellvergleichen über Skalierung hin zur Cyber-Resilienz.",
    description:
      "Nimm an unserem themenspezifischen Programm teil und arbeite gemeinsam mit Expert:innen an deiner KI-Weiterentwicklung von Modellvergleichen über Skalierung hin zur Cyber-Resilienz.\n\n" +
      "Die Journey besteht aus aufeinander aufbauenden Workshops über drei Wochen als Mischung aus Online-Sessions und einem Onsite Workshop im Lokschuppen. Der letzte Workshop zum AI Act ist optional und wird nach Bedarf noch ergänzt.",
    focusTags: ["AI", "Product & Tech", "Workshop-Reihe"],
    status: "OPEN",
    format: "3 Wochen · Online & Onsite (Lokschuppen)",
    sessions: KI_TECH_WORKSHOPS.map((w) => w.title),
    workshops: KI_TECH_WORKSHOPS,
    fixCreditCost: 0,
    sortOrder: 1,
  },
  {
    title: "Sales & Growth",
    summary:
      "Nimm an unserem themenspezifischen Programm teil und arbeite gemeinsam mit Expert:innen an deiner Growth-Story.",
    description:
      "Nimm an unserem themenspezifischen Programm teil und arbeite gemeinsam mit Expert:innen an deiner Growth-Story. Ein praxisnahes Programm zu Kundenverständnis, Go-to-Market und B2B Sales. Die Sessions greifen zentrale Wachstumshebel von Startups auf und liefern konkrete Impulse für Positionierung, Markteintritt und Vertrieb.",
    focusTags: ["Sales", "Growth", "GTM"],
    status: "OPEN",
    format: "4 Wochen · Online · Termine folgen",
    comingSoon: true,
    comingSoonLabel: "COMING SOON Januar 2027",
    fixCreditCost: 0,
    sortOrder: 2,
  },
  {
    title: "SaaS Contracting",
    summary: "Online Workshop zu SaaS-Vertragsgestaltung im Sales-Kontext.",
    description:
      "Session im Rahmen von Sales, Pricing & Growth: SaaS Contracting mit Aulinger Rechtsanwälte Notare (Dr. Ralf Heine). Format: Online Workshop.",
    focusTags: ["Sales", "Legal", "SaaS"],
    // Seit 28.09.2026 nicht mehr unter „Exklusive Programme" (DRAFT = versteckt);
    // das gleichnamige Legal-Angebot bleibt buchbar.
    status: "DRAFT",
    contactPerson: "Dr. Ralf Heine",
    fixCreditCost: 0,
    sortOrder: 4,
  },
];

// ---------------------------------------------------------------------------
// Mentor:innen — BEWUSST LEER.
//
// Die acht Mentor:innen-Profile wurden am 11.09.2026 aus dem Venture Store
// entfernt; der Store soll KEINE Mentor:innen zeigen. Der Sync
// (prisma/apply-marketplace-notion.ts) hat sie am 14.09.2026 aus diesem
// Katalog heraus neu angelegt — deshalb ist die Liste jetzt leer: Soll-Zustand
// der Datenbank ist 0 MentorProfile-Zeilen, und der Sync darf daran nichts
// ändern (er prunt nur Zeilen, die NICHT im Katalog stehen, legt aber keine an).
// Typ + Export bleiben erhalten, damit Seed/Sync/Tests weiter kompilieren.
// Sollen wieder Mentor:innen erscheinen, hier mit echten Notion-Werten
// (company/role/website, Foto unter public/mentors/) ergänzen.
// ---------------------------------------------------------------------------

export const MARKETPLACE_MENTORS: MentorSeed[] = [];

// ---------------------------------------------------------------------------
// Support-Angebote — echte Notion-Angebote je Kategorie. Anbieter/Kontakt/
// Website/Termin liegen in dedizierten Feldern. 2 Credits für ~2h-Workshops
// und externe Anbieter (GAL Digital, Aulinger, Momentum), sonst 1. Die „Individual Expert
// Session" ist ein echter Notion-Eintrag in Legal, Marketing und AI/Product &
// Tech (Bedarf beschreiben → Team matcht passende Expert:innen).
// ---------------------------------------------------------------------------

// Echter Notion-Text der „Individual Expert Session"-Einträge.
const INDIVIDUAL_EXPERT_DESCRIPTION =
  "Dein Thema wird aktuell durch keines der verfügbaren Angebote vollständig abgedeckt? Beschreibe deine Herausforderung und wir vermitteln dir passende Expert:innen aus unserem Netzwerk.";

export const MARKETPLACE_OFFERINGS: OfferingSeed[] = [
  // --- 💰 Fundraising ------------------------------------------------------
  {
    title: "Founder Insights: Vom ersten Fundraising zum Exit",
    category: "FUNDRAISING",
    summary: "Q&A mit einem erfahrenen Founder — vom ersten Raise bis zum Exit.",
    description:
      "Offene Q&A-Session zu Fundraising-Realität: erste Runde, Wachstum, Verhandlung und Exit — aus erster Hand.",
    format: "Online Q&A",
    providerCompany: "Wunderland Capital",
    contactPerson: "Dirk Rudolf",
    website: "https://wunderland.capital",
    creditCost: 1,
    sortOrder: 1,
  },
  {
    title: "Stakeholdermanagement",
    category: "FUNDRAISING",
    summary: "Workshop zu Erwartungs- und Beziehungsmanagement mit Kapitalgebern.",
    description:
      "Wie du Investor:innen, Beirat und weitere Stakeholder entlang der Finanzierungsreise aktiv steuerst und Vertrauen aufbaust.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Polina Kon",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 2,
  },
  {
    title: "Funding Strategy & Insights zu Venture Debt",
    category: "FUNDRAISING",
    summary: "Finanzierungsstrategie inkl. Venture Debt als Baustein.",
    description:
      "Wann Eigenkapital, wann Venture Debt? Strategie-Session zu Finanzierungsmix, Timing und Konditionen.",
    format: "Online Workshop (60–90 Min.)",
    providerCompany: "re:cap Technologies",
    contactPerson: "Lilli Pukall",
    website: "https://www.re-cap.com",
    creditCost: 1,
    sortOrder: 3,
  },
  {
    title: "Individuelle Expert:innen Sessions (Investor-Sparring)",
    category: "FUNDRAISING",
    summary: "1:1-Sparring mit Investor:innen aus dem LOVEDIS-Netzwerk.",
    description:
      "Direktes Sparring mit Investor:innen zu Story, Runde und Bewertung. Wir matchen die passende Person aus unserem Netzwerk.",
    format: "Sparring Session",
    providerCompany:
      "Realyze Ventures, HTGF, re:cap Technologies, Wunderland Capital, Business Angels FrankfurtRheinMain, Futury Capital, Business Angels Mittelhessen, DnA Ventures",
    creditCost: 1,
    sortOrder: 4,
  },
  {
    title: "Pitch Deck Review",
    category: "FUNDRAISING",
    summary: "1:1-Review deines Pitch Decks mit dem LOVEDIS-Team.",
    description:
      "Wir gehen gemeinsam dein Pitch Deck durch: Story, Aufbau, Zahlen und Ask – mit ehrlichem Feedback und konkreten Verbesserungen für deine nächsten Investor-Gespräche.",
    format: "Sparring Session",
    providerCompany: "LOVEDIS",
    contactPerson: "Polina Kon",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 4,
  },
  {
    title: "Fördermittelberatung",
    category: "FUNDRAISING",
    summary:
      "Beratung zu verschiedenen non-dilutive Finanzierungsformen, wie der Forschungszulage.",
    description:
      "Beratung zu verschiedenen non-dilutive Finanzierungsformen, wie der Forschungszulage. Entweder als individuelle Session oder gemeinsamer Online Workshop buchbar.",
    format: "Individuelle Session oder Online Workshop",
    providerCompany: "DnA Ventures, HML Capital",
    creditCost: 1,
    sortOrder: 5,
  },

  // --- ⚖️ Legal (1 Credit oder 2 wo Notion „1-2" angibt) -----------------
  {
    title: "Geschäftsführerhaftung",
    category: "LEGAL",
    summary: "Haftungsrisiken der Geschäftsführung verstehen und absichern.",
    description:
      "Wofür Geschäftsführer:innen persönlich haften und wie ihr euch und euer Team absichert.",
    format: "Online Workshop (~2h)",
    providerCompany: "Momentum",
    contactPerson: "Philipp Weber",
    website: "https://www.momentum-partner.de/",
    creditCost: 2,
    sortOrder: 5,
  },
  {
    title: "SaaS Contracting",
    category: "LEGAL",
    summary: "Rechtssichere SaaS-Verträge — AGB, SLAs, Datenschutz.",
    description:
      "Vertragsgestaltung für SaaS-Produkte: AGB, Service Levels, Haftung und typische Fallstricke.",
    format: "Online Workshop (~2h)",
    providerCompany: "Aulinger",
    contactPerson: "Axel Staudt",
    website: "https://www.aulinger.eu",
    creditCost: 2,
    sortOrder: 6,
  },
  {
    title: "AI Act & Datenschutz",
    category: "LEGAL",
    summary: "EU AI Act und DSGVO für KI-Produkte praxisnah eingeordnet.",
    description:
      "Was der EU AI Act und die DSGVO für dein KI-Produkt bedeuten — Pflichten, Risiken und pragmatische Umsetzung.",
    format: "Online Workshop (~2h)",
    providerCompany: "Aulinger",
    contactPerson: "Axel Staudt",
    website: "https://www.aulinger.eu",
    creditCost: 2,
    sortOrder: 7,
  },
  {
    title: "Schutz des geistigen Eigentums / IP-Rechte",
    category: "LEGAL",
    summary: "IP-Strategie: Marken, Patente, Lizenzen richtig aufsetzen.",
    description:
      "Wie du dein geistiges Eigentum schützt und eine IP-Strategie entwickelst, die zu deinem Geschäftsmodell passt.",
    format: "Online Workshop (~2h)",
    providerCompany: "Aulinger",
    contactPerson: "Axel Staudt",
    website: "https://www.aulinger.eu",
    creditCost: 2,
    sortOrder: 8,
  },
  {
    title: "Vorbereitung einer Finanzierungsrunde",
    category: "LEGAL",
    summary: "Rechtliche Readiness für den nächsten Raise.",
    description:
      "Datenraum, Cap Table, Verträge und Term Sheet — juristisch vorbereitet in die Finanzierungsrunde gehen.",
    format: "Online Workshop (~2h)",
    providerCompany: "Aulinger",
    contactPerson: "Axel Staudt",
    website: "https://www.aulinger.eu",
    creditCost: 2,
    sortOrder: 9,
  },
  {
    title: "Exit Readiness & Due Diligence",
    category: "LEGAL",
    summary: "Auf Due Diligence und Exit-Prozesse rechtlich vorbereitet sein.",
    description:
      "Woran Deals in der Due Diligence scheitern — und wie du dein Unternehmen frühzeitig exit-ready aufstellst.",
    format: "Online Workshop (~2h)",
    providerCompany: "Momentum",
    contactPerson: "Philipp Weber",
    website: "https://www.momentum-partner.de/",
    creditCost: 2,
    sortOrder: 10,
  },
  {
    title:
      "Lunch Learning Session — Wandeldarlehen, SAFE & Venture Debt, VSOP/ESOP",
    category: "LEGAL",
    summary: "Kompakte Session zu Finanzierungsinstrumenten und Beteiligung.",
    description:
      "Wandeldarlehen, SAFE, Venture Debt sowie VSOP/ESOP verständlich erklärt — inkl. wann welches Instrument passt.",
    format: "Lunch Learning Session",
    providerCompany: "Momentum",
    contactPerson: "Philipp Weber",
    website: "https://www.momentum-partner.de/",
    creditCost: 1,
    sortOrder: 11,
  },
  {
    title:
      "Lunch Learning Session — Finanzierungsrunden aus Gründersicht & Term Sheets",
    category: "LEGAL",
    summary: "Finanzierungsrunden und Term Sheets aus Gründerperspektive.",
    description:
      "Term Sheets lesen und verhandeln — die wichtigsten Klauseln aus Gründersicht.",
    format: "Lunch Learning Session",
    providerCompany: "Momentum",
    contactPerson: "Philipp Weber",
    website: "https://www.momentum-partner.de/",
    creditCost: 1,
    sortOrder: 12,
  },
  {
    title: "Individual Expert Session",
    category: "LEGAL",
    summary:
      "Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.",
    description: INDIVIDUAL_EXPERT_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 13,
  },

  // --- 📣 Marketing --------------------------------------------------------
  {
    title: "Marketing 101",
    category: "MARKETING",
    summary: "Marketing-Grundlagen für Frühphasen-Startups.",
    description:
      "Die Basics: Positionierung, Kanäle, Funnel und die ersten Wachstumsschritte.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Hannah Freese",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 14,
  },
  {
    title: "Brand & Pitch Story",
    category: "MARKETING",
    summary: "Marke und Pitch-Story, die hängen bleiben.",
    description:
      "Entwickle eine klare Markenerzählung und eine Pitch-Story, die Investor:innen und Kund:innen überzeugt.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Hannah Freese",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 15,
  },
  {
    title: "Website-Strategie Starterkit",
    category: "MARKETING",
    summary: "1:1-Workshop für eine konversionsstarke Website.",
    description:
      "Ein 2-stündiger 1:1-Workshop, der das Fundament für eine erfolgreiche Website legt. Wir analysieren die Zielgruppe und die Kernbotschaft und entwickeln eine klare Seitenstruktur (Wireframe).\n\nErgebnis: Ein ausformuliertes Konzept, mit dem das Startup seine Website gezielt selbst umsetzen kann.",
    format: "1:1 Online Workshop",
    providerCompany: "GAL Digital",
    contactPerson: "Tobias Auradniczek",
    website: "https://www.gal-digital.de",
    creditCost: 2,
    sortOrder: 16,
  },
  {
    title: "LinkedIn Visibility Sprint",
    category: "MARKETING",
    summary: "Sichtbarkeit auf LinkedIn systematisch aufbauen.",
    description:
      "Content-Formate, Kadenz und Founder-Branding — mehr Reichweite und Inbound über LinkedIn.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Hannah Freese",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 17,
  },
  {
    title: "Pitching with Impact",
    category: "MARKETING",
    summary: "Überzeugend pitchen — Struktur, Storytelling, Auftritt.",
    description:
      "So baust du einen Pitch mit Wirkung: roter Faden, Storytelling und souveräner Auftritt.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Hannah Freese",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 18,
  },
  {
    title: "Individual Expert Session",
    category: "MARKETING",
    summary:
      "Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.",
    description: INDIVIDUAL_EXPERT_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 19,
  },

  // --- 🛠️ AI, Product & Tech (→ PRODUCT_TECH) -----------------------------
  {
    title: "Integrating AI in the Enterprise",
    category: "PRODUCT_TECH",
    summary: "KI sinnvoll ins Enterprise-Umfeld integrieren.",
    description:
      "Use-Cases, Architektur und Change: wie KI im Unternehmenskontext echten Mehrwert stiftet.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 20,
  },
  {
    title: "IP-AI",
    category: "PRODUCT_TECH",
    summary: "KI und geistiges Eigentum — Chancen und Grenzen.",
    description:
      "Was KI-Nutzung für dein IP bedeutet: Trainingsdaten, Outputs und Schutzstrategien.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 21,
  },
  {
    title: "Building an AI PoC",
    category: "PRODUCT_TECH",
    summary: "Von der Idee zum belastbaren KI-Proof-of-Concept.",
    description:
      "Wie du einen KI-PoC scopest, baust und bewertest — pragmatisch und ergebnisorientiert.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 22,
  },
  {
    title: "AI Agents & Technical Scaling",
    category: "PRODUCT_TECH",
    summary: "Agenten-Architekturen und technische Skalierung.",
    description:
      "Sparring zu Agenten-Systemen, Orchestrierung und dem Skalieren deiner technischen Plattform.",
    format: "Sparring",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 23,
  },
  {
    title: "AI PoC Review & Lessons Learned",
    category: "PRODUCT_TECH",
    summary: "Review eines bestehenden KI-PoC inkl. Learnings.",
    description:
      "Wir schauen gemeinsam auf deinen PoC: was funktioniert, was fehlt und wie es produktreif wird.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 24,
  },
  {
    title: "Tech Due Diligence Readiness",
    category: "PRODUCT_TECH",
    summary: "Auf technische Due Diligence vorbereitet sein.",
    description:
      "Codequalität, Architektur, Security und Doku — so bestehst du die technische DD im Fundraising.",
    format: "Sparring",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 25,
  },
  {
    title: "Tech-Stack Check-up",
    category: "PRODUCT_TECH",
    summary: "1:1-Review deines Tech-Stacks und deiner Architektur.",
    description:
      "Individueller 1:1-Check-up: Tech-Stack, Architekturentscheidungen und technische Schuld.",
    format: "1:1 Online Workshop",
    providerCompany: "GAL Digital",
    contactPerson: "Tobias Auradniczek",
    website: "https://www.gal-digital.de",
    creditCost: 2,
    sortOrder: 26,
  },
  {
    title: "MVP Validation & Product Validation",
    category: "PRODUCT_TECH",
    summary: "MVP und Produkthypothesen validieren.",
    description:
      "Wie du dein MVP und deine Produktannahmen schnell und günstig am Markt validierst.",
    format: "Sparring",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 27,
  },
  {
    title: "Cyber Security",
    category: "PRODUCT_TECH",
    summary: "Security-Grundlagen und Härtung für Startups.",
    description:
      "Praktische Security-Maßnahmen für dein Produkt und deine Infrastruktur — je nach Bedarf.",
    format: "Sparring",
    providerCompany: "je nach Bedarf",
    creditCost: 1,
    sortOrder: 28,
  },
  {
    title: "Live Hacking",
    category: "PRODUCT_TECH",
    summary: "Live-Hacking-Session — Angriffe verstehen, Lücken schließen.",
    description:
      "Interaktive Session: reale Angriffsszenarien live demonstriert und daraus abgeleitete Schutzmaßnahmen.",
    format: "Online Workshop",
    providerCompany: "LOVEDIS",
    contactPerson: "Tim Meggert",
    website: "https://lovedis.de",
    creditCost: 1,
    sortOrder: 29,
  },
  {
    title: "Individual Expert Session",
    category: "PRODUCT_TECH",
    summary:
      "Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.",
    description: INDIVIDUAL_EXPERT_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 30,
  },

  // --- 🤝 Sales ------------------------------------------------------------
  // Am 14.09.2026 aus dem Programm-Bereich (MARKETPLACE_PROGRAMS) in die
  // Support-Angebote verschoben; providerCompany/format sind aus der Original-
  // Beschreibung übernommen. creditCost 2 für GAL Digital (extern), 1 für die
  // übrigen (Stand 28.09.2026).
  {
    title: "Community / Ökosystem Sales",
    category: "SALES",
    summary: "Online Workshop zu Community- und Ökosystem-Vertrieb.",
    description:
      "90-minütige Session: Diese interaktive Session ist für Start-ups und Scale-ups, die sich fragen, wie sie in Zeiten der Multikrise wachsen und gleichzeitig Risiken reduzieren können. Ihr erfahrt von Sina, wie ihr Wachstum auf der Basis von Business-Gemeinschaften gestaltet und daraus ein krisenfestes Geschäftsmodell entwickelt.\n\nInhalte der Session\n\nGrowth neu denken: Warum Wachstum nicht zwangsläufig mehr Akquisedruck, Kapital und den Aufbau eigener Ressourcen bedeuten muss und welche Alternativen und Chancen gemeinschaftsbasierte Geschäftsmodelle bieten.",
    format: "Online Session (90 Min.)",
    providerCompany: "unusual business",
    contactPerson: "Sina Wans",
    creditCost: 1,
    sortOrder: 31,
  },
  {
    title: "Aufbau strukturierter Pipelines",
    category: "SALES",
    summary: "Online Workshop zum Aufbau strukturierter Sales-Pipelines.",
    description:
      "Ein 2-stündiger 1:1-Workshop zur Entwicklung eines praxisnahen Fahrplans für die Kundengewinnung. Wir identifizieren die wirkungsvollsten Marketingkanäle und erarbeiten gemeinsam erste Kampagnenideen.\n\nErgebnis: Eine umsetzbare 3-Monats-Roadmap mit priorisierten Maßnahmen zur Steigerung der Neukundengewinnung.",
    format: "Online Workshop",
    providerCompany: "GAL Digital",
    contactPerson: "Tobias Auradniczek",
    creditCost: 2,
    sortOrder: 32,
  },
  {
    title: "Nightmare Competitor",
    category: "SALES",
    summary: "Live Workshop zu Wettbewerbspositionierung.",
    description:
      "Der Workshop führt Teilnehmende in einem strukturierten Prozess durch sechs Module: Einstieg und Zielklärung, Branchentrends und Status quo, Einführung in die NC-Methodik, Konstruktion des eigenen Nightmare Competitors, Stärken-/Schwächenvergleich und abschließend die Entwicklung einer strategischen Antwort.\n\nAm Ende des Tages haben die Teilnehmenden ein konkretes NC-Szenario für ihre Branche entwickelt, ihre eigenen blinden Flecken und strategischen Schwächen identifiziert und erste strategische Stoßrichtungen priorisiert (Impact-Feasibility-Matrix).",
    format: "Live Workshop",
    providerCompany: "Uni Marburg / StartMiUp",
    contactPerson: "Michael Stephan",
    creditCost: 2,
    sortOrder: 34,
  },
  // Neues generisches „Sales"-Angebot (14.09.2026); Defaults aus dem DRAFT-
  // Programm „Sales, Pricing & Growth" abgeleitet, creditCost 1 wie die
  // übrigen Support-Angebote.
  {
    title: "Sales",
    category: "SALES",
    summary:
      "Individuelles Sales-Sparring rund um Vertrieb, Pricing und skalierbares Wachstum.",
    description:
      "Sparring rund um Sales, Pricing & Growth: geschärfte Value Proposition & ICP, strukturierte Pipeline und ein validiertes Pricing-Modell. Beschreibe deinen Bedarf — wir vermitteln die passende Expertise aus dem LOVEDIS-Netzwerk.",
    format: "Sparring",
    providerCompany: "LOVEDIS",
    creditCost: 1,
    sortOrder: 35,
  },
  {
    title: "Recruiting, People Culture, Leadership",
    category: "SALES",
    summary:
      "Individuelles Sparring oder gemeinsamer Workshop zu HR-Themen rund um Leadership, Recruiting und Kultur.",
    description:
      "Individuelles Sparring oder gemeinsamer Workshop zu HR-Themen rund um Leadership, Recruiting und Kultur.",
    format: "Online Workshop oder individuelles Sparring",
    providerCompany: "Magnotherm",
    contactPerson: "Nadia von Oesterreich",
    creditCost: 1,
    sortOrder: 33,
  },
];

/** Default orange-sticker copy when `comingSoon` is set without a custom label. */
export const DEFAULT_COMING_SOON_LABEL = "Coming Soon";

/** Sticker text for a program card or detail hero (catalog is the UI source of truth). */
export function programComingSoonLabel(
  title: string,
  comingSoon: boolean,
): string | null {
  if (!comingSoon) return null;
  const fromCatalog = MARKETPLACE_PROGRAMS.find((p) => p.title === title);
  return fromCatalog?.comingSoonLabel ?? DEFAULT_COMING_SOON_LABEL;
}
