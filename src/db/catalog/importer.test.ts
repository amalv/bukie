import { describe, expect, it } from "vitest";
import baseCatalog from "@/../artifacts/catalog";
import { ADR_REPRESENTATIVE_RECORDS } from "./fixtures";
import { canonicalJson, hashCanonicalJson } from "./identity";
import {
  buildCatalogImportGraph,
  catalogGraphCounts,
  legacyBooksToImportRecords,
} from "./importer";
import { validateCatalogImportGraph } from "./validate-graph";

describe("normalized catalog importer", () => {
  const records = legacyBooksToImportRecords(baseCatalog);
  const graph = buildCatalogImportGraph(records);

  it("imports the 500-book artifact conservatively and deterministically", () => {
    expect(records).toHaveLength(500);
    expect(catalogGraphCounts(graph)).toMatchObject({
      works: 500,
      editions: 500,
      sourceRecords: 1009,
      editionCovers: 500,
      coverAssets: 500,
    });
    expect(new Set(graph.works.map((row) => row.id)).size).toBe(500);
    expect(
      graph.works.every(
        (row) => !baseCatalog.some((book) => book.id === row.id),
      ),
    ).toBe(true);

    const rebuilt = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    expect(hashCanonicalJson(rebuilt)).toBe(hashCanonicalJson(graph));
  }, 15_000);

  it("retains legacy IDs only as source record keys and hashes source rows", () => {
    const legacySourceId = graph.metadataSources.find(
      (row) => row.key === "legacy_catalog",
    )?.id;
    const legacyRecords = graph.sourceRecords.filter(
      (row) => row.sourceId === legacySourceId,
    );
    expect(legacyRecords).toHaveLength(500);
    expect(new Set(legacyRecords.map((row) => row.recordKey))).toEqual(
      new Set(baseCatalog.map((book) => book.id)),
    );
    expect(
      legacyRecords.every(
        (row) =>
          typeof row.sourceRowHash === "string" &&
          row.sourceRowHash.length === 64 &&
          row.sourceRowHash === row.payloadHash,
      ),
    ).toBe(true);
  });

  it("projects only the four explicitly approved first-publication observations", () => {
    const projected = graph.works
      .filter((work) => work.firstPublicationDate !== null)
      .map((work) => [work.preferredTitle, work.firstPublicationDate])
      .sort();
    expect(
      graph.works.every(
        (work) =>
          work.firstPublicationDate === null ||
          (work.firstPublicationPrecision === "year" &&
            work.firstPublicationSortDate ===
              `${String(work.firstPublicationDate)}-01-01`),
      ),
    ).toBe(true);
    expect(
      graph.fieldObservations.filter(
        (observation) => observation.fieldKey === "work.first_publication_date",
      ),
    ).toHaveLength(4);
    expect(projected).toEqual(
      [
        ["Born a Crime", "2016"],
        ["Faithful Place", "2010"],
        ["Moby-Dick", "1851"],
        ["The City and the Stars", "1956"],
      ].sort(),
    );
    expect(
      graph.works.find((work) => work.preferredTitle === "Dune")
        ?.firstPublicationDate,
    ).toBeNull();
  });

  it("preserves cover object keys independently of target IDs", () => {
    expect(new Set(graph.coverAssets.map((row) => row.objectKey))).toEqual(
      new Set(baseCatalog.map((book) => book.cover)),
    );
    expect(
      graph.coverAssets.every(
        (row) => row.id !== row.objectKey && row.id !== baseCatalog[0]?.id,
      ),
    ).toBe(true);
  });

  it("labels all generated descriptions and rating/count fields synthetic", () => {
    const synthetic = graph.fieldObservations.filter(
      (row) => row.provenanceKind === "synthetic",
    );
    expect(
      synthetic.filter((row) => row.fieldKey === "work.description"),
    ).toHaveLength(400);
    expect(
      synthetic.filter((row) => row.fieldKey === "legacy.rating"),
    ).toHaveLength(400);
    expect(
      synthetic.filter((row) => row.fieldKey === "legacy.ratings_count"),
    ).toHaveLength(400);

    const resolutionById = new Map(
      graph.fieldResolutions.map((row) => [row.id, row]),
    );
    const descriptionHeads = graph.fieldResolutionHeads.filter(
      (row) => row.fieldKey === "work.description",
    );
    expect(
      descriptionHeads.filter(
        (head) => resolutionById.get(head.resolutionId)?.state === "missing",
      ),
    ).toHaveLength(400);
    expect(
      graph.fieldResolutionHeads.some((row) =>
        String(row.fieldKey).startsWith("legacy."),
      ),
    ).toBe(false);
  });

  it("backs selected projections with linked observations and consistent heads", () => {
    const links = new Set(
      graph.sourceRecordLinks
        .filter((row) => row.state === "active")
        .map(
          (row) => `${row.sourceRecordId}:${row.entityType}:${row.entityId}`,
        ),
    );
    for (const observation of graph.fieldObservations) {
      expect(
        links.has(
          `${observation.sourceRecordId}:${observation.entityType}:${observation.entityId}`,
        ),
      ).toBe(true);
    }

    const observations = new Map(
      graph.fieldObservations.map((row) => [row.id, row]),
    );
    const resolutions = new Map(
      graph.fieldResolutions.map((row) => [row.id, row]),
    );
    for (const head of graph.fieldResolutionHeads) {
      const resolution = resolutions.get(head.resolutionId);
      expect(resolution).toMatchObject({
        entityType: head.entityType,
        entityId: head.entityId,
        fieldKey: head.fieldKey,
      });
      if (resolution?.selectedObservationId) {
        expect(
          observations.get(resolution.selectedObservationId),
        ).toMatchObject({
          entityType: head.entityType,
          entityId: head.entityId,
          fieldKey: head.fieldKey,
        });
      }
    }
  });

  it("rejects cross-entity preferred editions and synthetic public selections", () => {
    const invalidPreferredEdition = {
      ...graph,
      works: graph.works.map((row, index) =>
        index === 0
          ? { ...row, preferredEditionId: graph.editions[1]?.id }
          : row,
      ),
    };
    expect(() => validateCatalogImportGraph(invalidPreferredEdition)).toThrow(
      "prefers an edition belonging to another work",
    );

    const synthetic = graph.fieldObservations.find(
      (row) =>
        row.provenanceKind === "synthetic" &&
        row.fieldKey === "work.description",
    );
    const descriptionResolutionIndex = graph.fieldResolutions.findIndex(
      (row) =>
        row.fieldKey === "work.description" &&
        row.entityId === synthetic?.entityId,
    );
    const invalidSyntheticSelection = {
      ...graph,
      fieldResolutions: graph.fieldResolutions.map((row, index) =>
        index === descriptionResolutionIndex
          ? { ...row, selectedObservationId: synthetic?.id, state: "present" }
          : row,
      ),
    };
    expect(() => validateCatalogImportGraph(invalidSyntheticSelection)).toThrow(
      "selects synthetic bibliography",
    );
  });

  it("exercises the ADR's 14 inputs as 13 works using structured evidence only", () => {
    const fixtures = buildCatalogImportGraph(ADR_REPRESENTATIVE_RECORDS);
    expect(fixtures.editions).toHaveLength(14);
    expect(fixtures.works).toHaveLength(13);

    const grouped = fixtures.editions.filter(
      (row) =>
        ADR_REPRESENTATIVE_RECORDS.find(
          (record) =>
            record.recordKey === "adr-case-04-hardcover" ||
            record.recordKey === "adr-case-04-paperback",
        ) &&
        fixtures.editions.filter((candidate) => candidate.workId === row.workId)
          .length === 2,
    );
    expect(grouped).toHaveLength(2);

    const twinRecords = ADR_REPRESENTATIVE_RECORDS.filter((record) =>
      record.recordKey.startsWith("adr-case-08-"),
    );
    const twinEditionIds = twinRecords.map((record) =>
      fixtures.sourceRecords.find(
        (sourceRecord) => sourceRecord.recordKey === record.recordKey,
      ),
    );
    expect(twinEditionIds.every(Boolean)).toBe(true);
    const twinWorks = fixtures.works.filter(
      (work) => work.preferredTitle === "Twin Signal",
    );
    expect(twinWorks).toHaveLength(2);

    expect(fixtures.workAuthors).toHaveLength(13);
    expect(
      fixtures.workCategories.filter((row) => {
        const work = fixtures.works.find(
          (candidate) => candidate.id === row.workId,
        );
        return work?.preferredTitle === "The Cartographer's Lantern";
      }),
    ).toHaveLength(3);
    expect(
      fixtures.coverAssets.filter(
        (row) => row.objectKey === "/covers/adr-shared.webp",
      ),
    ).toHaveLength(1);
    expect(
      fixtures.editionCovers.filter((row) => {
        const cover = fixtures.coverAssets.find(
          (candidate) => candidate.id === row.coverAssetId,
        );
        return cover?.objectKey === "/covers/adr-shared.webp";
      }),
    ).toHaveLength(2);
    expect(canonicalJson(fixtures)).not.toContain("undefined");
  });
});
