import type { SupportCategory } from "@/generated/prisma/enums";
import { PROGRAM_FIX_CREDIT_COST } from "@/lib/credit-buckets";

// ---------------------------------------------------------------------------
// Marktplatz-Katalog — 1:1 aus der Notion-Seite „LOVEDIS Startup Support
// Marketplace" (Stand Juli 2026, re-verifiziert gegen die Notion-Datenbanken).
// Single source of truth für den Seed (prisma/seed.ts) UND das idempotente
// Sync-Script (prisma/apply-marketplace-notion.ts).
//
// Guardrails:
//   • NUR echte Notion-Einträge — keine erfundenen Angebote, Programme oder
//     Mentor:innen-Metadaten. Fehlt ein Wert in Notion, bleibt das Feld leer
//     (null), statt Platzhalter zu erfinden.
//   • Credit-Skala = Notion (1 Credit pro Session, 2 für die GAL-Digital-
//     1:1-Formate + „Live Hacking"). Programme kosten 0 FLEX-Credits,
//     verbrauchen aber beim Anmelden das reservierte FIX-Kontingent
//     (Notion: 6 fixe Credits).
//   • Anbieter/Kontakt/Website/Termin liegen in DEDIZIERTEN Feldern (nicht im
//     Freitext description/bio): SupportOffering.providerCompany/contactPerson/
//     website/sessionDate, MentorProfile.company/role/website, Program.
//     contactPerson/sessionDate.
//   • Website-URLs stammen aus den Notion-„Website"-Feldern der jeweiligen
//     Einträge (echte Links). Wo Notion keinen Link führt, bleibt das Feld leer.
//   • „Individual Expert Session" existiert in Notion NUR in Legal, Marketing
//     und AI/Product & Tech — dort echt gelistet. Fundraising nutzt stattdessen
//     die echte Investor-Sparring-Datenbank; Sales hat kein Fallback-Angebot.
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
  /** FIX credits an enrolment consumes (Notion: 6 for Sales, Pricing & Growth). */
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

export const MARKETPLACE_PROGRAMS: ProgramSeed[] = [
  {
    title: "Sales, Pricing & Growth",
    summary:
      "Exklusives Programm rund um Vertrieb, Pricing und skalierbares Wachstum — 6 fixe Credits, du musst dich nur anmelden.",
    description:
      "Das exklusive LOVEDIS-Programm rund um Sales, Pricing & Growth. Von den 12 Venture Credits sind 6 fix für diese Journey verplant — du musst sie nicht einlösen, sondern dich nur offiziell anmelden.\n\n" +
      "Session „Sales Foundations: People, Process & Tools — ein Framework für skalierbares GTM“: Online Workshop, 90 Min., Q&A bei Bedarf.\n\n" +
      "Programmziele: geschärfte Value Proposition & ICP, ein Sales Handbook (Pipeline, GtM, Playbook, Deal Qualification, Skalierung) sowie eine Pricing-Strategie mit validiertem Pricing-Modell.",
    focusTags: ["Sales", "Pricing", "Growth", "GTM"],
    status: "OPEN",
    contactPerson: "Claudia Proß",
    sessionDate: "Input-Session am 27. August, 12:00–13:30 Uhr",
    fixCreditCost: PROGRAM_FIX_CREDIT_COST,
    sortOrder: 1,
  },
];

// ---------------------------------------------------------------------------
// Mentor:innen — Führungskräfte/Expert:innen der LOVEDIS-Unternehmenspartner.
// Company (Unternehmen), role (Position) und website (URL) stammen 1:1 aus der
// Notion-Mentor:innen-Datenbank. Notion nennt KEINEN Credit-Preis → Entscheidung:
// 1 Credit (analog zur Session-Skala). Notion liefert weder Expertise-Tags noch
// eine Bio → bewusst leer (keine erfundenen Werte). Fotos liegen lokal unter
// public/mentors/ (stabile Slugs, umlaut-transliteriert; Notion-Signed-URLs
// laufen ab); die Endung entspricht dem tatsächlichen Bildformat der Quelle.
// ---------------------------------------------------------------------------

