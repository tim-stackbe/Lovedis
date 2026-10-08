import { describe, expect, it } from "vitest";

import {
  formatWorkshopWhen,
  parseDescription,
  parseWorkshops,
  programWorkshops,
} from "@/lib/program-workshops";

describe("program workshops", () => {
  it("formats date with weekday and optional start time", () => {
    expect(
      formatWorkshopWhen({ title: "A", date: "2026-11-12", startTime: "11:00" })
    ).toBe("Do., 12.11.2026 · 11:00 Uhr");
    expect(formatWorkshopWhen({ title: "B", date: "2026-12-01" })).toBe(
      "Di., 01.12.2026"
    );
    expect(formatWorkshopWhen({ title: "C" })).toBeNull();
  });

  it("drops invalid entries and falls back to session titles", () => {
    expect(parseWorkshops([{ title: "" }, { title: "Ok" }, 3])).toEqual([
      { title: "Ok" },
    ]);
    expect(parseWorkshops(null)).toEqual([]);
    expect(programWorkshops({ workshops: [], sessions: ["X", "Y"] })).toEqual([
      { title: "X" },
      { title: "Y" },
    ]);
  });

  it("splits descriptions into headings and bold runs", () => {
    expect(parseDescription("### Teil 1\n\n**Output:** fertig")).toEqual([
      { kind: "heading", text: "Teil 1" },
      {
        kind: "paragraph",
        segments: [
          { text: "Output:", bold: true },
          { text: " fertig", bold: false },
        ],
      },
    ]);
  });
});
