import { describe, expect, it } from "vitest";
import {
  editionFixture,
  partialWorkDetailFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";
import {
  buildBookStructuredData,
  editionDisplayLabel,
  hasEditionBibliographicFacts,
  serializeStructuredData,
} from "./detailPresentation";

describe("detail presentation", () => {
  it("recognizes informative editions and uses reader-facing labels", () => {
    expect(hasEditionBibliographicFacts(undefined)).toBe(false);
    expect(
      hasEditionBibliographicFacts({
        id: "empty",
        catalogedAt: 1,
        publishers: [],
        languages: [],
        identifiers: [],
      }),
    ).toBe(false);
    expect(hasEditionBibliographicFacts(editionFixture)).toBe(true);
    expect(
      editionDisplayLabel(
        { ...editionFixture, title: "Collector's edition" },
        "Edition 2",
      ),
    ).toBe("Collector's edition");
    expect(
      editionDisplayLabel(
        { ...editionFixture, format: "paperback" },
        "Edition 2",
      ),
    ).toBe("Paperback edition");
  });

  it("builds Book structured data only from supported stored facts", () => {
    const data = buildBookStructuredData(workDetailFixture);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Book",
      name: "Example Work",
      datePublished: "1965-06",
      description: "Stored catalog description.",
      author: ["First Author", "Second Author"],
      genre: ["Fiction", "Classics"],
      workExample: [
        {
          "@type": "Book",
          datePublished: "2020",
          numberOfPages: 320,
          publisher: ["Example Press"],
          inLanguage: ["en"],
          isbn: ["978-0-441-17271-9"],
        },
      ],
    });
    expect(JSON.stringify(data)).not.toMatch(
      /rating|popularity|catalogedAt|objectKey|provenance/i,
    );
    expect(data.datePublished).not.toBe(
      (
        (data.workExample as Array<Record<string, unknown>>)[0] as Record<
          string,
          unknown
        >
      ).datePublished,
    );
  });

  it("keeps partial structured data valid and escapes script-breaking text", () => {
    const partial = {
      ...partialWorkDetailFixture,
      title: "</script><script>alert(1)</script>",
    };
    const data = buildBookStructuredData(partial);
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "Book",
      name: "</script><script>alert(1)</script>",
    });
    const serialized = serializeStructuredData(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });

  it("omits an ineligible work date without suppressing the edition date", () => {
    const data = buildBookStructuredData({
      ...workDetailFixture,
      firstPublication: undefined,
    });
    expect(data).not.toHaveProperty("datePublished");
    expect(data).toMatchObject({
      workExample: [{ datePublished: "2020" }],
    });
  });
});
