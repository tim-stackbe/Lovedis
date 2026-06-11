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
}

const STARTUPS: StartupSeed[] = [
  {
    name: "NeuralForge",
    website: "https://neuralforge.example.com",
    description:
      "Foundation-model copilot that writes and verifies PLC code for industrial automation engineers.",
    industry: "Artificial Intelligence",
    country: "Germany",
    city: "Munich",
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
  },
  {
    name: "Voltaic Grid",
    website: "https://voltaicgrid.example.com",
    description:
      "Virtual power plant software that aggregates industrial battery storage for grid balancing markets.",
    industry: "Energy",
    country: "Germany",
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
  },
  {
    name: "CarbonLoom",
    website: "https://carbonloom.example.com",
    description:
      "Direct-air-capture modules that retrofit onto existing HVAC systems of commercial buildings.",
    industry: "Climate Tech",
    country: "Netherlands",
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
  },
  {
    name: "MediGraph",
    website: "https://medigraph.example.com",
    description:
      "Knowledge-graph platform that links clinical trial data with real-world evidence for pharma R&D.",
    industry: "Health Tech",
    country: "Germany",
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
  },
  {
    name: "HaptiCare",
    website: "https://hapticare.example.com",
    description:
      "Haptic feedback gloves for remote physiotherapy with motion-tracking outcome analytics.",
    industry: "Health Tech",
    country: "Austria",
    city: "Vienna",
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
  },
  {
    name: "FactoryPulse",
    website: "https://factorypulse.example.com",
    description:
      "Self-calibrating acoustic sensors that detect machine anomalies weeks before failure.",
    industry: "Industrial IoT",
    country: "Germany",
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
  },
  {
    name: "RoboHive",
    website: "https://robohive.example.com",
    description:
      "Swarm-coordination software for mixed fleets of warehouse robots from different vendors.",
    industry: "Robotics",
    country: "Denmark",
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
      "Post-quantum cryptography toolkit that migrates legacy industrial protocols without downtime.",
    industry: "Cybersecurity",
    country: "France",
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
      "AI dispatcher that consolidates LTL freight across carriers and cuts empty miles by 30%.",
    industry: "Logistics",
    country: "Germany",
    city: "Cologne",
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
      "Hyperspectral drone imaging plus agronomy models that cut fertilizer use for row crops.",
    industry: "Climate Tech",
    country: "Spain",
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
      "Enzyme-design platform producing biodegradable alternatives to industrial lubricants.",
    industry: "Health Tech",
    country: "Switzerland",
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
      "TinyML compiler that shrinks vision models 40x to run on existing factory cameras.",
    industry: "Artificial Intelligence",
    country: "Sweden",
    city: "Stockholm",
    foundedYear: 2024,
    teamSize: 8,
    stage: "PRE_SEED",
    fundingRaised: 0.9,
    pipelineStage: "SCREENING",
    radarQuadrant: "AI_DATA",
    radarRing: "TRIAL",
  },
];

