import { describe, expect, it } from "vitest";
import {
  buildOpenLibraryCandidates,
  extractOpenLibrarySearchCandidates,
  findOpenLibraryCandidates,
} from "@/../scripts/covers/helpers";

describe("covers helpers", () => {
  it("prefers ISBN-based candidates when isbn present", () => {
    const urls = buildOpenLibraryCandidates({
      title: "Dune",
      author: "Frank Herbert",
      isbn: "978-0441172719",
    });
    expect(urls[0]).toMatch(/isbn\/9780441172719-L\.jpg\?default=false$/);
  });

  it("returns no direct cover candidates when isbn is missing", () => {
    const urls = buildOpenLibraryCandidates({
      title: "Dune",
      author: "Frank Herbert",
      isbn: undefined,
    });
    expect(urls).toEqual([]);
  });

  it("extracts cover-id and OLID candidates from search results", () => {
    const urls = extractOpenLibrarySearchCandidates(
      {
        title: "Dune",
        author: "Frank Herbert",
        isbn: undefined,
      },
      {
        docs: [
          {
            title: "Dune",
            author_name: ["Frank Herbert"],
            cover_i: 12345,
            edition_key: ["OL123M"],
          },
        ],
      },
    );

    expect(urls).toContain(
      "https://covers.openlibrary.org/b/id/12345-L.jpg?default=false",
    );
    expect(urls).toContain(
      "https://covers.openlibrary.org/b/olid/OL123M-L.jpg?default=false",
    );
  });

  it("includes manual fallback candidates for known tricky titles", async () => {
    const urls = await findOpenLibraryCandidates(
      {
        title: "The ABC Murders",
        author: "Agatha Christie",
        isbn: undefined,
      },
      async () =>
        new Response(JSON.stringify({ docs: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    expect(urls).toContain(
      "https://covers.openlibrary.org/b/id/14573514-L.jpg?default=false",
    );
  });
});
