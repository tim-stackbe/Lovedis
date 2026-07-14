import { describe, expect, it } from "vitest";
import {
  cellHasData,
  cellPassesContentFilters,
  filterRows,
  isTopMatch,
  PARTNER_COMPANIES,
  parseContactStatus,
  parseRelevance,
  parseUseCaseTypes,
  type MatchCellView,
  type MatchRowView,
} from "@/lib/match-matrix";
import { parseMatchMatrixCsv } from "@/lib/match-matrix-import";

// ---------------------------------------------------------------------------
// Relevance mapping (Hoch/Mittel/Niedrig → enum)
// ---------------------------------------------------------------------------

describe("parseRelevance", () => {
  it("maps the German labels case-insensitively", () => {
    expect(parseRelevance("Hoch")).toBe("HIGH");
    expect(parseRelevance("hoch")).toBe("HIGH");
    expect(parseRelevance("Mittel")).toBe("MEDIUM");
    expect(parseRelevance("Niedrig")).toBe("LOW");
    expect(parseRelevance("  Hoch  ")).toBe("HIGH");
  });

  it("returns null for empty / unknown values", () => {
    expect(parseRelevance("")).toBeNull();
    expect(parseRelevance(null)).toBeNull();
    expect(parseRelevance(undefined)).toBeNull();
    expect(parseRelevance("keine Angabe")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Use-case parsing (free text → enum list)
// ---------------------------------------------------------------------------

describe("parseUseCaseTypes", () => {
  it("parses a single type", () => {
    expect(parseUseCaseTypes("Pilotprojekt -> Machbarkeitstool")).toEqual([
      "PILOT",
    ]);
    expect(parseUseCaseTypes("Sparring")).toEqual(["SPARRING"]);
  });

  it("parses combined comma/slash separated types in canonical order", () => {
    expect(
      parseUseCaseTypes("Pilotprojekt, Co-Development -> Beschaffung")
    ).toEqual(["PILOT", "CO_DEVELOPMENT"]);
    expect(
      parseUseCaseTypes(
        "Kundenbeziehung / White-label / Co-Development / Pilotprojket / Technologielizenz"
      )
    ).toEqual([
      "PILOT",
      "CO_DEVELOPMENT",
      "CUSTOMER_RELATION",
      "WHITE_LABEL",
      "TECH_LICENSE",
    ]);
  });

  it("tolerates the 'Pilotprojket' sheet typo", () => {
    expect(parseUseCaseTypes("Pilotprojket")).toEqual(["PILOT"]);
  });

  it("de-duplicates repeated matches", () => {
    expect(parseUseCaseTypes("Pilotprojekt und Pilot")).toEqual(["PILOT"]);
  });

  it("returns [] when no known type is present", () => {
    expect(parseUseCaseTypes("")).toEqual([]);
    expect(parseUseCaseTypes("Weiterentwicklung mit Furnier?")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Contact status derivation
// ---------------------------------------------------------------------------

describe("parseContactStatus", () => {
  it("detects an agreed pilot (strongest signal wins)", () => {
    expect(
      parseContactStatus(
        "schon in Kontakt - Pilotprojekt vereinbart; Testphase",
        ""
      )
    ).toBe("PILOT_AGREED");
  });

  it("detects follow-up (Folgetermin / Call / Termin)", () => {
    expect(parseContactStatus("Folgetermin um Rahmenbedingungen", "")).toBe(
      "FOLLOW_UP"
    );
    expect(parseContactStatus("Call aufsetzen mit Fachabteilung", "")).toBe(
      "FOLLOW_UP"
    );
    expect(parseContactStatus("Termin bereits ausgemacht", "")).toBe("FOLLOW_UP");
  });

  it("detects in-contact", () => {
    expect(parseContactStatus("Bereits in Kontakt, im Loop behalten", "")).toBe(
      "IN_CONTACT"
    );
  });

  it("returns NONE for neutral / empty text", () => {
    expect(parseContactStatus("Intro herstellen", "")).toBe("NONE");
    expect(parseContactStatus("", "")).toBe("NONE");
    expect(parseContactStatus(null, undefined)).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// Top-Match derivation
// ---------------------------------------------------------------------------

describe("isTopMatch", () => {
  it("is true only when both sides are HIGH", () => {
    expect(isTopMatch("HIGH", "HIGH")).toBe(true);
    expect(isTopMatch("HIGH", "MEDIUM")).toBe(false);
    expect(isTopMatch("MEDIUM", "HIGH")).toBe(false);
    expect(isTopMatch("LOW", "LOW")).toBe(false);
    expect(isTopMatch("HIGH", null)).toBe(false);
    expect(isTopMatch(null, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function cell(
  partnerSlug: string,
  overrides: Partial<MatchCellView> = {}
): MatchCellView {
  return {
    id: `${partnerSlug}-x`,
    partnerSlug,
    startupRelevance: null,
    partnerRelevance: null,
    useCaseTypes: [],
    useCaseNote: null,
    nextSteps: null,
    contactStatus: "NONE",
    ...overrides,
  };
}

describe("cellHasData", () => {
  it("is false for null / fully empty cells", () => {
    expect(cellHasData(null)).toBe(false);
    expect(cellHasData(cell("lupp"))).toBe(false);
  });
  it("is true when any field carries content", () => {
    expect(cellHasData(cell("lupp", { startupRelevance: "LOW" }))).toBe(true);
    expect(cellHasData(cell("lupp", { useCaseTypes: ["PILOT"] }))).toBe(true);
    expect(cellHasData(cell("lupp", { contactStatus: "IN_CONTACT" }))).toBe(true);
  });
});

describe("cellPassesContentFilters", () => {
  const top = cell("fingerhaus", {
    startupRelevance: "HIGH",
    partnerRelevance: "HIGH",
    useCaseTypes: ["PILOT"],
  });
  it("filters by use-case", () => {
    expect(cellPassesContentFilters(top, { useCase: "PILOT", onlyTopMatch: false })).toBe(true);
    expect(cellPassesContentFilters(top, { useCase: "SPARRING", onlyTopMatch: false })).toBe(false);
  });
  it("filters by top-match", () => {
    expect(cellPassesContentFilters(top, { useCase: null, onlyTopMatch: true })).toBe(true);
    const medium = cell("fingerhaus", {
      startupRelevance: "MEDIUM",
      partnerRelevance: "HIGH",
    });
    expect(cellPassesContentFilters(medium, { useCase: null, onlyTopMatch: true })).toBe(false);
  });
});

describe("filterRows", () => {
  const rows: MatchRowView[] = [
    {
      startupId: "s1",
      startupName: "Alpha",
      cells: [
        cell("fingerhaus", {
          startupRelevance: "HIGH",
          partnerRelevance: "HIGH",
          useCaseTypes: ["PILOT"],
        }),
        cell("lupp", { startupRelevance: "MEDIUM", useCaseTypes: ["SPARRING"] }),
      ],
    },
    {
      startupId: "s2",
      startupName: "Beta",
      cells: [
        cell("fingerhaus", { startupRelevance: "LOW", useCaseTypes: ["SPARRING"] }),
        null,
      ],
    },
  ];

  it("returns all rows with no filters", () => {
    expect(
      filterRows(rows, { partnerSlug: null, useCase: null, onlyTopMatch: false })
    ).toHaveLength(2);
  });

  it("keeps only rows with a top-match cell", () => {
    const result = filterRows(rows, {
      partnerSlug: null,
      useCase: null,
      onlyTopMatch: true,
    });
    expect(result.map((r) => r.startupName)).toEqual(["Alpha"]);
  });

  it("keeps only rows matching a use-case", () => {
    const pilot = filterRows(rows, {
      partnerSlug: null,
      useCase: "PILOT",
      onlyTopMatch: false,
    });
    expect(pilot.map((r) => r.startupName)).toEqual(["Alpha"]);
  });

  it("restricts to a partner column (empty cells drop the row)", () => {
    const lupp = filterRows(rows, {
      partnerSlug: "lupp",
      useCase: null,
      onlyTopMatch: false,
    });
    // Only Alpha has data in the Lupp column.
    expect(lupp.map((r) => r.startupName)).toEqual(["Alpha"]);
  });
});

// ---------------------------------------------------------------------------
// CSV import parsing (against the real bundled sheet)
// ---------------------------------------------------------------------------

describe("parseMatchMatrixCsv (bundled sheet)", () => {
  const { rows, skipped } = parseMatchMatrixCsv();

  it("skips startups with no data in any column", () => {
    expect(skipped).toContain("Scho & Müller");
    expect(skipped).toContain("FOLIVORA SOLUTIONS");
  });

  it("parses the 12 startups that carry data", () => {
    expect(rows).toHaveLength(12);
    expect(rows.map((r) => r.startupName)).toContain("NEOBIM");
  });

  it("uses the five partner slugs and never more per row", () => {
    const slugs = new Set<string>(PARTNER_COMPANIES.map((p) => p.slug));
    for (const row of rows) {
      expect(row.cells.length).toBeGreaterThan(0);
      expect(row.cells.length).toBeLessThanOrEqual(PARTNER_COMPANIES.length);
      for (const c of row.cells) {
        expect(slugs.has(c.partnerSlug)).toBe(true);
      }
    }
  });

  it("maps NEOBIM correctly (top-matches, pilot, agreed pilot at Weimer)", () => {
    const neobim = rows.find((r) => r.startupName === "NEOBIM");
    expect(neobim).toBeDefined();
    const fingerhaus = neobim!.cells.find((c) => c.partnerSlug === "fingerhaus");
    expect(fingerhaus?.startupRelevance).toBe("HIGH");
    expect(fingerhaus?.partnerRelevance).toBe("HIGH");
    expect(fingerhaus?.useCaseTypes).toEqual(["PILOT"]);

    const weimer = neobim!.cells.find((c) => c.partnerSlug === "weimer");
    expect(weimer?.contactStatus).toBe("PILOT_AGREED");
  });

  it("parses parallelum's combined Weimer use-case list", () => {
    const parallelum = rows.find((r) => r.startupName === "parallelum");
    const weimer = parallelum!.cells.find((c) => c.partnerSlug === "weimer");
    expect(weimer?.useCaseTypes).toEqual([
      "PILOT",
      "CO_DEVELOPMENT",
      "CUSTOMER_RELATION",
      "WHITE_LABEL",
      "TECH_LICENSE",
    ]);
  });
});
