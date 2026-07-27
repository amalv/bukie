import { describe, expect, it } from "vitest";
import {
  editionFixture,
  partialWorkDetailFixture,
  provenanceFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";
import {
  buildBookStructuredData,
  detailEvidenceKindLabel,
  detailFieldLabel,
  detailProvenanceStatusLabel,
  detailStateLabel,
  groupDetailProvenance,
  hasEditionBibliographicFacts,
  serializeStructuredData,
} from "./detailPresentation";

describe("detail presentation", () => {
  it("uses plain-language labels for every resolution and evidence state", () => {
    expect(detailStateLabel("present")).toBe("Available");
    expect(detailStateLabel("missing")).toBe("Not available");
    expect(detailStateLabel("conflicting")).toBe("Conflicting evidence");
    expect(detailStateLabel("stale")).toBe("Stale");
    expect(detailStateLabel("withdrawn")).toBe("Withdrawn");
    expect(detailEvidenceKindLabel("curated")).toBe("Curated");
    expect(detailEvidenceKindLabel("imported")).toBe("Imported");
    expect(detailEvidenceKindLabel("derived")).toBe("Derived");
    expect(detailFieldLabel("work.authors")).toBe("Creators");
    expect(detailFieldLabel("edition.publication_date")).toBe(
      "Publication date",
    );
    const unavailable = provenanceFixture(
      "work",
      "work-id",
      "work.description",
    );
    if (!unavailable.evidence) throw new Error("Expected fixture evidence");
    expect(
      detailProvenanceStatusLabel({
        ...unavailable,
        evidence: {
          ...unavailable.evidence,
          eligible: false,
        },
      }),
    ).toBe("Not available");
  });

  it("groups work, preferred-edition, and alternate-edition evidence separately", () => {
    const alternate = {
      ...editionFixture,
      id: "20000000-0000-4000-8000-000000000002",
      format: "paperback" as const,
    };
    const work = {
      ...workDetailFixture,
      editions: [editionFixture, alternate],
      provenance: [
        ...workDetailFixture.provenance,
        provenanceFixture("edition", alternate.id, "edition.publication_date"),
      ],
    };
    expect(
      groupDetailProvenance(work).map(({ label, scope }) => ({ label, scope })),
    ).toEqual([
      { label: "Work record", scope: "work" },
      { label: "Preferred edition", scope: "preferred-edition" },
      { label: "Paperback edition", scope: "alternate-edition" },
    ]);
  });

  it("collapses edition groups that have no bibliographic facts", () => {
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
  });

  it("builds Book structured data only from supported stored facts", () => {
    const data = buildBookStructuredData(workDetailFixture);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Book",
      name: "Example Work",
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
      /rating|popularity|catalogedAt|objectKey/i,
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
});
