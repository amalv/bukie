import { describe, expect, it } from "vitest";
import {
  categoryCatalogHref,
  HOME_SECTIONS,
  sectionContext,
} from "./homeSections";

describe("explainable homepage sections", () => {
  it("defines a distinct need, rule, freshness expectation, and fallback for every section", () => {
    const definitions = Object.values(HOME_SECTIONS);
    expect(definitions.map((section) => section.label)).toEqual([
      "Browse by Category",
      "New Arrivals",
      "All Books",
    ]);
    for (const section of definitions) {
      expect(section.userNeed).not.toHaveLength(0);
      expect(section.rule).not.toHaveLength(0);
      expect(section.freshness).not.toHaveLength(0);
      expect(section.emptyMessage).not.toHaveLength(0);
      expect(section.errorMessage).not.toHaveLength(0);
    }
    expect(new Set(definitions.map((section) => section.userNeed)).size).toBe(
      definitions.length,
    );
  });

  it("states the evidence-backed ordering rules without unsupported signals", () => {
    expect(sectionContext(HOME_SECTIONS["new-arrivals"])).toContain(
      "Preferred-edition catalog dates",
    );
    expect(sectionContext(HOME_SECTIONS["new-arrivals"])).toContain(
      "not publication recency or popularity",
    );
    expect(HOME_SECTIONS["all-books"].rule).toContain("title A–Z");
    expect(HOME_SECTIONS.categories.rule).toContain("categories");
    expect(JSON.stringify(HOME_SECTIONS)).not.toMatch(
      /top rated|trending|recommendation|relevance/i,
    );
  });

  it("uses canonical catalog URLs for continuation and category discovery", () => {
    expect(HOME_SECTIONS["new-arrivals"].continuation.href).toBe(
      "/?sort=added",
    );
    expect(categoryCatalogHref("science-fiction")).toBe(
      "/?category=science-fiction",
    );
  });
});
