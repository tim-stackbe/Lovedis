import type { SupportCategory } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Marktplatz-Katalog — 1:1 aus der Notion-Seite „LOVEDIS Startup Support
// Marketplace" (Stand Juli 2026). Single source of truth für den Seed
// (prisma/seed.ts) UND das idempotente Sync-Script
// (prisma/apply-marketplace-notion.ts).
//
// Guardrails (First Slice, kein Schema-Change):
//   • Credit-Skala = Notion (1 Credit pro Session, 2 für GAL-Digital-1:1-Formate
//     + „Live Hacking"). Programme bleiben 0-Credit („inklusive").
//   • Anbieter/Kontakt/Website haben KEINE eigene Spalte → wir betten sie in die
//     bestehenden Freitextfelder (description/bio) ein, statt Spalten zu ergänzen.
//   • Natürliche Schlüssel für Idempotenz: Program.title, MentorProfile.name,
//     SupportOffering (title + category).
// ---------------------------------------------------------------------------

export interface ProgramSeed {
  title: string;
  summary: string;
  description: string;
  focusTags: string[];
  status: "DRAFT" | "OPEN" | "CLOSED";
  sortOrder: number;
}

export interface MentorSeed {
  name: string;
  company: string;
  role: string;
  expertise: string[];
  bio: string;
  creditCost: number;
  sortOrder: number;
}

export interface OfferingSeed {
  title: string;
  category: SupportCategory;
  summary: string;
  description: string;
  format: string;
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
      "Session „Sales Foundations: People, Process & Tools — ein Framework für skalierbares GTM“: Online Workshop, 90 Min., Input-Session am 27. August 12:00–13:30 Uhr, Q&A bei Bedarf (Kontakt: Claudia Proß).\n\n" +
      "Programmziele: geschärfte Value Proposition & ICP, ein Sales Handbook (Pipeline, GtM, Playbook, Deal Qualification, Skalierung) sowie eine Pricing-Strategie mit validiertem Pricing-Modell.",
    focusTags: ["Sales", "Pricing", "Growth", "GTM"],
    status: "OPEN",
    sortOrder: 1,
  },
];

// ---------------------------------------------------------------------------
// Mentor:innen — Sparring mit Führungskräften der LOVEDIS-Unternehmenspartner
// (Bau-/Immobilienbranche). Notion nennt KEINEN Credit-Preis → Entscheidung:
// 1 Credit (analog zur Session-Skala). Notion mappt Mentor:in→Partnerfirma
// nicht explizit → die 5 Partnerfirmen sind kuratiert round-robin zugeordnet.
// ---------------------------------------------------------------------------

const MENTOR_PARTNER_FIRMS = [
  "Fingerhaus",
  "Lupp Living GmbH & Co. KG",
  "Weimer",
  "Sälzer",
  "Innexis",
] as const;

const MENTOR_NAMES = [
  "Elena Tiegs",
  "Thomas Pregla",
  "Marie Bender",
  "Robin Sinemli",
  "Henri Böwingloh",
  "Celin Winter",
  "Louisa Cronau",
  "Dr. Alexandra Hofmockel",
] as const;

export const MARKETPLACE_MENTORS: MentorSeed[] = MENTOR_NAMES.map(
  (name, i) => ({
    name,
    company: MENTOR_PARTNER_FIRMS[i % MENTOR_PARTNER_FIRMS.length],
    role: "Mentor:in · Führungskraft LOVEDIS-Unternehmenspartner",
    expertise: ["Sparring", "Strategie", "Bau & Immobilien", "Skalierung"],
    bio:
      `Hauptansprechpartner:in aus dem LOVEDIS-Partnernetzwerk (${MENTOR_PARTNER_FIRMS[i % MENTOR_PARTNER_FIRMS.length]}). ` +
      "Trägt Startup-Themen ins eigene Unternehmen und steht für 1:1-Sparring zu Wachstum, Vertrieb und Zusammenarbeit mit der Bau- und Immobilienbranche zur Verfügung.",
    creditCost: 1,
    sortOrder: i + 1,
  })
);

// ---------------------------------------------------------------------------
// Support-Angebote — echte Notion-Angebote je Kategorie. Anbieter/Kontakt sind
// in die description eingebettet (kein eigenes Feld). Fast alle 1 Credit; die
// GAL-Digital-1:1-Formate + „Live Hacking" kosten 2. Jede Kategorie hat eine
// „Individual Expert Session" als Fallback (Bedarf beschreiben → Team matcht).
// ---------------------------------------------------------------------------

