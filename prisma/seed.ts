/**
 * Seed script — creates one demo user per role plus a realistic universe of
 * startups, evaluations, challenges, applications, PoCs and shared scorings.
 *
 * Demo accounts (password for all: see PASSWORD below):
 *   admin@lovedis.dev     ADMIN
 *   member@lovedis.dev    MEMBER
 *   partner@lovedis.dev   BUSINESS_PARTNER
 *   investor@lovedis.dev  INVESTOR
 *   startup@lovedis.dev   STARTUP
 */
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  PipelineStage,
  RadarQuadrant,
  RadarRing,
  ScoreDimension,
  StartupStage,
} from "../src/generated/prisma/enums";
import { SCORE_DIMENSIONS } from "../src/lib/constants";
import {
  computeFeasibility,
  computeOverallScore,
  computePotential,
  deriveRecommendation,
  type DimensionScores,
} from "../src/lib/scoring";

const PASSWORD = "Lovedis2026!";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface StartupSeed {
  name: string;
  website: string;
  description: string;
  industry: string;
  country: string;
  city: string;
  foundedYear: number;
  teamSize: number;
  stage: StartupStage;
  fundingRaised: number;
  pipelineStage: PipelineStage;
  radarQuadrant?: RadarQuadrant;
  radarRing?: RadarRing;
  scores?: Partial<Record<ScoreDimension, number>>;
  // Curated public storefront (marketplace)
  published?: boolean;
  tagline?: string;
  publicPitch?: string;
  lookingFor?: string[];
  seekingFunding?: boolean;
  seekingAmount?: number;
}

