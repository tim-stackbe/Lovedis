import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_NAV, VENTURE_STORE_EDITOR_HREF } from "@/lib/roles";
import {
  offeringEditorSchema,
  offeringFormInput,
  programEditorSchema,
  programFormInput,
  reorderSortOrders,
  workshopToFormRow,
  workshopsFromForm,
} from "@/lib/venture-store-editor";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const OFFERING_BASE = {
  title: "Pitch Deck Review",
  category: "FUNDRAISING",
  summary: "1:1-Review deines Pitch Decks.",
  description: "Absatz eins.\r\n\r\nAbsatz zwei.",
  format: "",
  providerCompany: "LOVEDIS",
  contactPerson: " Polina Ko ",
  website: "",
  sessionDate: "",
  creditCost: "1",
};

describe("offering editor validation", () => {
  it("keeps paragraphs, maps empty optionals to null and reads the checkbox", () => {
    const parsed = offeringEditorSchema.parse(
      offeringFormInput(form({ ...OFFERING_BASE, isActive: "on" }))
    );
    expect(parsed.description).toBe("Absatz eins.\n\nAbsatz zwei.");
    expect(parsed.format).toBeNull();
    expect(parsed.website).toBeNull();
    expect(parsed.contactPerson).toBe("Polina Ko");
    expect(parsed.creditCost).toBe(1);
    expect(parsed.isActive).toBe(true);

    const hidden = offeringEditorSchema.parse(offeringFormInput(form(OFFERING_BASE)));
    expect(hidden.isActive).toBe(false);
  });

  it("rejects negative or fractional credits, bad categories and bad URLs", () => {
    for (const creditCost of ["-1", "1.5", "abc"]) {
      expect(
        offeringEditorSchema.safeParse(offeringFormInput(form({ ...OFFERING_BASE, creditCost })))
          .success
      ).toBe(false);
    }
    expect(
      offeringEditorSchema.safeParse(
        offeringFormInput(form({ ...OFFERING_BASE, category: "NOPE" }))
      ).success
    ).toBe(false);
    const badUrl = offeringEditorSchema.safeParse(
      offeringFormInput(form({ ...OFFERING_BASE, website: "gal-digital.de" }))
    );
    expect(badUrl.success).toBe(false);
    expect(badUrl.error?.issues[0]?.message).toContain("http");
  });
});

describe("program workshops form mapping", () => {
  it("maps rows to workshop JSON, drops empty fields and syncs sessions", () => {
    const result = workshopsFromForm(
      JSON.stringify([
        {
          title: " Pricing ",
          date: "2026-11-12",
          startTime: "11:00",
          format: "ONLINE",
          location: "",
          locationUrl: "https://teams.microsoft.com/x",
          description: "### Inhalt\r\n\r\n**Fett** und normal",
        },
        { title: "", date: "", startTime: "", format: "", location: "", locationUrl: "", description: "" },
        { title: "Growth", date: "", startTime: "", format: "ON_SITE", location: "Berlin", locationUrl: "", description: "" },
      ])
    );
    expect(result).toEqual({
      ok: true,
      workshops: [
        {
          title: "Pricing",
          date: "2026-11-12",
          startTime: "11:00",
          format: "ONLINE",
          locationUrl: "https://teams.microsoft.com/x",
          description: "### Inhalt\n\n**Fett** und normal",
        },
        { title: "Growth", format: "ON_SITE", location: "Berlin" },
      ],
      sessions: ["Pricing", "Growth"],
    });
  });

  it("round-trips stored workshops through the form rows", () => {
    const stored = [{ title: "A", date: "2026-12-01", format: "ONLINE" as const }];
    const result = workshopsFromForm(JSON.stringify(stored.map(workshopToFormRow)));
    expect(result).toEqual({ ok: true, workshops: stored, sessions: ["A"] });
  });

  it("reports German errors for missing titles and invalid fields", () => {
    expect(workshopsFromForm(JSON.stringify([{ date: "2026-11-12" }]))).toEqual({
      ok: false,
      error: "Workshop 1: Titel fehlt.",
    });
    expect(
      workshopsFromForm(JSON.stringify([{ title: "A", locationUrl: "kein link" }]))
    ).toEqual({ ok: false, error: "Workshop 1: Location-Link muss eine gültige URL sein." });
    expect(workshopsFromForm(JSON.stringify([{ title: "A", startTime: "11 Uhr" }]))).toEqual({
      ok: false,
      error: "Workshop 1: Uhrzeit ist ungültig (HH:MM).",
    });
    expect(workshopsFromForm("{kaputt").ok).toBe(false);
    expect(workshopsFromForm("")).toEqual({ ok: true, workshops: [], sessions: [] });
  });
});

