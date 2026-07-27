import { describe, expect, it } from "vitest";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { presentAuthors, presentBibliographicMeta } from "./presentation";

describe("normalized book presentation", () => {
  it("preserves ordered authors", () => {
    expect(presentAuthors(workSummaryFixture)).toEqual({
      full: "First Author, Second Author",
      visible: "First Author · Second Author",
      truncated: false,
    });
  });

  it("uses selected category and publication date", () => {
    expect(presentBibliographicMeta(workSummaryFixture)).toBe("Fiction · 2020");
  });
});