const STARTUPS: StartupSeed[] = [
  {
    name: "NeuralForge",
    website: "https://neuralforge.example.com",
    description:
      "Foundation-Model-Copilot, der SPS-Code für Automatisierungsingenieure in der Industrie schreibt und verifiziert.",
    industry: "Künstliche Intelligenz",
    country: "Deutschland",
    city: "München",
    foundedYear: 2023,
    teamSize: 28,
    stage: "SERIES_A",
    fundingRaised: 12.5,
    pipelineStage: "PILOT",
    radarQuadrant: "AI_DATA",
    radarRing: "ADOPT",
    scores: {
      MARKET: 5, PRODUCT: 4, TRACTION: 4, COMPETITIVE_POSITION: 4,
      TEAM: 5, BUSINESS_MODEL: 4, STRATEGIC_FIT: 5,
    },
    published: true,
    tagline: "Der Copilot, der SPS-Code schreibt und verifiziert.",
    publicPitch:
      "NeuralForge bringt Foundation Models in die Fabrikhalle: Automatisierungsingenieure beschreiben das gewünschte Verhalten in natürlicher Sprache, unser Copilot generiert verifizierten SPS-Code und prüft ihn gegen Sicherheitsregeln. Über 40 Industriekunden, 12 Pilotprojekte und ein Team aus Robotik- und ML-Veteranen.",
    lookingFor: ["Funding", "Piloten"],
    seekingFunding: true,
    seekingAmount: 18,
  },
  {
    name: "Voltaic Grid",
    website: "https://voltaicgrid.example.com",
    description:
      "Software für virtuelle Kraftwerke, die industrielle Batteriespeicher für Regelenergiemärkte bündelt.",
    industry: "Energie",
    country: "Deutschland",
    city: "Hamburg",
    foundedYear: 2022,
    teamSize: 41,
    stage: "SERIES_B",
    fundingRaised: 34,
    pipelineStage: "PARTNERED",
    radarQuadrant: "CLIMATE_ENERGY",
    radarRing: "ADOPT",
    scores: {
      MARKET: 5, PRODUCT: 5, TRACTION: 4, COMPETITIVE_POSITION: 3,
      TEAM: 4, BUSINESS_MODEL: 5, STRATEGIC_FIT: 4,
    },
    published: true,
    tagline: "Virtuelle Kraftwerke für die Industrie.",
    publicPitch:
      "Voltaic Grid bündelt industrielle Batteriespeicher zu virtuellen Kraftwerken und vermarktet sie auf Regelenergie- und Day-Ahead-Märkten. 80 MWh unter Management, Partnerschaft mit einem der größten deutschen Industriekonzerne, profitabel auf Beitragsebene.",
    lookingFor: ["Funding"],
    seekingFunding: true,
    seekingAmount: 30,
  },
  {
    name: "CarbonLoom",
    website: "https://carbonloom.example.com",
    description:
      "Direct-Air-Capture-Module zum Nachrüsten bestehender Lüftungsanlagen in Gewerbegebäuden.",
    industry: "Climate Tech",
    country: "Niederlande",
    city: "Rotterdam",
    foundedYear: 2024,
    teamSize: 9,
    stage: "SEED",
    fundingRaised: 2.1,
    pipelineStage: "IN_EVALUATION",
    radarQuadrant: "CLIMATE_ENERGY",
    radarRing: "ASSESS",
    scores: {
      MARKET: 5, PRODUCT: 2, TRACTION: 1, COMPETITIVE_POSITION: 3,
      TEAM: 4, BUSINESS_MODEL: 2, STRATEGIC_FIT: 4,
    },
    published: true,
    tagline: "Direct Air Capture zum Nachrüsten.",
    publicPitch:
      "CarbonLoom macht CO2-Abscheidung zur Plug-in-Komponente für bestehende Gebäudelüftung. Unsere Module binden CO2 dort, wo es entsteht, ohne teure Neubauten. Erstes Pilotgebäude live in Rotterdam, zweites in Planung.",
    lookingFor: ["Funding", "Piloten", "Talent"],
    seekingFunding: true,
    seekingAmount: 6,
  },
  {
    name: "MediGraph",
    website: "https://medigraph.example.com",
    description:
      "Knowledge-Graph-Plattform, die klinische Studiendaten mit Real-World-Evidenz für die Pharma-F&E verknüpft.",
    industry: "Health Tech",
    country: "Deutschland",
    city: "Berlin",
    foundedYear: 2021,
    teamSize: 55,
    stage: "SERIES_B",
    fundingRaised: 41,
    pipelineStage: "SCREENING",
    radarQuadrant: "HEALTH_BIO",
    radarRing: "TRIAL",
    scores: {
      MARKET: 4, PRODUCT: 4, TRACTION: 5, COMPETITIVE_POSITION: 4,
      TEAM: 4, BUSINESS_MODEL: 4, STRATEGIC_FIT: 3,
    },
    published: true,
    tagline: "Knowledge Graphs für die Pharma-Forschung.",
    publicPitch:
      "MediGraph verknüpft klinische Studiendaten mit Real-World-Evidenz und macht sie für die Pharma-F&E abfragbar. Vier der Top-20-Pharmaunternehmen nutzen unsere Plattform bereits produktiv.",
    lookingFor: ["Talent"],
    seekingFunding: false,
  },
  {
    name: "HaptiCare",
    website: "https://hapticare.example.com",
    description:
      "Haptik-Feedback-Handschuhe für Remote-Physiotherapie mit Motion-Tracking und Outcome-Analytik.",
    industry: "Health Tech",
    country: "Österreich",
    city: "Wien",
    foundedYear: 2023,
    teamSize: 14,
    stage: "SEED",
    fundingRaised: 3.8,
    pipelineStage: "IN_EVALUATION",
    radarQuadrant: "HEALTH_BIO",
    radarRing: "ASSESS",
    scores: {
      MARKET: 3, PRODUCT: 4, TRACTION: 2, COMPETITIVE_POSITION: 4,
      TEAM: 4, BUSINESS_MODEL: 3, STRATEGIC_FIT: 4,
    },
    published: true,
    tagline: "Haptisches Feedback für die Tele-Physiotherapie.",
    publicPitch:
      "HaptiCare verbindet Reha-Patientinnen und -Patienten per Haptik-Handschuh mit ihren Therapeut:innen — mit Motion-Tracking und Outcome-Analytik. Pilotiert mit zwei Klinikgruppen in der DACH-Region.",
    lookingFor: ["Funding", "Piloten"],
    seekingFunding: true,
    seekingAmount: 4,
  },
  {
    name: "FactoryPulse",
    website: "https://factorypulse.example.com",
    description:
      "Selbstkalibrierende Akustiksensoren, die Maschinenanomalien Wochen vor dem Ausfall erkennen.",
    industry: "Industrial IoT",
    country: "Deutschland",
    city: "Stuttgart",
    foundedYear: 2022,
    teamSize: 23,
    stage: "SERIES_A",
    fundingRaised: 9.5,
    pipelineStage: "PILOT",
    radarQuadrant: "INDUSTRY_40",
    radarRing: "TRIAL",
    scores: {
      MARKET: 4, PRODUCT: 5, TRACTION: 4, COMPETITIVE_POSITION: 4,
      TEAM: 4, BUSINESS_MODEL: 4, STRATEGIC_FIT: 5,
    },
    published: true,
    tagline: "Maschinenausfälle hören, bevor sie passieren.",
    publicPitch:
      "FactoryPulse rüstet bestehende Maschinen mit selbstkalibrierenden Akustiksensoren aus, die Anomalien Wochen vor dem Ausfall erkennen. Über 600 Maschinen instrumentiert, laufende Pilotprojekte in mehreren Presswerken.",
    lookingFor: ["Funding", "Piloten"],
    seekingFunding: true,
    seekingAmount: 12,
  },
  {
    name: "RoboHive",
    website: "https://robohive.example.com",
    description:
      "Schwarm-Koordinationssoftware für gemischte Flotten von Lagerrobotern verschiedener Hersteller.",
    industry: "Robotik",
    country: "Dänemark",
    city: "Odense",
    foundedYear: 2023,
    teamSize: 19,
    stage: "SEED",
    fundingRaised: 5.2,
    pipelineStage: "SCREENING",
    radarQuadrant: "INDUSTRY_40",
    radarRing: "ASSESS",
    scores: {
      MARKET: 4, PRODUCT: 3, TRACTION: 2, COMPETITIVE_POSITION: 3,
      TEAM: 5, BUSINESS_MODEL: 3, STRATEGIC_FIT: 4,
    },
  },
  {
    name: "QuantaShield",
    website: "https://quantashield.example.com",
    description:
      "Post-Quanten-Kryptografie-Toolkit, das industrielle Legacy-Protokolle ohne Ausfallzeit migriert.",
    industry: "Cybersecurity",
    country: "Frankreich",
    city: "Paris",
    foundedYear: 2024,
    teamSize: 11,
    stage: "PRE_SEED",
    fundingRaised: 1.2,
    pipelineStage: "DISCOVERED",
    radarQuadrant: "AI_DATA",
    radarRing: "HOLD",
    scores: {
      MARKET: 4, PRODUCT: 2, TRACTION: 1, COMPETITIVE_POSITION: 2,
      TEAM: 3, BUSINESS_MODEL: 2, STRATEGIC_FIT: 2,
    },
  },
  {
    name: "FreightFlow",
    website: "https://freightflow.example.com",
    description:
      "KI-Disponent, der Stückgutfracht über Spediteure hinweg bündelt und Leerkilometer um 30 % senkt.",
    industry: "Logistik",
    country: "Deutschland",
    city: "Köln",
    foundedYear: 2021,
    teamSize: 62,
    stage: "SERIES_B",
    fundingRaised: 48,
    pipelineStage: "PASSED",
    radarQuadrant: "INDUSTRY_40",
    radarRing: "HOLD",
    scores: {
      MARKET: 3, PRODUCT: 3, TRACTION: 4, COMPETITIVE_POSITION: 2,
      TEAM: 3, BUSINESS_MODEL: 2, STRATEGIC_FIT: 1,
    },
  },
  {
    name: "AgriSense Labs",
    website: "https://agrisense.example.com",
    description:
      "Hyperspektrale Drohnenbilder plus Agronomie-Modelle, die den Düngereinsatz im Reihenanbau senken.",
    industry: "Climate Tech",
    country: "Spanien",
    city: "Valencia",
    foundedYear: 2022,
    teamSize: 17,
    stage: "SEED",
    fundingRaised: 4.4,
    pipelineStage: "DISCOVERED",
    radarQuadrant: "CLIMATE_ENERGY",
    radarRing: "TRIAL",
  },
  {
    name: "SynthBio Works",
    website: "https://synthbio.example.com",
    description:
      "Enzym-Design-Plattform für biologisch abbaubare Alternativen zu industriellen Schmierstoffen.",
    industry: "Health Tech",
    country: "Schweiz",
    city: "Basel",
    foundedYear: 2023,
    teamSize: 21,
    stage: "SERIES_A",
    fundingRaised: 15,
    pipelineStage: "DISCOVERED",
    radarQuadrant: "HEALTH_BIO",
    radarRing: "HOLD",
  },
  {
    name: "EdgeMind",
    website: "https://edgemind.example.com",
    description:
      "TinyML-Compiler, der Vision-Modelle 40-fach verkleinert, damit sie auf bestehenden Fabrikkameras laufen.",
    industry: "Künstliche Intelligenz",
    country: "Schweden",
    city: "Stockholm",
    foundedYear: 2024,
    teamSize: 8,
    stage: "PRE_SEED",
    fundingRaised: 0.9,
    pipelineStage: "SCREENING",
    radarQuadrant: "AI_DATA",
    radarRing: "TRIAL",
    published: true,
    tagline: "Vision-KI auf jeder Fabrikkamera.",
    publicPitch:
      "EdgeMind komprimiert Vision-Modelle um das 40-Fache, sodass sie direkt auf vorhandenen Fabrikkameras laufen — ohne neue Hardware. 99,1 % Erkennung auf dem öffentlichen WeldNet-Benchmark.",
    lookingFor: ["Funding", "Talent"],
    seekingFunding: true,
    seekingAmount: 2.5,
  },
];