describe("program editor validation", () => {
  it("parses tags, status, coming soon and fix credits", () => {
    const parsed = programEditorSchema.parse(
      programFormInput(
        form({
          title: "Sales, Pricing & Growth",
          summary: "Programm für Sales.",
          description: "Beschreibung mit genug Text.",
          focusTags: "Sales, , Pricing ,Growth",
          status: "OPEN",
          contactPerson: "",
          sessionDate: "",
          format: "4 Wochen",
          comingSoon: "on",
          fixCreditCost: "6",
        })
      )
    );
    expect(parsed.focusTags).toEqual(["Sales", "Pricing", "Growth"]);
    expect(parsed.status).toBe("OPEN");
    expect(parsed.comingSoon).toBe(true);
    expect(parsed.fixCreditCost).toBe(6);
    expect(parsed.contactPerson).toBeNull();
  });
});

describe("reorderSortOrders", () => {
  const items = [
    { id: "a", sortOrder: 31 },
    { id: "b", sortOrder: 32 },
    { id: "c", sortOrder: 34 },
  ];

  it("swaps neighbours and reuses the group's existing values", () => {
    expect(reorderSortOrders(items, "c", "up")).toEqual([
      { id: "c", sortOrder: 32 },
      { id: "b", sortOrder: 34 },
    ]);
  });

  it("is a no-op at the edges or for unknown ids", () => {
    expect(reorderSortOrders(items, "a", "up")).toEqual([]);
    expect(reorderSortOrders(items, "c", "down")).toEqual([]);
    expect(reorderSortOrders(items, "x", "up")).toEqual([]);
  });

  it("spreads duplicate sortOrders so the new order is unambiguous", () => {
    const dupes = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 0 },
      { id: "c", sortOrder: 0 },
    ];
    expect(reorderSortOrders(dupes, "a", "down")).toEqual([
      { id: "a", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ]);
  });
});

describe("Venture Store editor is ADMIN-gated server-side", () => {
  const root = process.cwd();
  const read = (p: string) => readFileSync(path.join(root, p), "utf8");

  /** Exported async functions whose body does not start with requireAdmin(). */
  function ungatedActions(source: string, names?: string[]): string[] {
    const fns = [...source.matchAll(/export async function (\w+)\([^]*?\{\n([^]*?)\n}/g)];
    return fns
      .filter(([, name]) => !names || names.includes(name))
      .filter(([, , body]) => !/^\s*(const session = )?await requireAdmin\(\);/.test(body))
      .map(([, name]) => name);
  }

  it("guards every editor server action", () => {
    const source = read("src/app/actions/venture-store-editor.ts");
    expect(source.match(/export async function/g)?.length).toBeGreaterThanOrEqual(7);
    expect(ungatedActions(source)).toEqual([]);
  });

  it("guards the mentor catalog actions", () => {
    const source = read("src/app/actions/marketplace.ts");
    const names = ["createMentor", "toggleMentorActive"];
    for (const name of names) expect(source).toContain(`export async function ${name}(`);
    expect(ungatedActions(source, names)).toEqual([]);
    expect(ungatedActions(source.replace(/requireAdmin/g, "requireTeam"), names)).toEqual(names);
  });

  it("guards every editor page and the old catalog route", () => {
    const dir = path.join(root, "src/app/(main)/venture-store-editor");
    const pages = readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith("page.tsx"))
      .map((f) => path.join("src/app/(main)/venture-store-editor", f));
    pages.push("src/app/(main)/marketplace/catalog/page.tsx");
    expect(pages.length).toBe(6);
    for (const page of pages) {
      expect(read(page), page).toMatch(/await requireAdmin\(\);/);
    }
  });
});

describe("Venture Store editor nav", () => {
  const hrefs = (role: keyof typeof ROLE_NAV) =>
    ROLE_NAV[role].flatMap((s) => s.items.map((i) => i.href));

  it("is only in the ADMIN nav, inside the Venture Store section", () => {
    const section = ROLE_NAV.ADMIN.find((s) =>
      s.items.some((i) => i.href === VENTURE_STORE_EDITOR_HREF)
    );
    expect(section?.title).toBe("Venture Store & Credits");
    for (const role of ["MEMBER", "BUSINESS_PARTNER", "INVESTOR", "STARTUP"] as const) {
      expect(hrefs(role)).not.toContain(VENTURE_STORE_EDITOR_HREF);
    }
  });
});