export const MARKETPLACE_MENTORS: MentorSeed[] = [
  {
    name: "Elena Tiegs",
    company: "Weimer",
    role: "Umwelt-, Hygiene- und Sicherheitsingenieurwesen",
    expertise: [],
    website: "https://www.weimer-bau.de",
    photoUrl: "/mentors/elena-tiegs.jpg",
    creditCost: 1,
    sortOrder: 1,
  },
  {
    name: "Thomas Pregla",
    company: "Sälzer",
    role: "Head of Technology & Product-Development",
    expertise: [],
    website: "https://www.saelzer-security.com",
    photoUrl: "/mentors/thomas-pregla.avif",
    creditCost: 1,
    sortOrder: 2,
  },
  {
    name: "Marie Bender",
    company: "Weimer",
    role: "Digitalisierung & HR",
    expertise: [],
    website: "https://www.weimer-bau.de",
    photoUrl: "/mentors/marie-bender.jpg",
    creditCost: 1,
    sortOrder: 3,
  },
  {
    name: "Robin Sinemli",
    company: "Lupp Living GmbH & Co. KG",
    role: "Geschäftsführer",
    expertise: [],
    website: "https://www.lupp.de",
    photoUrl: "/mentors/robin-sinemli.avif",
    creditCost: 1,
    sortOrder: 4,
  },
  {
    name: "Henri Böwingloh",
    company: "Sälzer",
    role: "Project Manager Training & Innovation",
    expertise: [],
    website: "https://www.saelzer-security.com",
    photoUrl: "/mentors/henri-boewingloh.jpg",
    creditCost: 1,
    sortOrder: 5,
  },
  {
    name: "Celin Winter",
    company: "Innexis",
    role: "Product Manager Facilities",
    expertise: [],
    website: "https://www.innexis.com",
    photoUrl: "/mentors/celin-winter.jpg",
    creditCost: 1,
    sortOrder: 6,
  },
  {
    name: "Louisa Cronau",
    company: "Fingerhaus",
    role: "Geschäftsführerin",
    expertise: [],
    website: "https://www.fingerhaus.de",
    photoUrl: "/mentors/louisa-cronau.avif",
    creditCost: 1,
    sortOrder: 7,
  },
  {
    name: "Dr. Alexandra Hofmockel",
    company: "Innexis",
    role: "Business Development and Mergers & Acquisitions",
    expertise: [],
    website: "https://www.innexis.com",
    photoUrl: "/mentors/dr-alexandra-hofmockel.png",
    creditCost: 1,
    sortOrder: 8,
  },
];

// ---------------------------------------------------------------------------
// Support-Angebote — echte Notion-Angebote je Kategorie. Anbieter/Kontakt/
// Website/Termin liegen in dedizierten Feldern. Fast alle 1 Credit; die
// GAL-Digital-1:1-Formate + „Live Hacking" kosten 2. Die „Individual Expert
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
      "Realyze Ventures, HTGF, re:cap Technologies, Wunderland Capital, Business Angels FrankfurtRheinMain, Futury Capital, Business Angels Mittelhessen",
    creditCost: 1,
    sortOrder: 4,
  },

  // --- ⚖️ Legal (alle 1 Credit, Online Workshop ~2h) ----------------------
  {
    title: "Geschäftsführerhaftung",
    category: "LEGAL",
    summary: "Haftungsrisiken der Geschäftsführung verstehen und absichern.",
    description:
      "Was Geschäftsführer:innen persönlich haftet — und wie du dich und dein Team absicherst.",
    format: "Online Workshop (~2h)",
    providerCompany: "Momentum",
    contactPerson: "Philipp Weber",
    website: "https://www.momentum-partner.de/",
    creditCost: 1,
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
    creditCost: 1,
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
    creditCost: 1,
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
    creditCost: 1,
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
    creditCost: 1,
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
    creditCost: 1,
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
      "Individueller 1:1-Workshop: Struktur, Messaging und Conversion-Elemente für deine Website.",
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
    creditCost: 2,
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
];