async function main() {
  console.log("Seeding database…");

  // Wipe in dependency order (idempotent re-seeds).
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
          email: "admin@lovedis.dev",
          name: "Alex Admin",
          role: "ADMIN",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: "member@lovedis.dev",
          name: "Mia Member",
          role: "MEMBER",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: "partner@lovedis.dev",
          name: "Paul Partner",
          role: "BUSINESS_PARTNER",
          company: "Rheinwerk Industries AG",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: "investor@lovedis.dev",
          name: "Ines Investor",
          role: "INVESTOR",
          company: "Northlight Ventures",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: "startup@lovedis.dev",
          name: "Selin Startup",
          role: "STARTUP",
          company: "NeuralForge",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: "jonas@lovedis.dev",
          name: "Jonas Scout",
          role: "MEMBER",
          company: "Lovedis",
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
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
        "Scouting sprint for AI startups that improve industrial operations.",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-09-30"),
    },
  });
  const campaign2 = await prisma.scoutingCampaign.create({
    data: {
      name: "Green Factory",
      description: "Decarbonization and energy-efficiency technologies.",
      startDate: new Date("2026-03-01"),
    },
  });

  // --- Startups ------------------------------------------------------------
  const startupRecords = [];
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
        campaignId: i % 3 === 0 ? campaign.id : i % 3 === 1 ? campaign2.id : null,
        ownerUserId: s.name === "NeuralForge" ? startupUser.id : null,
      },
    });
    startupRecords.push(record);

    await prisma.contact.create({
      data: {
        startupId: record.id,
        name: `Founder of ${s.name}`,
        position: "CEO & Co-Founder",
        email: `founder@${s.name.toLowerCase().replace(/\s+/g, "")}.example.com`,
        phone: "+49 30 1234 5678",
        notes: "First call done — open to a pilot conversation.",
      },
    });
    await prisma.attachment.create({
      data: {
        startupId: record.id,
        name: "Pitch deck",
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
            ? "Strong candidate — clear strategic fit and credible execution. Recommend moving forward to a pilot conversation."
            : "Interesting technology but open questions on traction and business model. Revisit next quarter.",
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
        notes: "Second opinion — slightly more conservative on traction.",
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
      title: "Predictive maintenance for stamping lines",
      description:
        "Our press shop loses ~140 production hours per year to unplanned downtime on stamping lines. We are looking for a sensor- or data-driven solution that predicts failures at least 48 hours in advance and integrates with our existing Siemens PLC landscape.\n\nA successful PoC runs on two lines in our Cologne plant for 12 weeks.",
      status: "OPEN",
      deadline: new Date("2026-08-31"),
      tags: ["Industry 4.0", "Predictive Maintenance", "IoT"],
      createdById: partner.id,
    },
  });
  const challenge2 = await prisma.challenge.create({
    data: {
      title: "Energy flexibility for factory load peaks",
      description:
        "We pay six-figure peak-load charges every year. We want to pilot software that shifts non-critical loads and orchestrates our 2 MWh battery storage against day-ahead prices, without touching production-critical equipment.",
      status: "OPEN",
      deadline: new Date("2026-09-30"),
      tags: ["Energy", "Climate"],
      createdById: partner2.id,
    },
  });
  const challenge3 = await prisma.challenge.create({
    data: {
      title: "Automated visual inspection for weld seams",
      description:
        "Manual inspection of weld seams is slow and inconsistent. We look for a camera-based solution reaching >98% defect detection on our reference dataset, deployable on the edge next to the welding cells.",
      status: "IN_REVIEW",
      deadline: new Date("2026-06-30"),
      tags: ["AI", "Quality", "Computer Vision"],
      createdById: partner.id,
    },
  });
  await prisma.challenge.create({
    data: {
      title: "Circular packaging for spare-parts logistics",
      description:
        "Draft challenge — we are exploring reusable packaging concepts for our spare-parts network across 14 European warehouses. Scope and budget to be defined.",
      status: "DRAFT",
      tags: ["Logistics", "Sustainability"],
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
        "Our acoustic sensors detect bearing wear and tool degradation 2–4 weeks before failure. We already run on 600+ machines, integrate with Siemens S7 PLCs out of the box and can be live on your two stamping lines within 10 days.",
    },
  });
  await prisma.poCPerformance.create({
    data: {
      applicationId: app1.id,
      title: "PoC — FactoryPulse × Predictive maintenance for stamping lines",
      status: "RUNNING",
      trackedById: partner.id,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-07-01"),
      notes:
        "Sensors installed on lines 3 and 7. First anomaly correctly flagged in week 5.",
      kpis: [
        { name: "Downtime hours avoided", target: 40, current: 22, unit: "h" },
        { name: "Detection precision", target: 90, current: 86, unit: "%" },
        { name: "Lines instrumented", target: 2, current: 2, unit: "lines" },
      ],
      milestones: [
        { title: "Sensor installation complete", dueDate: "2026-04-10", done: true },
        { title: "Baseline data collected", dueDate: "2026-05-01", done: true },
        { title: "First validated prediction", dueDate: "2026-05-20", done: true },
        { title: "Mid-term review with plant manager", dueDate: "2026-06-05", done: false },
        { title: "Final report & rollout decision", dueDate: "2026-07-01", done: false },
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
        "We already orchestrate 80 MWh of industrial storage in Germany. Our dispatcher shifts flexible loads against day-ahead and intraday prices — typical peak-charge savings: 18–25% in year one.",
    },
  });
  await prisma.poCPerformance.create({
    data: {
      applicationId: app2.id,
      title: "PoC — Voltaic Grid × Energy flexibility for factory load peaks",
      status: "PLANNED",
      trackedById: investor.id,
      startDate: new Date("2026-07-01"),
      notes: "Kick-off scheduled — awaiting grid operator approval.",
      kpis: [
        { name: "Peak load reduction", target: 20, current: 0, unit: "%" },
        { name: "Battery cycles optimized", target: 120, current: 0, unit: "cycles" },
      ],
      milestones: [
        { title: "Contract signed", dueDate: "2026-06-15", done: true },
        { title: "Metering integration", dueDate: "2026-07-15", done: false },
        { title: "First optimized week", dueDate: "2026-08-01", done: false },
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
        "Beyond code generation, our copilot analyzes PLC alarm logs to spot recurring fault patterns — we'd love to validate the maintenance use case on your stamping lines.",
    },
  });
  await prisma.challengeApplication.create({
    data: {
      challengeId: challenge3.id,
      startupId: edgeMind.id,
      status: "PENDING",
      pitch:
        "Our TinyML compiler runs a 40x-compressed weld-seam inspection model directly on your existing GigE cameras — no new hardware, 99.1% detection on the public WeldNet benchmark.",
    },
  });
  // Rejected application
  await prisma.challengeApplication.create({
    data: {
      challengeId: challenge3.id,
      startupId: factoryPulse.id,
      status: "REJECTED",
      pitch:
        "Acoustic signatures can complement visual inspection for sub-surface weld defects.",
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
          "NeuralForge also applied to your stamping-line challenge — here is our internal scoring for context.",
      },
    });
    await prisma.sharedScoring.create({
      data: {
        evaluationId: nfEval.evaluation.id,
        recipientId: investor.id,
        sharedById: admin.id,
        message: "Strongest AI candidate in the current cohort.",
      },
    });
  }
  if (vgEval) {
    await prisma.sharedScoring.create({
      data: {
        evaluationId: vgEval.evaluation.id,
        recipientId: investor.id,
        sharedById: admin.id,
        message: "Fits your energy-transition thesis — PoC starting in July.",
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

  console.log("Seed complete.");
  console.log("\nDemo accounts (password: %s)", PASSWORD);
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