/** Hängt Anbieter/Kontakt-Info an den Beschreibungstext an (kein DB-Feld dafür). */
function withProvider(description: string, provider: string): string {
  return `${description}\n\nAnbieter/Kontakt: ${provider}.`;
}

const FALLBACK_DESCRIPTION =
  "Kein passendes Angebot dabei? Beschreibe deine konkrete Herausforderung — das LOVEDIS-Team vermittelt dir die passende Expert:in aus dem Netzwerk.";

export const MARKETPLACE_OFFERINGS: OfferingSeed[] = [
  // --- 💰 Fundraising ------------------------------------------------------
  {
    title: "Founder Insights: Vom ersten Fundraising zum Exit",
    category: "FUNDRAISING",
    summary: "Q&A mit einem erfahrenen Founder — vom ersten Raise bis zum Exit.",
    description: withProvider(
      "Offene Q&A-Session zu Fundraising-Realität: erste Runde, Wachstum, Verhandlung und Exit — aus erster Hand.",
      "Wunderland Capital / Dirk Rudolf"
    ),
    format: "Online Q&A",
    creditCost: 1,
    sortOrder: 1,
  },
  {
    title: "Stakeholdermanagement",
    category: "FUNDRAISING",
    summary: "Workshop zu Erwartungs- und Beziehungsmanagement mit Kapitalgebern.",
    description: withProvider(
      "Wie du Investor:innen, Beirat und weitere Stakeholder entlang der Finanzierungsreise aktiv steuerst und Vertrauen aufbaust.",
      "LOVEDIS / Polina Kon"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 2,
  },
  {
    title: "Funding Strategy & Insights zu Venture Debt",
    category: "FUNDRAISING",
    summary: "Finanzierungsstrategie inkl. Venture Debt als Baustein.",
    description: withProvider(
      "Wann Eigenkapital, wann Venture Debt? Strategie-Session zu Finanzierungsmix, Timing und Konditionen.",
      "re:cap Technologies / Lilli Pukall"
    ),
    format: "Online Workshop (60–90 Min.)",
    creditCost: 1,
    sortOrder: 3,
  },
  {
    title: "Individuelle Expert:innen Sessions (Investor-Sparring)",
    category: "FUNDRAISING",
    summary: "1:1-Sparring mit Investor:innen aus dem LOVEDIS-Netzwerk.",
    description: withProvider(
      "Direktes Sparring mit Investor:innen zu Story, Runde und Bewertung. Wir matchen die passende Person aus unserem Netzwerk.",
      "Realyze Ventures, HTGF, re:cap Technologies, Wunderland Capital, Business Angels FrankfurtRheinMain, Futury Capital, Business Angels Mittelhessen"
    ),
    format: "Sparring Session",
    creditCost: 1,
    sortOrder: 4,
  },
  {
    title: "Individual Expert Session",
    category: "FUNDRAISING",
    summary: "Fallback: Beschreibe deinen Bedarf, wir vermitteln die passende Expert:in.",
    description: FALLBACK_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 5,
  },

  // --- ⚖️ Legal (alle 1 Credit, Online Workshop ~2h) ----------------------
  {
    title: "Geschäftsführerhaftung",
    category: "LEGAL",
    summary: "Haftungsrisiken der Geschäftsführung verstehen und absichern.",
    description: withProvider(
      "Was Geschäftsführer:innen persönlich haftet — und wie du dich und dein Team absicherst.",
      "Momentum / Philipp Weber"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 6,
  },
  {
    title: "SaaS Contracting",
    category: "LEGAL",
    summary: "Rechtssichere SaaS-Verträge — AGB, SLAs, Datenschutz.",
    description: withProvider(
      "Vertragsgestaltung für SaaS-Produkte: AGB, Service Levels, Haftung und typische Fallstricke.",
      "Aulinger / Axel Staudt"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 7,
  },
  {
    title: "AI Act & Datenschutz",
    category: "LEGAL",
    summary: "EU AI Act und DSGVO für KI-Produkte praxisnah eingeordnet.",
    description: withProvider(
      "Was der EU AI Act und die DSGVO für dein KI-Produkt bedeuten — Pflichten, Risiken und pragmatische Umsetzung.",
      "Aulinger / Axel Staudt"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 8,
  },
  {
    title: "Schutz des geistigen Eigentums / IP-Rechte",
    category: "LEGAL",
    summary: "IP-Strategie: Marken, Patente, Lizenzen richtig aufsetzen.",
    description: withProvider(
      "Wie du dein geistiges Eigentum schützt und eine IP-Strategie entwickelst, die zu deinem Geschäftsmodell passt.",
      "Aulinger / Axel Staudt"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 9,
  },
  {
    title: "Vorbereitung einer Finanzierungsrunde",
    category: "LEGAL",
    summary: "Rechtliche Readiness für den nächsten Raise.",
    description: withProvider(
      "Datenraum, Cap Table, Verträge und Term Sheet — juristisch vorbereitet in die Finanzierungsrunde gehen.",
      "Aulinger / Axel Staudt"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 10,
  },
  {
    title: "Exit Readiness & Due Diligence",
    category: "LEGAL",
    summary: "Auf Due Diligence und Exit-Prozesse rechtlich vorbereitet sein.",
    description: withProvider(
      "Woran Deals in der Due Diligence scheitern — und wie du dein Unternehmen frühzeitig exit-ready aufstellst.",
      "Momentum / Philipp Weber"
    ),
    format: "Online Workshop (~2h)",
    creditCost: 1,
    sortOrder: 11,
  },
  {
    title:
      "Lunch Learning Session — Wandeldarlehen, SAFE & Venture Debt, VSOP/ESOP",
    category: "LEGAL",
    summary: "Kompakte Session zu Finanzierungsinstrumenten und Beteiligung.",
    description: withProvider(
      "Wandeldarlehen, SAFE, Venture Debt sowie VSOP/ESOP verständlich erklärt — inkl. wann welches Instrument passt.",
      "Momentum / Philipp Weber"
    ),
    format: "Lunch Learning Session",
    creditCost: 1,
    sortOrder: 12,
  },
  {
    title:
      "Lunch Learning Session — Finanzierungsrunden aus Gründersicht & Term Sheets",
    category: "LEGAL",
    summary: "Finanzierungsrunden und Term Sheets aus Gründerperspektive.",
    description: withProvider(
      "Term Sheets lesen und verhandeln — die wichtigsten Klauseln aus Gründersicht.",
      "Momentum / Philipp Weber"
    ),
    format: "Lunch Learning Session",
    creditCost: 1,
    sortOrder: 13,
  },
  {
    title: "Individual Expert Session",
    category: "LEGAL",
    summary: "Fallback: Beschreibe deinen Bedarf, wir vermitteln die passende Expert:in.",
    description: FALLBACK_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 14,
  },

  // --- 📣 Marketing --------------------------------------------------------
  {
    title: "Marketing 101",
    category: "MARKETING",
    summary: "Marketing-Grundlagen für Frühphasen-Startups.",
    description: withProvider(
      "Die Basics: Positionierung, Kanäle, Funnel und die ersten Wachstumsschritte.",
      "LOVEDIS / Hannah Freese"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 15,
  },
  {
    title: "Brand & Pitch Story",
    category: "MARKETING",
    summary: "Marke und Pitch-Story, die hängen bleiben.",
    description: withProvider(
      "Entwickle eine klare Markenerzählung und eine Pitch-Story, die Investor:innen und Kund:innen überzeugt.",
      "LOVEDIS / Hannah Freese"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 16,
  },
  {
    title: "Website-Strategie Starterkit",
    category: "MARKETING",
    summary: "1:1-Workshop für eine konversionsstarke Website.",
    description: withProvider(
      "Individueller 1:1-Workshop: Struktur, Messaging und Conversion-Elemente für deine Website.",
      "GAL Digital / Tobias Auradniczek"
    ),
    format: "1:1 Online Workshop",
    creditCost: 2,
    sortOrder: 17,
  },
  {
    title: "LinkedIn Visibility Sprint",
    category: "MARKETING",
    summary: "Sichtbarkeit auf LinkedIn systematisch aufbauen.",
    description: withProvider(
      "Content-Formate, Kadenz und Founder-Branding — mehr Reichweite und Inbound über LinkedIn.",
      "LOVEDIS / Hannah Freese"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 18,
  },
  {
    title: "Pitching with Impact",
    category: "MARKETING",
    summary: "Überzeugend pitchen — Struktur, Storytelling, Auftritt.",
    description: withProvider(
      "So baust du einen Pitch mit Wirkung: roter Faden, Storytelling und souveräner Auftritt.",
      "LOVEDIS / Hannah Freese"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 19,
  },
  {
    title: "Individual Expert Session",
    category: "MARKETING",
    summary: "Fallback: Beschreibe deinen Bedarf, wir vermitteln die passende Expert:in.",
    description: FALLBACK_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 20,
  },

  // --- 🛠️ AI, Product & Tech (→ PRODUCT_TECH) -----------------------------
  {
    title: "Integrating AI in the Enterprise",
    category: "PRODUCT_TECH",
    summary: "KI sinnvoll ins Enterprise-Umfeld integrieren.",
    description: withProvider(
      "Use-Cases, Architektur und Change: wie KI im Unternehmenskontext echten Mehrwert stiftet.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 21,
  },
  {
    title: "IP-AI",
    category: "PRODUCT_TECH",
    summary: "KI und geistiges Eigentum — Chancen und Grenzen.",
    description: withProvider(
      "Was KI-Nutzung für dein IP bedeutet: Trainingsdaten, Outputs und Schutzstrategien.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 22,
  },
  {
    title: "Building an AI PoC",
    category: "PRODUCT_TECH",
    summary: "Von der Idee zum belastbaren KI-Proof-of-Concept.",
    description: withProvider(
      "Wie du einen KI-PoC scopest, baust und bewertest — pragmatisch und ergebnisorientiert.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 23,
  },
  {
    title: "AI Agents & Technical Scaling",
    category: "PRODUCT_TECH",
    summary: "Agenten-Architekturen und technische Skalierung.",
    description: withProvider(
      "Sparring zu Agenten-Systemen, Orchestrierung und dem Skalieren deiner technischen Plattform.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Sparring",
    creditCost: 1,
    sortOrder: 24,
  },
  {
    title: "AI PoC Review & Lessons Learned",
    category: "PRODUCT_TECH",
    summary: "Review eines bestehenden KI-PoC inkl. Learnings.",
    description: withProvider(
      "Wir schauen gemeinsam auf deinen PoC: was funktioniert, was fehlt und wie es produktreif wird.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Online Workshop",
    creditCost: 1,
    sortOrder: 25,
  },
  {
    title: "Tech Due Diligence Readiness",
    category: "PRODUCT_TECH",
    summary: "Auf technische Due Diligence vorbereitet sein.",
    description: withProvider(
      "Codequalität, Architektur, Security und Doku — so bestehst du die technische DD im Fundraising.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Sparring",
    creditCost: 1,
    sortOrder: 26,
  },
  {
    title: "Tech-Stack Check-up",
    category: "PRODUCT_TECH",
    summary: "1:1-Review deines Tech-Stacks und deiner Architektur.",
    description: withProvider(
      "Individueller 1:1-Check-up: Tech-Stack, Architekturentscheidungen und technische Schuld.",
      "GAL Digital / Tobias Auradniczek"
    ),
    format: "1:1 Online Workshop",
    creditCost: 2,
    sortOrder: 27,
  },
  {
    title: "MVP Validation & Product Validation",
    category: "PRODUCT_TECH",
    summary: "MVP und Produkthypothesen validieren.",
    description: withProvider(
      "Wie du dein MVP und deine Produktannahmen schnell und günstig am Markt validierst.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Sparring",
    creditCost: 1,
    sortOrder: 28,
  },
  {
    title: "Cyber Security",
    category: "PRODUCT_TECH",
    summary: "Security-Grundlagen und Härtung für Startups.",
    description: withProvider(
      "Praktische Security-Maßnahmen für dein Produkt und deine Infrastruktur — je nach Bedarf.",
      "je nach Bedarf (LOVEDIS-Netzwerk)"
    ),
    format: "Sparring",
    creditCost: 1,
    sortOrder: 29,
  },
  {
    title: "Live Hacking",
    category: "PRODUCT_TECH",
    summary: "Live-Hacking-Session — Angriffe verstehen, Lücken schließen.",
    description: withProvider(
      "Interaktive Session: reale Angriffsszenarien live demonstriert und daraus abgeleitete Schutzmaßnahmen.",
      "LOVEDIS / Tim Meggert"
    ),
    format: "Online Workshop",
    creditCost: 2,
    sortOrder: 30,
  },
  {
    title: "Individual Expert Session",
    category: "PRODUCT_TECH",
    summary: "Fallback: Beschreibe deinen Bedarf, wir vermitteln die passende Expert:in.",
    description: FALLBACK_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 31,
  },

  // --- 🚀 Sales (Fallback zusätzlich zum exklusiven Programm) --------------
  {
    title: "Individual Expert Session",
    category: "SALES",
    summary: "Fallback: Beschreibe deinen Sales-Bedarf, wir vermitteln die passende Expert:in.",
    description: FALLBACK_DESCRIPTION,
    format: "Sparring",
    creditCost: 1,
    sortOrder: 32,
  },
];