async function main() {
  console.log("Datenbank wird geseedet…");

  // Wipe in dependency order (idempotent re-seeds).
  await prisma.introRequest.deleteMany();
  await prisma.startupUpdate.deleteMany();
  await prisma.startupFollow.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.sharedScoring.deleteMany();
  await prisma.poCPerformance.deleteMany();
  await prisma.challengeApplication.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.score.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.startup.deleteMany();
  await prisma.scoutingCampaign.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Users -----------------------------------------------------------
  const [admin, member, partner, investor, startupUser, member2, partner2] =
    await Promise.all([
      prisma.user.create({
        data: {
          id: "usr_admin",
          email: "admin@lovedis.dev",
          name: "Alex Admin",
          role: "ADMIN",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_member",
          email: "member@lovedis.dev",
          name: "Mia Member",
          role: "MEMBER",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_partner",
          email: "partner@lovedis.dev",
          name: "Paul Partner",
          role: "BUSINESS_PARTNER",
          company: "Rheinwerk Industries AG",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_investor",
          email: "investor@lovedis.dev",
          name: "Ines Investor",
          role: "INVESTOR",
          company: "Northlight Ventures",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_startup",
          email: "startup@lovedis.dev",
          name: "Selin Startup",
          role: "STARTUP",
          company: "NeuralForge",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_member2",
          email: "jonas@lovedis.dev",
          name: "Jonas Scout",
          role: "MEMBER",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: "usr_partner2",
          email: "petra@helioswerk.dev",
          name: "Petra Helios",
          role: "BUSINESS_PARTNER",
          company: "Helioswerk GmbH",
          passwordHash,
        },
      }),
    ]);

  // --- Campaigns ---------------------------------------------------------
  const campaign = await prisma.scoutingCampaign.create({
    data: {
      name: "Industrial AI 2026",
      description:
        "Scouting-Sprint für KI-Startups, die industrielle Abläufe verbessern.",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-09-30"),
    },
  });
  const campaign2 = await prisma.scoutingCampaign.create({
    data: {
      name: "Green Factory",
      description: "Technologien für Dekarbonisierung und Energieeffizienz.",
      startDate: new Date("2026-03-01"),
    },
  });

  // --- Startups ------------------------------------------------------------
  const startupRecords: Awaited<ReturnType<typeof prisma.startup.create>>[] = [];
  for (const [i, s] of STARTUPS.entries()) {
    const record = await prisma.startup.create({
      data: {
        name: s.name,
        website: s.website,
        description: s.description,
        industry: s.industry,
        country: s.country,
        city: s.city,
        foundedYear: s.foundedYear,
        teamSize: s.teamSize,
        stage: s.stage,
        fundingRaised: s.fundingRaised,
        pipelineStage: s.pipelineStage,
        radarQuadrant: s.radarQuadrant,
        radarRing: s.radarRing,
        tagline: s.tagline ?? null,
        publicPitch: s.publicPitch ?? null,
        lookingFor: s.lookingFor ?? [],
        seekingFunding: s.seekingFunding ?? false,
        seekingAmount: s.seekingAmount ?? null,
        isPublished: s.published ?? false,
        publishedAt: s.published ? new Date() : null,
        campaignId: i % 3 === 0 ? campaign.id : i % 3 === 1 ? campaign2.id : null,
        ownerUserId: s.name === "NeuralForge" ? startupUser.id : null,
      },
    });
    startupRecords.push(record);

    await prisma.contact.create({
      data: {
        startupId: record.id,
        name: `Founder von ${s.name}`,
        position: "CEO & Co-Founder",
        email: `founder@${s.name.toLowerCase().replace(/\s+/g, "")}.example.com`,
        phone: "+49 30 1234 5678",
        notes: "Erstes Gespräch geführt — offen für ein Pilotprojekt.",
      },
    });
    await prisma.attachment.create({
      data: {
        startupId: record.id,
        name: "Pitch-Deck",
        url: `https://example.com/decks/${record.id}.pdf`,
        type: "DECK",
      },
    });
  }

  // --- Evaluations -----------------------------------------------------------
  const evaluations = [];
  for (const [i, s] of STARTUPS.entries()) {
    if (!s.scores) continue;
    const scores = s.scores as DimensionScores;
    const overallScore = computeOverallScore(scores);
    const potential = computePotential(scores);
    const feasibility = computeFeasibility(scores);
    const evaluation = await prisma.evaluation.create({
      data: {
        startupId: startupRecords[i].id,
        evaluatorId: i % 2 === 0 ? member.id : member2.id,
        overallScore,
        potential,
        feasibility,
        recommendation: deriveRecommendation(overallScore),
        notes:
          overallScore >= 3.5
            ? "Starker Kandidat — klarer strategischer Fit und glaubwürdige Umsetzung. Empfehlung: ins Pilotgespräch gehen."
            : "Interessante Technologie, aber offene Fragen zu Traktion und Geschäftsmodell. Nächstes Quartal erneut prüfen.",
        scores: {
          create: SCORE_DIMENSIONS.map((dimension) => ({
            dimension,
            value: scores[dimension] ?? 0,
          })),
        },
      },
    });
    evaluations.push({ evaluation, startup: startupRecords[i] });
  }

  // Second opinion on the two leaders (admin as evaluator).
  for (const name of ["NeuralForge", "Voltaic Grid"]) {
    const idx = STARTUPS.findIndex((s) => s.name === name);
    const base = STARTUPS[idx].scores!;
    const tweaked: DimensionScores = Object.fromEntries(
      SCORE_DIMENSIONS.map((d) => [
        d,
        Math.max(0, Math.min(5, (base[d] ?? 0) - (d === "TRACTION" ? 1 : 0))),
      ])
    );
    const overallScore = computeOverallScore(tweaked);
    await prisma.evaluation.create({
      data: {
        startupId: startupRecords[idx].id,
        evaluatorId: admin.id,
        overallScore,
        potential: computePotential(tweaked),
        feasibility: computeFeasibility(tweaked),
        recommendation: deriveRecommendation(overallScore),
        notes: "Zweitmeinung — etwas konservativer bei der Traktion.",
        scores: {
          create: SCORE_DIMENSIONS.map((dimension) => ({
            dimension,
            value: tweaked[dimension] ?? 0,
          })),
        },
      },
    });
  }

  // --- Challenges -----------------------------------------------------------
  const challenge1 = await prisma.challenge.create({
    data: {
      title: "Predictive Maintenance für Stanzlinien",
      description:
        "Unser Presswerk verliert jährlich ca. 140 Produktionsstunden durch ungeplante Stillstände an Stanzlinien. Wir suchen eine sensor- oder datenbasierte Lösung, die Ausfälle mindestens 48 Stunden im Voraus vorhersagt und sich in unsere bestehende Siemens-SPS-Landschaft integriert.\n\nEin erfolgreicher PoC läuft 12 Wochen auf zwei Linien in unserem Kölner Werk.",
      status: "OPEN",
      deadline: new Date("2026-08-31"),
      tags: ["Industrie 4.0", "Predictive Maintenance", "IoT"],
      createdById: partner.id,
    },
  });
  const challenge2 = await prisma.challenge.create({
    data: {
      title: "Energieflexibilität für Lastspitzen in der Fabrik",
      description:
        "Wir zahlen jedes Jahr sechsstellige Lastspitzen-Entgelte. Wir wollen Software pilotieren, die unkritische Lasten verschiebt und unseren 2-MWh-Batteriespeicher gegen Day-Ahead-Preise orchestriert — ohne produktionskritische Anlagen anzufassen.",
      status: "OPEN",
      deadline: new Date("2026-09-30"),
      tags: ["Energie", "Klima"],
      createdById: partner2.id,
    },
  });
  const challenge3 = await prisma.challenge.create({
    data: {
      title: "Automatisierte Sichtprüfung von Schweißnähten",
      description:
        "Die manuelle Prüfung von Schweißnähten ist langsam und inkonsistent. Wir suchen eine kamerabasierte Lösung mit >98 % Fehlererkennung auf unserem Referenzdatensatz, einsetzbar auf der Edge direkt neben den Schweißzellen.",
      status: "IN_REVIEW",
      deadline: new Date("2026-06-30"),
      tags: ["KI", "Qualität", "Computer Vision"],
      createdById: partner.id,
    },
  });
  await prisma.challenge.create({
    data: {
      title: "Kreislauffähige Verpackung für die Ersatzteillogistik",
      description:
        "Challenge-Entwurf — wir prüfen Mehrweg-Verpackungskonzepte für unser Ersatzteilnetzwerk über 14 europäische Lager hinweg. Umfang und Budget noch offen.",
      status: "DRAFT",
      tags: ["Logistik", "Nachhaltigkeit"],
      createdById: partner.id,
    },
  });

  // --- Applications & PoCs --------------------------------------------------
  const neuralForge = startupRecords[STARTUPS.findIndex((s) => s.name === "NeuralForge")];
  const factoryPulse = startupRecords[STARTUPS.findIndex((s) => s.name === "FactoryPulse")];
  const voltaic = startupRecords[STARTUPS.findIndex((s) => s.name === "Voltaic Grid")];
  const edgeMind = startupRecords[STARTUPS.findIndex((s) => s.name === "EdgeMind")];

  // Accepted → PoC running (FactoryPulse × challenge1, tracked by partner)
  const app1 = await prisma.challengeApplication.create({
    data: {
      challengeId: challenge1.id,
      startupId: factoryPulse.id,
      status: "ACCEPTED",
      pitch:
        "Unsere Akustiksensoren erkennen Lagerverschleiß und Werkzeugabnutzung 2–4 Wochen vor dem Ausfall. Wir laufen bereits auf über 600 Maschinen, integrieren Siemens-S7-SPS out of the box und sind innerhalb von 10 Tagen auf euren zwei Stanzlinien live.",
    },
  });
  await prisma.poCPerformance.create({
    data: {
      applicationId: app1.id,
      title: "PoC — FactoryPulse × Predictive Maintenance für Stanzlinien",
      status: "RUNNING",
      trackedById: partner.id,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-07-01"),
      notes:
        "Sensoren auf Linie 3 und 7 installiert. Erste Anomalie in Woche 5 korrekt gemeldet.",
      kpis: [
        { name: "Vermiedene Stillstandsstunden", target: 40, current: 22, unit: "h" },
        { name: "Erkennungspräzision", target: 90, current: 86, unit: "%" },
        { name: "Instrumentierte Linien", target: 2, current: 2, unit: "Linien" },
      ],
      milestones: [
        { title: "Sensorinstallation abgeschlossen", dueDate: "2026-04-10", done: true },
        { title: "Baseline-Daten erhoben", dueDate: "2026-05-01", done: true },
        { title: "Erste validierte Vorhersage", dueDate: "2026-05-20", done: true },
        { title: "Zwischenreview mit Werksleitung", dueDate: "2026-06-05", done: false },
        { title: "Abschlussbericht & Rollout-Entscheidung", dueDate: "2026-07-01", done: false },
      ],
    },
  });

  // Accepted → PoC tracked by the investor (Voltaic × challenge2)
  const app2 = await prisma.challengeApplication.create({
    data: {
      challengeId: challenge2.id,
      startupId: voltaic.id,
      status: "ACCEPTED",
      pitch:
        "Wir orchestrieren bereits 80 MWh Industriespeicher in Deutschland. Unser Dispatcher verschiebt flexible Lasten gegen Day-Ahead- und Intraday-Preise — typische Lastspitzen-Ersparnis: 18–25 % im ersten Jahr.",
    },
  });
  await prisma.poCPerformance.create({
    data: {
      applicationId: app2.id,
      title: "PoC — Voltaic Grid × Energieflexibilität für Lastspitzen in der Fabrik",
      status: "PLANNED",
      trackedById: investor.id,
      startDate: new Date("2026-07-01"),
      notes: "Kick-off terminiert — Freigabe des Netzbetreibers steht aus.",
      kpis: [
        { name: "Lastspitzen-Reduktion", target: 20, current: 0, unit: "%" },
        { name: "Optimierte Batteriezyklen", target: 120, current: 0, unit: "Zyklen" },
      ],
      milestones: [
        { title: "Vertrag unterschrieben", dueDate: "2026-06-15", done: true },
        { title: "Messstellen-Integration", dueDate: "2026-07-15", done: false },
        { title: "Erste optimierte Woche", dueDate: "2026-08-01", done: false },
      ],
    },
  });

  // Pending applications
  await prisma.challengeApplication.create({
    data: {
      challengeId: challenge1.id,
      startupId: neuralForge.id,
      status: "PENDING",
      pitch:
        "Über Codegenerierung hinaus analysiert unser Copilot SPS-Alarmlogs und erkennt wiederkehrende Fehlermuster — wir würden den Instandhaltungs-Use-Case gern auf euren Stanzlinien validieren.",
    },
  });
  await prisma.challengeApplication.create({
    data: {
      challengeId: challenge3.id,
      startupId: edgeMind.id,
      status: "PENDING",
      pitch:
        "Unser TinyML-Compiler bringt ein 40-fach komprimiertes Schweißnaht-Inspektionsmodell direkt auf eure bestehenden GigE-Kameras — keine neue Hardware, 99,1 % Erkennung auf dem öffentlichen WeldNet-Benchmark.",
    },
  });
  // Rejected application
  await prisma.challengeApplication.create({
    data: {
      challengeId: challenge3.id,
      startupId: factoryPulse.id,
      status: "REJECTED",
      pitch:
        "Akustische Signaturen können die Sichtprüfung bei Schweißfehlern unter der Oberfläche ergänzen.",
    },
  });

  // --- Shared scorings --------------------------------------------------------
  const nfEval = evaluations.find((e) => e.startup.id === neuralForge.id);
  const vgEval = evaluations.find((e) => e.startup.id === voltaic.id);
  const fpEval = evaluations.find((e) => e.startup.id === factoryPulse.id);

  if (nfEval) {
    await prisma.sharedScoring.create({
      data: {
        evaluationId: nfEval.evaluation.id,
        recipientId: partner.id,
        sharedById: admin.id,
        message:
          "NeuralForge hat sich auch auf eure Stanzlinien-Challenge beworben — hier unser internes Scoring als Kontext.",
      },
    });
    await prisma.sharedScoring.create({
      data: {
        evaluationId: nfEval.evaluation.id,
        recipientId: investor.id,
        sharedById: admin.id,
        message: "Stärkster KI-Kandidat der aktuellen Kohorte.",
      },
    });
  }
  if (vgEval) {
    await prisma.sharedScoring.create({
      data: {
        evaluationId: vgEval.evaluation.id,
        recipientId: investor.id,
        sharedById: admin.id,
        message: "Passt zu eurer Energiewende-These — PoC startet im Juli.",
      },
    });
  }
  if (fpEval) {
    await prisma.sharedScoring.create({
      data: {
        evaluationId: fpEval.evaluation.id,
        recipientId: partner.id,
        sharedById: admin.id,
      },
    });
  }

  // --- Conversations & messages ---------------------------------------------
  type SeedUser = { id: string };
  type SeedMsg = { fromId: string; body: string; minutesAgo: number };

  async function seedConversation(
    a: SeedUser,
    b: SeedUser,
    msgs: SeedMsg[],
    opts?: { unreadFor?: string }
  ) {
    const convo = await prisma.conversation.create({
      data: { participants: { create: [{ userId: a.id }, { userId: b.id }] } },
    });
    let lastAt = convo.createdAt;
    for (const m of msgs) {
      const createdAt = new Date(Date.now() - m.minutesAgo * 60_000);
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: m.fromId,
          body: m.body,
          createdAt,
        },
      });
      if (createdAt > lastAt) lastAt = createdAt;
    }
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: lastAt },
    });
    for (const p of [a, b]) {
      let readAt = lastAt;
      if (opts?.unreadFor === p.id) {
        const mine = msgs.filter((m) => m.fromId === p.id);
        const lastMineMinutes = mine.length
          ? Math.min(...mine.map((m) => m.minutesAgo))
          : 24 * 60;
        readAt = new Date(Date.now() - lastMineMinutes * 60_000);
      }
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: convo.id, userId: p.id } },
        data: { lastReadAt: readAt },
      });
    }
  }

  // Mia (Member) ↔ Selin (Startup / NeuralForge) — 2 unread for Mia
  await seedConversation(
    member,
    startupUser,
    [
      {
        fromId: startupUser.id,
        body: "Hallo Mia! Anbei unsere aktualisierte Demo. Wir freuen uns auf euer Feedback.",
        minutesAgo: 200,
      },
      {
        fromId: member.id,
        body: "Hi Selin! Sieht stark aus — das Team war beeindruckt von der Genauigkeit.",
        minutesAgo: 150,
      },
      {
        fromId: startupUser.id,
        body: "Super, danke! Können wir einen PoC-Termin für die Stanzlinien-Challenge einplanen?",
        minutesAgo: 40,
      },
      {
        fromId: startupUser.id,
        body: "Nächste Woche Dienstag oder Mittwoch würde bei uns passen.",
        minutesAgo: 18,
      },
    ],
    { unreadFor: member.id }
  );

  // Mia (Member) ↔ Paul (Business Partner) — all read
  await seedConversation(member, partner, [
    {
      fromId: partner.id,
      body: "Hi Mia, wir senden den PoC-Plan für FactoryPulse heute noch raus.",
      minutesAgo: 1500,
    },
    {
      fromId: member.id,
      body: "Perfekt, danke Paul! Ich leite ihn intern weiter.",
      minutesAgo: 1480,
    },
  ]);

  // Mia (Member) ↔ Ines (Investor)
  await seedConversation(member, investor, [
    {
      fromId: member.id,
      body: "Hi Ines, ich teile gleich das NeuralForge-Scoring mit dir.",
      minutesAgo: 5000,
    },
    { fromId: investor.id, body: "Top, danke dir!", minutesAgo: 4980 },
  ]);

  // Mia (Member) ↔ Jonas (Member) — internal, 1 unread for Mia
  await seedConversation(
    member,
    member2,
    [
      {
        fromId: member2.id,
        body: "Schaust du dir EdgeMind heute noch an?",
        minutesAgo: 300,
      },
      {
        fromId: member.id,
        body: "Ja, mache ich direkt nach dem Standup.",
        minutesAgo: 280,
      },
      {
        fromId: member2.id,
        body: "Klasse — danke! 🙌",
        minutesAgo: 25,
      },
    ],
    { unreadFor: member.id }
  );

  // Alex (Admin) ↔ Ines (Investor)
  await seedConversation(admin, investor, [
    {
      fromId: investor.id,
      body: "Können wir den Termin zu Voltaic Grid verschieben?",
      minutesAgo: 2900,
    },
    {
      fromId: admin.id,
      body: "Klar, ich schlage dir gleich neue Slots vor.",
      minutesAgo: 2880,
    },
  ]);

  // Jonas (Member) ↔ Petra (Business Partner)
  await seedConversation(member2, partner2, [
    {
      fromId: partner2.id,
      body: "Die Slides zur Energie-Challenge sind angehängt.",
      minutesAgo: 8000,
    },
  ]);

  // --- Ecosystem: follows, updates & intro requests ------------------------
  const byName = (name: string) =>
    startupRecords[STARTUPS.findIndex((s) => s.name === name)];
  const carbonLoom = byName("CarbonLoom");
  const mediGraph = byName("MediGraph");

  // Investor follows a slice of the published universe.
  for (const s of [neuralForge, voltaic, carbonLoom, factoryPulse]) {
    await prisma.startupFollow.create({
      data: { userId: investor.id, startupId: s.id },
    });
  }

  // Updates that populate the following feed. Owner posts where available,
  // otherwise the Lovedis team posts on the startup's behalf.
  const updateSeeds: {
    startupId: string;
    authorId: string;
    title: string;
    body: string;
    category: "MILESTONE" | "FUNDING" | "PRODUCT" | "TEAM" | "PRESS" | "GENERAL";
    minutesAgo: number;
  }[] = [
    {
      startupId: neuralForge.id,
      authorId: startupUser.id,
      title: "Series-A-Runde über 18 Mio. € geschlossen",
      body: "Wir freuen uns, unsere Series A unter Führung von Northlight Ventures bekanntzugeben. Das frische Kapital fließt in den Ausbau unseres Verifikations-Stacks und in die Expansion nach Frankreich.",
      category: "FUNDING",
      minutesAgo: 60 * 5,
    },
    {
      startupId: neuralForge.id,
      authorId: startupUser.id,
      title: "Pilot mit Rheinwerk Industries gestartet",
      body: "Unser Copilot läuft jetzt produktiv auf zwei Stanzlinien — erste verifizierte SPS-Programme wurden bereits ausgerollt.",
      category: "MILESTONE",
      minutesAgo: 60 * 48,
    },
    {
      startupId: voltaic.id,
      authorId: member.id,
      title: "100 MWh unter Management überschritten",
      body: "Mit dem jüngsten Industriespeicher-Verbund managen wir nun über 100 MWh flexibler Kapazität auf deutschen Regelenergiemärkten.",
      category: "MILESTONE",
      minutesAgo: 60 * 20,
    },
    {
      startupId: carbonLoom.id,
      authorId: member.id,
      title: "Zweites Pilotgebäude in Amsterdam bestätigt",
      body: "Nach Rotterdam rüsten wir ein weiteres Gewerbegebäude mit unseren Direct-Air-Capture-Modulen aus.",
      category: "PRODUCT",
      minutesAgo: 60 * 12,
    },
    {
      startupId: factoryPulse.id,
      authorId: member.id,
      title: "Neue Akustik-Firmware mit 12 % höherer Präzision",
      body: "Unser jüngstes Firmware-Update verbessert die Anomalie-Erkennung deutlich — bereits auf allen Pilotmaschinen aktiv.",
      category: "PRODUCT",
      minutesAgo: 60 * 3,
    },
  ];
  for (const u of updateSeeds) {
    await prisma.startupUpdate.create({
      data: {
        startupId: u.startupId,
        authorId: u.authorId,
        title: u.title,
        body: u.body,
        category: u.category,
        createdAt: new Date(Date.now() - u.minutesAgo * 60_000),
      },
    });
  }

  // A pending intro request for the team broker inbox.
  await prisma.introRequest.create({
    data: {
      investorId: investor.id,
      startupId: carbonLoom.id,
      message:
        "Climate Tech passt genau in unsere These — wir würden CarbonLoom gern für ein Erstgespräch kennenlernen.",
      status: "PENDING",
    },
  });
  // An already-brokered intro (for context on the investor side).
  await prisma.introRequest.create({
    data: {
      investorId: investor.id,
      startupId: mediGraph.id,
      message: "Spannender Knowledge-Graph-Ansatz — bitte um eine Einführung.",
      status: "APPROVED",
      handledById: admin.id,
    },
  });

  console.log("Seed abgeschlossen.");
  console.log("\nDemo-Konten (Passwort: %s)", PASSWORD);
  console.log("  ADMIN             admin@lovedis.dev");
  console.log("  MEMBER            member@lovedis.dev");
  console.log("  BUSINESS_PARTNER  partner@lovedis.dev");
  console.log("  INVESTOR          investor@lovedis.dev");
  console.log("  STARTUP           startup@lovedis.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
