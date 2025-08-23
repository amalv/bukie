import { describe, expect, it } from "vitest";
import { buildOpenLibraryCandidates } from "@/../scripts/covers/helpers";

describe("covers helpers", () => {
  it("prefers ISBN-based candidates when isbn present", () => {
    const urls = buildOpenLibraryCandidates({
      title: "Dune",
      author: "Frank Herbert",
      isbn: "978-0441172719",
    });
    expect(urls[0]).toMatch(/isbn\/9780441172719-L\.jpg$/);
  });

  it("falls back to title-based placeholders when isbn missing", () => {
    const urls = buildOpenLibraryCandidates({
      title: "Dune",
      author: "Frank Herbert",
      isbn: undefined,
    });
    expect(urls.some((u) => u.includes("/b/title/"))).toBe(true);
  });
});
