import { describe, expect, it } from "vitest";
import { getBooks, getBooksPage } from "./data";

describe("getBooks edge cases", () => {
  it("returns all books when q is undefined", async () => {
    const books = await getBooks();
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBeGreaterThan(0);
  });

  it("returns filtered books when q is present", async () => {
    const books = await getBooks("dune");
    expect(books.some((b) => b.title.toLowerCase().includes("dune"))).toBe(
      true,
    );
  });

  it("returns all books when q is whitespace", async () => {
    const books = await getBooks("   ");
    expect(books.length).toBeGreaterThan(0);
  });
});

describe("getBooksPage edge cases", () => {
  it("returns a page of books with no q", async () => {
    const page = await getBooksPage({ after: undefined, limit: 2 });
    expect(page.items.length).toBeLessThanOrEqual(2);
    expect(
      typeof page.nextCursor === "string" || page.nextCursor === undefined,
    ).toBe(true);
  });

  it("returns filtered page when q is present", async () => {
    const page = await getBooksPage({ q: "dune", after: undefined, limit: 2 });
    expect(page.items.some((b) => b.title.toLowerCase().includes("dune"))).toBe(
      true,
    );
  });

  it("returns all books when q is whitespace", async () => {
    const page = await getBooksPage({ q: "   ", after: undefined, limit: 2 });
    expect(page.items.length).toBeLessThanOrEqual(2);
  });
});
