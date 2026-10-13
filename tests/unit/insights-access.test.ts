import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_NAV } from "@/lib/roles";

const hrefs = (role: keyof typeof ROLE_NAV) => ROLE_NAV[role].flatMap((s) => s.items.map((i) => i.href));

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return pageFiles(full);
    return e.name === "page.tsx" ? [full] : [];
  });
}

describe("KPI-Insights are ADMIN-only", () => {
  it("shows the Insights nav entry only to ADMIN", () => {
    expect(hrefs("ADMIN")).toContain("/insights");
    for (const role of ["MEMBER", "BUSINESS_PARTNER", "INVESTOR", "STARTUP"] as const) {
      expect(hrefs(role)).not.toContain("/insights");
    }
  });

  it("guards every /insights page with requireAdmin", () => {
    const pages = pageFiles(path.join(process.cwd(), "src/app/(main)/insights"));
    expect(pages.length).toBeGreaterThanOrEqual(11);
    for (const file of pages) {
      const src = readFileSync(file, "utf8");
      expect(src, file).toMatch(/await requireAdmin\(\)/);
      expect(src, file).not.toMatch(/requireScoutModule|requireTeam/);
    }
  });

  it("guards every insights and funding server action with requireAdmin or requireStartup", () => {
    for (const name of ["insights.ts", "funding.ts"]) {
      const src = readFileSync(path.join(process.cwd(), "src/app/actions", name), "utf8");
      expect(src, name).not.toMatch(/requireScoutModule|requireTeam/);
    }
  });
});

describe("Partner nav", () => {
  it("shows Entdecken and Feed under Ökosystem", () => {
    const section = ROLE_NAV.BUSINESS_PARTNER.find((s) => s.title === "Ökosystem");
    expect(section?.items.map((i) => i.href)).toEqual(["/discover", "/feed"]);
  });
});
