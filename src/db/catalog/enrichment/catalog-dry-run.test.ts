import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import {
  buildCatalogDryRunManifest,
  catalogDryRunReportBytes,
} from "./catalog-dry-run";
import { executeCatalogDryRunSqlite } from "./catalog-dry-run-execution";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";

const inputs = () => {
  const records = legacyBooksToImportRecords(baseCatalog);
  return { records, graph: buildCatalogImportGraph(records) };
};

describe("catalog-wide enrichment dry run", () => {
  it("content-addresses the complete catalog scope and every algorithm policy", () => {
    const input = inputs();
    const first = buildCatalogDryRunManifest(input);
    const second = buildCatalogDryRunManifest({
      records: [...input.records].reverse(),
      graph: input.graph,
    });

    expect(first.input.catalogRecords).toBe(500);
    expect(first.works).toHaveLength(500);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.versions).toMatchObject({
      importer: "legacy-catalog-v1",
      matcher: "conservative-work-matcher-v1",
      resolver: "catalog-resolver-v1",
      description: "description-gates-2026-07-29.v1",
      cover: "cover-gates-2026-07-29.v1",
      coverInspection: "cover-inspection-2026-07-29.v1",
    });
    expect(
      first.versions.adapters.filter((adapter) => adapter.state === "enabled"),
    ).toHaveLength(2);
    expect(
      ENRICHMENT_SAMPLE_MANIFEST.works.every((diagnostic) =>
        first.works.some(
          (work) =>
            work.workId === diagnostic.workId &&
            work.title === diagnostic.title,
        ),
      ),
    ).toBe(true);
  });

  it("produces byte-stable reports, caps queues, and preserves public state", async () => {
    const input = inputs();
    const directory = mkdtempSync(
      path.join(tmpdir(), "bukie-catalog-dry-run-"),
    );
    const first = await executeCatalogDryRunSqlite({
      ...input,
      sqlitePath: path.join(directory, "catalog-first.sqlite"),
    });
    const second = await executeCatalogDryRunSqlite({
      ...input,
      sqlitePath: path.join(directory, "catalog-second.sqlite"),
    });

    expect(catalogDryRunReportBytes(first)).toBe(
      catalogDryRunReportBytes(second),
    );
    expect(first.counts).toEqual({
      scanned: 500,
      matched: 4,
      ambiguous: 1,
      unmatched: 495,
      observed: 13,
      proposed: 9,
      omitted: 499,
      conflicting: 1,
      withdrawn: 0,
      queued: 3,
      queueCap: 3,
      queueOverflow: 2,
    });
    expect(first.isolation).toMatchObject({
      unchanged: true,
      productionWrites: false,
      previewWrites: false,
      publicWrites: false,
    });
    expect(first.run).toMatchObject({
      promotionExecuted: false,
      providerNetworkCalls: 0,
    });
    expect(first.proposedResolutions).toHaveLength(9);
    expect(
      first.proposedResolutions.filter(
        (resolution) => resolution.fieldKey === "work.first_publication_date",
      ),
    ).toHaveLength(4);
    expect(first.rehearsals.every((rehearsal) => rehearsal.passed)).toBe(true);
    expect(
      first.cases
        .filter((entry) => entry.diagnosticCase)
        .map((entry) => entry.title)
        .sort(),
    ).toEqual(
      [
        "Dune",
        "Moby-Dick",
        "The City and the Stars",
        "Born a Crime",
        "Faithful Place",
      ].sort(),
    );
    expect(
      first.cases.filter((entry) => entry.description === "paused"),
    ).toHaveLength(2);
    expect(first.coverage.proposed).toMatchObject({
      firstPublicationBasisPoints: 80,
      descriptionCandidateBasisPoints: 100,
      descriptionEligibleBasisPoints: 0,
      verifiedCoverBasisPoints: 0,
    });
  }, 30_000);
});
