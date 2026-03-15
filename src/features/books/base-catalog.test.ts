import { describe, expect, it } from "vitest";
import baseCatalog from "@/../artifacts/catalog";

describe("base catalog", () => {
  it("contains 500 books with 100 books per target category", () => {
    expect(baseCatalog).toHaveLength(500);

    const counts = baseCatalog.reduce<Record<string, number>>((acc, book) => {
      const genre = book.genre ?? "Unknown";
      acc[genre] = (acc[genre] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      "Science Fiction": 100,
      Fantasy: 100,
      "Mystery & Thriller": 100,
      "Non-Fiction": 100,
      Classics: 100,
    });
  });

  it("keeps book ids unique across the combined catalog", () => {
    const ids = baseCatalog.map((book) => book.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
